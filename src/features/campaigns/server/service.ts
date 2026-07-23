import {
  completeProviderJob,
  failProviderJob,
  startProviderJob,
} from "@/features/enrichment/server/jobs";
import {
  emailGenerationOutputSchema,
  type EmailGenerationOutput,
} from "@/features/messages/schemas";
import { assertOrganizationPermission } from "@/features/organizations/server/authorization";
import { hashJson } from "@/lib/ai/hash";
import { CAMPAIGN_EMAIL_PROMPT_VERSION } from "@/lib/ai/prompts/campaign-email.v1";
import { AuthorizationError } from "@/lib/errors/authorization-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAiProvider } from "@/providers/ai";
import type { AppAuthContext } from "@/types/auth";
import type {
  CampaignRow,
  ContactRow,
  DataSourceRow,
  Json,
  MailboxRow,
  MessageRow,
} from "@/types/database";

import { sendWindowSchema, type CreateCampaignInput } from "../schemas";
import { scheduleCampaignStep } from "../scheduling";

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function getWritableCampaign(
  context: AppAuthContext,
  campaignId: string,
): Promise<{ campaign: CampaignRow; supabase: SupabaseClient }> {
  assertOrganizationPermission(context.membership.role, "campaigns:write");
  if (context.isPreview) throw new Error("Les campagnes sont désactivées en mode aperçu.");
  const supabase = await createSupabaseServerClient();
  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("organization_id", context.organization.id)
    .eq("id", campaignId)
    .maybeSingle();
  if (error || !campaign) throw new Error("Cette campagne n’existe pas dans votre organisation.");
  if (context.membership.role === "sales" && campaign.created_by !== context.user.id) {
    throw new AuthorizationError();
  }
  return { campaign, supabase };
}

export async function createCampaign(
  context: AppAuthContext,
  input: CreateCampaignInput,
): Promise<{ campaignId: string; stepCount: number }> {
  assertOrganizationPermission(context.membership.role, "campaigns:write");
  if (context.isPreview) throw new Error("La création est désactivée en mode aperçu.");
  const supabase = await createSupabaseServerClient();
  const { data: mailbox, error: mailboxError } = await supabase
    .from("mailboxes")
    .select("id, user_id, status")
    .eq("organization_id", context.organization.id)
    .eq("id", input.mailboxId)
    .maybeSingle();
  if (mailboxError || !mailbox || mailbox.status !== "connected") {
    throw new Error("Sélectionnez une boîte connectée.");
  }
  if (context.membership.role === "sales" && mailbox.user_id !== context.user.id) {
    throw new AuthorizationError();
  }

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .insert({
      organization_id: context.organization.id,
      name: input.name,
      description: input.description ?? null,
      status: "draft",
      venue_id: input.venueId ?? null,
      offer_id: input.offerId ?? null,
      mailbox_id: input.mailboxId,
      segment_definition: { mode: "manual_contacts" },
      language: input.language,
      tone: input.tone,
      daily_limit: input.dailyLimit,
      send_window: input.sendWindow,
      stop_rules: {
        human_reply: input.stopRules.humanReply,
        unsubscribe: input.stopRules.unsubscribe,
        bounce: input.stopRules.bounce,
        do_not_contact: input.stopRules.doNotContact,
      },
      requires_first_message_approval: true,
      created_by: context.user.id,
    })
    .select("id")
    .single();
  if (error) throw new Error("La campagne n’a pas pu être créée.");

  const { error: stepsError } = await supabase.from("sequence_steps").insert(
    input.steps.map((step) => ({
      organization_id: context.organization.id,
      campaign_id: campaign.id,
      position: step.position,
      delay_days: step.delayDays,
      delay_hours: step.delayHours,
      step_type: "email" as const,
      subject_template: step.subjectTemplate ?? null,
      body_template_text: step.bodyTemplateText ?? null,
      ai_instructions: step.aiInstructions ?? null,
      requires_approval: step.position === 0 ? true : step.requiresApproval,
      is_active: true,
    })),
  );
  if (stepsError) {
    await supabase.from("campaigns").delete().eq("id", campaign.id);
    throw new Error("La séquence n’a pas pu être enregistrée.");
  }
  return { campaignId: campaign.id, stepCount: input.steps.length };
}

