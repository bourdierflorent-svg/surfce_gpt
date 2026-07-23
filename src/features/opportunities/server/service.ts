import { revalidatePath } from "next/cache";

import { AuthorizationError } from "@/lib/errors/authorization-error";
import { can } from "@/lib/permissions/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppAuthContext } from "@/types/auth";
import type { Json } from "@/types/database";

import type {
  CreateAppointmentInput,
  CreateOpportunityInput,
  CreateProposalInput,
  CreateTaskInput,
  UpdateOpportunityInput,
} from "../schemas";

function requireWrite(context: AppAuthContext) {
  if (context.isPreview || !can(context.membership.role, "opportunities:write")) {
    throw new AuthorizationError("Votre rôle ne permet pas de modifier le pipeline.");
  }
}

function clean(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

async function loadOpportunityScope(context: AppAuthContext, opportunityId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("opportunities")
    .select("id, company_id, primary_contact_id, owner_id, venue_id, offer_id")
    .eq("organization_id", context.organization.id)
    .eq("id", opportunityId)
    .maybeSingle();
  if (error || !data) throw new Error("Opportunité introuvable.");
  return { supabase, opportunity: data };
}

export async function createOpportunity(context: AppAuthContext, input: CreateOpportunityInput) {
  requireWrite(context);
  const supabase = await createSupabaseServerClient();
  const [{ data: stage, error: stageError }, { data: company, error: companyError }] =
    await Promise.all([
      supabase
        .from("opportunity_stages")
        .select("id, default_probability")
        .eq("organization_id", context.organization.id)
        .eq("id", input.stageId)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("companies")
        .select("id, assigned_to")
        .eq("organization_id", context.organization.id)
        .eq("id", input.companyId)
        .maybeSingle(),
    ]);
  if (stageError || !stage) throw new Error("L’étape sélectionnée est indisponible.");
  if (companyError || !company) throw new Error("L’entreprise sélectionnée est indisponible.");

  const ownerId = input.ownerId ?? company.assigned_to ?? context.user.id;
  const { data, error } = await supabase
    .from("opportunities")
    .insert({
      organization_id: context.organization.id,
      company_id: input.companyId,
      primary_contact_id: input.primaryContactId ?? null,
      venue_id: input.venueId ?? null,
      offer_id: input.offerId ?? null,
      campaign_id: input.campaignId ?? null,
      owner_id: ownerId,
      stage_id: stage.id,
      title: input.title,
      probability: stage.default_probability,
      estimated_amount: input.estimatedAmount ?? null,
      proposed_amount: input.proposedAmount ?? null,
      signed_amount: input.signedAmount ?? null,
      currency: input.currency,
      estimated_guests: input.estimatedGuests ?? null,
      event_type: clean(input.eventType),
      desired_event_date: input.desiredEventDate ?? null,
      expected_close_date: input.expectedCloseDate ?? null,
      source: input.source,
      objections: input.objections,
      next_action: clean(input.nextAction),
      next_action_at: input.nextActionAt ?? null,
      loss_reason: clean(input.lossReason),
      notes: clean(input.notes),
    })
    .select("id")
    .single();
  if (error) throw new Error("L’opportunité n’a pas pu être créée.");
  revalidatePath("/opportunities");
  return data;
}

export async function updateOpportunity(
  context: AppAuthContext,
  opportunityId: string,
  input: UpdateOpportunityInput,
) {
  requireWrite(context);
  const { supabase } = await loadOpportunityScope(context, opportunityId);
  const payload: Record<string, unknown> = {};
  if ("primaryContactId" in input) payload.primary_contact_id = input.primaryContactId ?? null;
  if ("venueId" in input) payload.venue_id = input.venueId ?? null;
  if ("offerId" in input) payload.offer_id = input.offerId ?? null;
  if ("campaignId" in input) payload.campaign_id = input.campaignId ?? null;
  if ("ownerId" in input) payload.owner_id = input.ownerId;
  if ("title" in input) payload.title = input.title;
  if ("estimatedAmount" in input) payload.estimated_amount = input.estimatedAmount ?? null;
  if ("proposedAmount" in input) payload.proposed_amount = input.proposedAmount ?? null;
  if ("signedAmount" in input) payload.signed_amount = input.signedAmount ?? null;
  if ("currency" in input) payload.currency = input.currency;
  if ("estimatedGuests" in input) payload.estimated_guests = input.estimatedGuests ?? null;
  if ("eventType" in input) payload.event_type = clean(input.eventType);
  if ("desiredEventDate" in input) payload.desired_event_date = input.desiredEventDate ?? null;
  if ("expectedCloseDate" in input) payload.expected_close_date = input.expectedCloseDate ?? null;
  if ("objections" in input) payload.objections = input.objections;
  if ("nextAction" in input) payload.next_action = clean(input.nextAction);
  if ("nextActionAt" in input) payload.next_action_at = input.nextActionAt ?? null;
  if ("lossReason" in input) payload.loss_reason = clean(input.lossReason);
  if ("notes" in input) payload.notes = clean(input.notes);

  const { error } = await supabase
    .from("opportunities")
    .update(payload)
    .eq("organization_id", context.organization.id)
    .eq("id", opportunityId);
  if (error) throw new Error("Le dossier commercial n’a pas pu être enregistré.");
  revalidatePath(`/opportunities/${opportunityId}`);
  revalidatePath("/opportunities");
  return { updated: true };
}

export async function moveOpportunityStage(
  context: AppAuthContext,
  opportunityId: string,
  stageId: string,
  lossReason?: string | null,
) {
  requireWrite(context);
  const { supabase } = await loadOpportunityScope(context, opportunityId);
  const { data: stage, error: stageError } = await supabase
    .from("opportunity_stages")
    .select("id, category")
    .eq("organization_id", context.organization.id)
    .eq("id", stageId)
    .eq("is_active", true)
    .maybeSingle();
  if (stageError || !stage) throw new Error("L’étape de destination est indisponible.");
  if (stage.category === "lost" && !clean(lossReason)) {
    throw new Error("Un motif de perte est requis.");
  }
  const { error } = await supabase
    .from("opportunities")
    .update({
      stage_id: stageId,
      loss_reason: stage.category === "lost" ? clean(lossReason) : null,
    })
    .eq("organization_id", context.organization.id)
    .eq("id", opportunityId);
  if (error) throw new Error("Le passage d’étape n’a pas abouti.");
  revalidatePath(`/opportunities/${opportunityId}`);
  revalidatePath("/opportunities");
  return { moved: true };
}

export async function createOpportunityTask(
  context: AppAuthContext,
  opportunityId: string,
  input: CreateTaskInput,
) {
  requireWrite(context);
  const { supabase, opportunity } = await loadOpportunityScope(context, opportunityId);
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      organization_id: context.organization.id,
      company_id: opportunity.company_id,
      contact_id: opportunity.primary_contact_id,
      opportunity_id: opportunity.id,
      assigned_to: input.assignedTo ?? opportunity.owner_id,
      created_by: context.user.id,
      title: input.title,
      description: clean(input.description),
      priority: input.priority,
      due_at: input.dueAt ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error("La tâche n’a pas pu être créée.");
  revalidatePath(`/opportunities/${opportunityId}`);
  return data;
}

export async function setTaskStatus(
  context: AppAuthContext,
  taskId: string,
  status: "todo" | "in_progress" | "completed" | "cancelled",
) {
  if (context.isPreview || !can(context.membership.role, "tasks:write")) {
    throw new AuthorizationError("Votre rôle ne permet pas de modifier cette tâche.");
  }
  const supabase = await createSupabaseServerClient();
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id, opportunity_id")
    .eq("organization_id", context.organization.id)
    .eq("id", taskId)
    .maybeSingle();
  if (taskError || !task) throw new Error("Tâche introuvable.");
  const { error } = await supabase
    .from("tasks")
    .update({
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    })
    .eq("organization_id", context.organization.id)
    .eq("id", taskId);
  if (error) throw new Error("Le statut de la tâche n’a pas pu être modifié.");
  if (task.opportunity_id) revalidatePath(`/opportunities/${task.opportunity_id}`);
  return { updated: true };
}

export async function createOpportunityAppointment(
  context: AppAuthContext,
  opportunityId: string,
  input: CreateAppointmentInput,
) {
  requireWrite(context);
  const { supabase, opportunity } = await loadOpportunityScope(context, opportunityId);
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      organization_id: context.organization.id,
      company_id: opportunity.company_id,
      contact_id: opportunity.primary_contact_id,
      opportunity_id: opportunity.id,
      owner_id: opportunity.owner_id,
      title: input.title,
      description: clean(input.description),
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      location: clean(input.location),
    })
    .select("id")
    .single();
  if (error) throw new Error("Le rendez-vous n’a pas pu être planifié.");
  revalidatePath(`/opportunities/${opportunityId}`);
  revalidatePath("/opportunities");
  return data;
}

export async function createOpportunityProposal(
  context: AppAuthContext,
  opportunityId: string,
  input: CreateProposalInput,
) {
  requireWrite(context);
  const { supabase, opportunity } = await loadOpportunityScope(context, opportunityId);
  const { data: latest, error: latestError } = await supabase
    .from("proposals")
    .select("version")
    .eq("organization_id", context.organization.id)
    .eq("opportunity_id", opportunityId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) throw new Error("La version de proposition n’a pas pu être calculée.");
  const content: Json = {
    summary: input.summary,
    inclusions: input.inclusions,
    terms: input.terms ?? null,
  };
  const { data, error } = await supabase
    .from("proposals")
    .insert({
      organization_id: context.organization.id,
      opportunity_id: opportunity.id,
      venue_id: input.venueId ?? opportunity.venue_id,
      offer_id: input.offerId ?? opportunity.offer_id,
      version: (latest?.version ?? 0) + 1,
      amount: input.amount,
      currency: input.currency,
      guest_count: input.guestCount ?? null,
      event_date: input.eventDate ?? null,
      content,
      created_by: context.user.id,
    })
    .select("id, version")
    .single();
  if (error) throw new Error("La proposition n’a pas pu être créée.");
  revalidatePath(`/opportunities/${opportunityId}`);
  return data;
}