export async function enrollContact(
  context: AppAuthContext,
  campaignId: string,
  contactId: string,
) {
  await getWritableCampaign(context, campaignId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("enroll_contact_in_campaign", {
    p_campaign_id: campaignId,
    p_contact_id: contactId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function unenrollContact(
  context: AppAuthContext,
  campaignId: string,
  enrollmentId: string,
  reason: string,
) {
  const { supabase } = await getWritableCampaign(context, campaignId);
  const { data, error } = await supabase
    .from("campaign_enrollments")
    .update({
      status: "stopped",
      stopped_at: new Date().toISOString(),
      stop_reason: reason,
      next_send_at: null,
    })
    .eq("organization_id", context.organization.id)
    .eq("campaign_id", campaignId)
    .eq("id", enrollmentId)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("Cette inscription n’a pas pu être arrêtée.");
  await supabase
    .from("messages")
    .update({
      status: "cancelled",
      error_code: "unenrolled",
      error_message: reason,
    })
    .eq("organization_id", context.organization.id)
    .eq("enrollment_id", enrollmentId)
    .in("status", ["draft", "pending_approval", "approved", "scheduled"]);
  return { enrollmentId, stopped: true };
}

function firstVerifiedSource(
  sources: DataSourceRow[],
  entityType: "company" | "contact",
  entityId: string,
) {
  return sources.find(
    (source) =>
      source.entity_type === entityType &&
      source.entity_id === entityId &&
      !source.is_inferred &&
      Number(source.confidence) >= 0.7,
  );
}

export async function generateCampaignMessages(
  context: AppAuthContext,
  campaignId: string,
  requestedKey?: string,
): Promise<{
  jobId: string;
  generatedCount: number;
  enrollmentCount: number;
  estimatedCost: number;
  mock: true;
  preview: EmailGenerationOutput;
}> {
  const { campaign, supabase } = await getWritableCampaign(context, campaignId);
  if (!["draft", "pending_approval"].includes(campaign.status)) {
    throw new Error("Remettez la campagne en brouillon avant de régénérer ses messages.");
  }
  const [enrollmentsResult, stepsResult, mailboxResult] = await Promise.all([
    supabase
      .from("campaign_enrollments")
      .select("*")
      .eq("organization_id", context.organization.id)
      .eq("campaign_id", campaign.id)
      .in("status", ["draft", "pending_approval"]),
    supabase
      .from("sequence_steps")
      .select("*")
      .eq("organization_id", context.organization.id)
      .eq("campaign_id", campaign.id)
      .eq("is_active", true)
      .order("position"),
    supabase
      .from("mailboxes")
      .select("*")
      .eq("organization_id", context.organization.id)
      .eq("id", campaign.mailbox_id)
      .single(),
  ]);
  if (enrollmentsResult.error || stepsResult.error || mailboxResult.error) {
    throw new Error("Le contexte de génération est incomplet.");
  }
  const enrollments = enrollmentsResult.data ?? [];
  const steps = stepsResult.data ?? [];
  if (!enrollments.length) throw new Error("Ajoutez au moins un contact valide à la campagne.");
  if (!steps.length) throw new Error("La campagne ne contient aucune étape active.");

  const snapshot = {
    campaignId,
    updatedAt: campaign.updated_at,
    enrollmentIds: enrollments.map((row) => row.id),
    steps: steps.map((row) => [row.id, row.delay_days, row.delay_hours]),
  };
  const provider = getAiProvider();
  const key = requestedKey
    ? `campaign-email:${campaign.id}:${requestedKey}`
    : `campaign-email:${campaign.id}:${hashJson(snapshot)}`;
  const started = await startProviderJob(supabase, context, {
    idempotencyKey: key,
    jobType: "campaign_email_generation",
    provider: provider.name,
    entityType: "campaign",
    entityId: campaign.id,
    input: snapshot as unknown as Json,
    estimatedCost: 0,
  });
  if (started.reused && started.job.output) {
    const saved = started.job.output as unknown as {
      generatedCount: number;
      enrollmentCount: number;
      estimatedCost: number;
      mock: true;
      preview: EmailGenerationOutput;
    };
    return { ...saved, jobId: started.job.id };
  }

  try {
    const contactIds = Array.from(new Set(enrollments.map((row) => row.contact_id)));
    const companyIds = Array.from(new Set(enrollments.map((row) => row.company_id)));
    const [contactsResult, companiesResult, sourcesResult, venueResult, offerResult] =
      await Promise.all([
        supabase.from("contacts").select("*").in("id", contactIds),
        supabase.from("companies").select("*").in("id", companyIds),
        supabase
          .from("data_sources")
          .select("*")
          .eq("organization_id", context.organization.id)
          .in("entity_type", ["company", "contact"])
          .in("entity_id", [...contactIds, ...companyIds])
          .order("confidence", { ascending: false }),
        campaign.venue_id
          ? supabase.from("venues").select("name").eq("id", campaign.venue_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        campaign.offer_id
          ? supabase.from("venue_offers").select("name").eq("id", campaign.offer_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);
    if (
      contactsResult.error ||
      companiesResult.error ||
      sourcesResult.error ||
      venueResult.error ||
      offerResult.error
    ) {
      throw new Error("Les faits de personnalisation n’ont pas pu être chargés.");
    }
    const contacts = new Map((contactsResult.data ?? []).map((row) => [row.id, row]));
    const companies = new Map((companiesResult.data ?? []).map((row) => [row.id, row]));
    const sources = sourcesResult.data ?? [];
    let firstOutput: EmailGenerationOutput | null = null;
    let generatedCount = 0;

    for (const enrollment of enrollments) {
      const contact = contacts.get(enrollment.contact_id);
      const company = companies.get(enrollment.company_id);
      if (!contact || !company || contact.email_status !== "valid" || !contact.email) {
        throw new Error("Tous les destinataires doivent disposer d’une adresse valide.");
      }
      const contactSource = firstVerifiedSource(sources, "contact", contact.id);
      const companySource = firstVerifiedSource(sources, "company", company.id);
      const facts = [
        ...(contactSource && contact.job_title
          ? [
              {
                fact: `${contact.full_name} exerce la fonction « ${contact.job_title} ».`,
                sourceReference: contactSource.id,
              },
            ]
          : []),
        ...(companySource
          ? [
              {
                fact: `${company.trade_name ?? company.legal_name} est située à ${company.city}.`,
                sourceReference: companySource.id,
              },
            ]
          : []),
      ];

      for (const step of steps) {
        const input = {
          contactFirstName: contactSource ? contact.first_name : "",
          contactJobTitle: contactSource ? contact.job_title : null,
          companyName: company.trade_name ?? company.legal_name,
          companySector: company.sector,
          venueName: venueResult.data?.name ?? null,
          offerName: offerResult.data?.name ?? null,
          senderName: mailboxResult.data.display_name,
          tone: campaign.tone,
          objective:
            campaign.description ?? "Proposer un échange autour d’un événement professionnel.",
          language: campaign.language,
          stepPosition: step.position,
          verifiedFacts: facts,
        };
        const output = emailGenerationOutputSchema.parse(
          await provider.generateEmailVariants(input),
        );
        firstOutput ??= output;
        const recommended = output.variants[output.recommended_variant]!;
        const inputHash = hashJson({
          ...input,
          verifiedFacts: facts.map((fact) => fact.sourceReference),
        });
        const { data: aiRun, error: aiError } = await supabase
          .from("ai_runs")
          .insert({
            organization_id: context.organization.id,
            run_type: "campaign_email_generation",
            entity_type: "campaign",
            entity_id: campaign.id,
            provider: provider.name,
            model: provider.model,
            prompt_version: CAMPAIGN_EMAIL_PROMPT_VERSION,
            input_hash: inputHash,
            input_snapshot: {
              campaignId: campaign.id,
              enrollmentId: enrollment.id,
              stepId: step.id,
              sourceReferences: facts.map((fact) => fact.sourceReference),
            },
            output: output as unknown as Json,
            status: "completed",
            token_usage: { mode: "mock", input_tokens: 0, output_tokens: 0 },
            created_by: context.user.id,
            completed_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (aiError) throw new Error("La génération est prête mais son audit a échoué.");

        const messageStatus = step.position === 0 ? "pending_approval" : "draft";
        const { error: messageError } = await supabase.from("messages").upsert(
          {
            organization_id: context.organization.id,
            campaign_id: campaign.id,
            enrollment_id: enrollment.id,
            sequence_step_id: step.id,
            deduplication_key: `${campaign.id}:${enrollment.id}:${step.id}`,
            direction: "outbound",
            sender: {
              email: mailboxResult.data.email_address,
              name: mailboxResult.data.display_name,
            },
            recipients: [{ email: contact.email, name: contact.full_name }],
            subject: step.subject_template ?? recommended.subject,
            body_text: step.body_template_text ?? recommended.body_text,
            body_html: recommended.body_html,
            variant_label: recommended.label,
            personalization_facts: recommended.personalization_facts as unknown as Json,
            risk_flags: recommended.risk_flags as unknown as Json,
            status: messageStatus,
            approved_by: null,
            approved_at: null,
            scheduled_at: null,
            headers: {
              ai_run_id: aiRun.id,
              prompt_version: CAMPAIGN_EMAIL_PROMPT_VERSION,
              mock: true,
            },
          },
          { onConflict: "organization_id,deduplication_key" },
        );
        if (messageError) throw new Error("Un brouillon généré n’a pas pu être enregistré.");
        generatedCount += 1;
      }
    }
    if (!firstOutput) throw new Error("Aucun aperçu n’a été généré.");

    await Promise.all([
      supabase
        .from("campaign_enrollments")
        .update({ status: "pending_approval" })
        .eq("organization_id", context.organization.id)
        .eq("campaign_id", campaign.id)
        .eq("status", "draft"),
      supabase
        .from("campaigns")
        .update({ status: "pending_approval", approved_by: null, approved_at: null })
        .eq("organization_id", context.organization.id)
        .eq("id", campaign.id),
    ]);
    const output = {
      generatedCount,
      enrollmentCount: enrollments.length,
      estimatedCost: 0,
      mock: true as const,
      preview: firstOutput,
    };
    await completeProviderJob(supabase, started.job.id, output as unknown as Json);
    return { ...output, jobId: started.job.id };
  } catch (error) {
    await failProviderJob(supabase, started.job.id, error);
    throw error;
  }
}

export async function approveCampaign(context: AppAuthContext, campaignId: string) {
  const { campaign, supabase } = await getWritableCampaign(context, campaignId);
  if (campaign.status !== "pending_approval") {
    throw new Error("Générez d’abord l’aperçu obligatoire.");
  }
  const { data: firstStep } = await supabase
    .from("sequence_steps")
    .select("id")
    .eq("organization_id", context.organization.id)
    .eq("campaign_id", campaign.id)
    .eq("position", 0)
    .maybeSingle();
  if (!firstStep) throw new Error("La première étape de la séquence est absente.");
  const [{ count: enrollmentCount }, { count: messageCount }] = await Promise.all([
    supabase
      .from("campaign_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", context.organization.id)
      .eq("campaign_id", campaign.id),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", context.organization.id)
      .eq("campaign_id", campaign.id)
      .eq("sequence_step_id", firstStep.id)
      .eq("status", "pending_approval"),
  ]);
  if (!enrollmentCount || enrollmentCount !== messageCount) {
    throw new Error("Chaque contact doit disposer d’un premier message à valider.");
  }
  const now = new Date().toISOString();
  const { error: messagesError } = await supabase
    .from("messages")
    .update({ status: "approved", approved_by: context.user.id, approved_at: now })
    .eq("organization_id", context.organization.id)
    .eq("campaign_id", campaign.id)
    .eq("sequence_step_id", firstStep.id)
    .eq("status", "pending_approval");
  if (messagesError) throw new Error("Les premiers messages n’ont pas pu être validés.");
  await supabase
    .from("messages")
    .update({ status: "approved" })
    .eq("organization_id", context.organization.id)
    .eq("campaign_id", campaign.id)
    .eq("status", "draft");
  const { error } = await supabase
    .from("campaigns")
    .update({
      status: "approved",
      approved_by: context.user.id,
      approved_at: now,
    })
    .eq("organization_id", context.organization.id)
    .eq("id", campaign.id);
  if (error) throw new Error("La campagne n’a pas pu être approuvée.");
  return { campaignId, approvedAt: now, approvedMessages: messageCount };
}

export async function launchCampaign(context: AppAuthContext, campaignId: string) {
  const { campaign, supabase } = await getWritableCampaign(context, campaignId);
  if (campaign.status !== "approved") {
    throw new Error("La campagne doit être approuvée avant son lancement.");
  }
  const window = sendWindowSchema.parse(campaign.send_window);
  const [stepsResult, enrollmentsResult, messagesResult] = await Promise.all([
    supabase
      .from("sequence_steps")
      .select("*")
      .eq("organization_id", context.organization.id)
      .eq("campaign_id", campaign.id)
      .eq("is_active", true)
      .order("position"),
    supabase
      .from("campaign_enrollments")
      .select("*")
      .eq("organization_id", context.organization.id)
      .eq("campaign_id", campaign.id)
      .eq("status", "pending_approval"),
    supabase
      .from("messages")
      .select("*")
      .eq("organization_id", context.organization.id)
      .eq("campaign_id", campaign.id)
      .in("status", ["approved"]),
  ]);
  if (stepsResult.error || enrollmentsResult.error || messagesResult.error) {
    throw new Error("Le planning de campagne n’a pas pu être préparé.");
  }
  const steps = new Map((stepsResult.data ?? []).map((step) => [step.id, step]));
  const messages = messagesResult.data ?? [];
  const launchAt = new Date();

  for (const enrollment of enrollmentsResult.data ?? []) {
    const { data: thread, error: threadError } = await supabase
      .from("mail_threads")
      .upsert(
        {
          organization_id: context.organization.id,
          mailbox_id: campaign.mailbox_id,
          provider_thread_id: `mock-pending:${enrollment.id}`,
          company_id: enrollment.company_id,
          contact_id: enrollment.contact_id,
          campaign_id: campaign.id,
          priority: "normal",
        },
        { onConflict: "mailbox_id,provider_thread_id" },
      )
      .select("id")
      .single();
    if (threadError) throw new Error("Le fil mock d’un destinataire n’a pas pu être créé.");
    const enrollmentMessages = messages.filter(
      (message) => message.enrollment_id === enrollment.id,
    );
    let firstSchedule: string | null = null;
    let firstScheduleTime = Number.POSITIVE_INFINITY;
    for (const message of enrollmentMessages) {
      const step = message.sequence_step_id ? steps.get(message.sequence_step_id) : null;
      if (!step) continue;
      const scheduledAt = scheduleCampaignStep({
        base: launchAt,
        delayDays: step.delay_days,
        delayHours: step.delay_hours,
        window,
        jitterSeed: message.deduplication_key,
      }).toISOString();
      const scheduledTime = Date.parse(scheduledAt);
      if (scheduledTime < firstScheduleTime) {
        firstSchedule = scheduledAt;
        firstScheduleTime = scheduledTime;
      }
      const { error } = await supabase
        .from("messages")
        .update({ thread_id: thread.id, scheduled_at: scheduledAt, status: "scheduled" })
        .eq("id", message.id)
        .eq("status", "approved");
      if (error) throw new Error("Un message n’a pas pu être planifié.");
    }
    if (!firstSchedule) throw new Error("Un contact ne dispose d’aucun message approuvé.");
    const { error } = await supabase
      .from("campaign_enrollments")
      .update({ status: "scheduled", next_send_at: firstSchedule })
      .eq("id", enrollment.id);
    if (error) throw new Error("Une inscription n’a pas pu être planifiée.");
  }
  const { error } = await supabase
    .from("campaigns")
    .update({ status: "active", launched_at: launchAt.toISOString() })
    .eq("organization_id", context.organization.id)
    .eq("id", campaign.id);
  if (error) throw new Error("La campagne n’a pas pu être lancée.");
  return {
    campaignId,
    launchedAt: launchAt.toISOString(),
    scheduledMessages: messages.length,
    provider: "mock_mail",
  };
}

export async function pauseCampaign(context: AppAuthContext, campaignId: string) {
  const { campaign, supabase } = await getWritableCampaign(context, campaignId);
  if (!["active", "scheduled"].includes(campaign.status)) {
    throw new Error("Seule une campagne active peut être mise en pause.");
  }
  const { error } = await supabase
    .from("campaigns")
    .update({ status: "paused" })
    .eq("organization_id", context.organization.id)
    .eq("id", campaign.id);
  if (error) throw new Error("La campagne n’a pas pu être mise en pause.");
  await supabase
    .from("campaign_enrollments")
    .update({ status: "paused" })
    .eq("organization_id", context.organization.id)
    .eq("campaign_id", campaign.id)
    .in("status", ["scheduled", "active"]);
  return { campaignId, paused: true };
}

export async function loadMessageForSending(
  context: AppAuthContext,
  messageId: string,
): Promise<{
  message: MessageRow;
  campaign: CampaignRow;
  contact: ContactRow;
  mailbox: MailboxRow;
}> {
  assertOrganizationPermission(context.membership.role, "messages:send");
  if (context.isPreview) throw new Error("L’envoi est désactivé en mode aperçu.");
  const supabase = await createSupabaseServerClient();
  const { data: message, error } = await supabase
    .from("messages")
    .select("*")
    .eq("organization_id", context.organization.id)
    .eq("id", messageId)
    .maybeSingle();
  if (error || !message || !message.campaign_id || !message.enrollment_id) {
    throw new Error("Message introuvable.");
  }
  const { campaign } = await getWritableCampaign(context, message.campaign_id);
  const { data: enrollment, error: enrollmentError } = await supabase
    .from("campaign_enrollments")
    .select("contact_id")
    .eq("id", message.enrollment_id)
    .single();
  if (enrollmentError || !enrollment) throw new Error("Inscription indisponible.");
  const [contactResult, mailboxResult] = await Promise.all([
    supabase.from("contacts").select("*").eq("id", enrollment.contact_id).single(),
    supabase.from("mailboxes").select("*").eq("id", campaign.mailbox_id).single(),
  ]);
  if (contactResult.error || mailboxResult.error) throw new Error("Destinataire indisponible.");
  return {
    message,
    campaign,
    contact: contactResult.data,
    mailbox: mailboxResult.data,
  };
}