export async function setProposalStatus(
  context: AppAuthContext,
  proposalId: string,
  status: "draft" | "sent" | "accepted" | "rejected" | "expired",
) {
  requireWrite(context);
  const supabase = await createSupabaseServerClient();
  const { data: proposal, error: proposalError } = await supabase
    .from("proposals")
    .select("id, opportunity_id")
    .eq("organization_id", context.organization.id)
    .eq("id", proposalId)
    .maybeSingle();
  if (proposalError || !proposal) throw new Error("Proposition introuvable.");
  const { error } = await supabase
    .from("proposals")
    .update({
      status,
      sent_at: status === "sent" ? new Date().toISOString() : undefined,
      accepted_at: status === "accepted" ? new Date().toISOString() : undefined,
      rejected_at: status === "rejected" ? new Date().toISOString() : undefined,
    })
    .eq("organization_id", context.organization.id)
    .eq("id", proposalId);
  if (error) throw new Error("Le statut de la proposition n’a pas pu être modifié.");
  revalidatePath(`/opportunities/${proposal.opportunity_id}`);
  revalidatePath("/opportunities");
  return { updated: true };
}

export async function updateOpportunityStageConfiguration(
  context: AppAuthContext,
  stageId: string,
  input: { label: string; defaultProbability: number; isActive: boolean },
) {
  if (context.isPreview || !["admin", "sales_manager"].includes(context.membership.role)) {
    throw new AuthorizationError("Seuls les responsables peuvent configurer le pipeline.");
  }
  const supabase = await createSupabaseServerClient();
  const { data: stage, error: stageError } = await supabase
    .from("opportunity_stages")
    .select("id, category")
    .eq("organization_id", context.organization.id)
    .eq("id", stageId)
    .maybeSingle();
  if (stageError || !stage) throw new Error("Étape introuvable.");
  if (stage.category !== "open" && !input.isActive) {
    throw new Error("Les étapes terminales doivent rester actives.");
  }
  const { error } = await supabase
    .from("opportunity_stages")
    .update({
      label: input.label,
      default_probability: input.defaultProbability,
      is_active: input.isActive,
    })
    .eq("organization_id", context.organization.id)
    .eq("id", stageId);
  if (error) throw new Error("La configuration du pipeline n’a pas pu être enregistrée.");
  revalidatePath("/opportunities");
  revalidatePath("/opportunities/stages");
  return { updated: true };
}

export async function createOpportunityFromThread(
  context: AppAuthContext,
  threadId: string,
  input: {
    title: string;
    eventType?: string | null;
    estimatedGuests?: number | null;
    desiredEventDate?: string | null;
    nextAction: string;
    nextActionAt?: string | null;
  },
) {
  requireWrite(context);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_opportunity_from_thread", {
    p_thread_id: threadId,
    p_title: input.title,
    p_event_type: input.eventType ?? null,
    p_estimated_guests: input.estimatedGuests ?? null,
    p_desired_event_date: input.desiredEventDate ?? null,
    p_next_action: input.nextAction,
    p_next_action_at: input.nextActionAt ?? null,
  });
  if (error) throw new Error("La réponse n’a pas pu être transformée en opportunité.");
  revalidatePath(`/inbox/${threadId}`);
  revalidatePath("/opportunities");
  return data;
}
