import { assertOrganizationPermission } from "@/features/organizations/server/authorization";
import {
  completeProviderJob,
  failProviderJob,
  startProviderJob,
} from "@/features/enrichment/server/jobs";
import { hashJson } from "@/lib/ai/hash";
import { AuthorizationError } from "@/lib/errors/authorization-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getContactVerificationProvider } from "@/providers/contacts";
import type { AppAuthContext } from "@/types/auth";
import type { Json } from "@/types/database";

export interface ContactVerificationResult {
  contactId: string;
  jobId: string;
  sourceId: string;
  provider: string;
  status: "valid" | "risky" | "invalid";
  confidence: number;
  reason: string;
  estimatedCost: number;
  reused: boolean;
  mock: true;
}

export async function verifyContactEmail(
  context: AppAuthContext,
  contactId: string,
  requestedKey?: string,
): Promise<ContactVerificationResult> {
  assertOrganizationPermission(context.membership.role, "contacts:write");
  if (context.isPreview) throw new Error("La vérification est désactivée en mode aperçu.");
  const supabase = await createSupabaseServerClient();
  const { data: contact, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("organization_id", context.organization.id)
    .eq("id", contactId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !contact) throw new Error("Ce contact n’existe pas dans votre organisation.");

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("domain, assigned_to")
    .eq("organization_id", context.organization.id)
    .eq("id", contact.company_id)
    .maybeSingle();
  if (companyError || !company) throw new Error("L’entreprise de ce contact est indisponible.");
  if (
    context.membership.role === "sales" &&
    contact.assigned_to !== context.user.id &&
    company.assigned_to !== context.user.id
  ) {
    throw new AuthorizationError();
  }

  const provider = getContactVerificationProvider();
  const input = {
    contactId: contact.id,
    email: contact.email,
    companyDomain: company.domain,
    updatedAt: contact.updated_at,
  };
  const key = requestedKey
    ? `contact-email:${contact.id}:${requestedKey}`
    : `contact-email:${contact.id}:${hashJson(input)}`;
  const started = await startProviderJob(supabase, context, {
    idempotencyKey: key,
    jobType: "contact_email_verification",
    provider: provider.name,
    entityType: "contact",
    entityId: contact.id,
    input: input as Json,
    estimatedCost: 0,
  });
  if (started.reused && started.job.output) {
    return { ...(started.job.output as unknown as ContactVerificationResult), reused: true };
  }

  try {
    const result = await provider.verifyEmail({
      contactId: contact.id,
      fullName: contact.full_name,
      email: contact.email,
      companyDomain: company.domain,
    });
    const sourcePayload = {
      organization_id: context.organization.id,
      entity_type: "contact",
      entity_id: contact.id,
      field_name: "email_verification",
      provider: result.provider,
      external_reference: result.externalReference,
      source_url: null,
      raw_value: result as unknown as Json,
      normalized_value: {
        email: contact.normalized_email,
        status: result.status,
        reason: result.reason,
      },
      collected_at: result.checkedAt,
      last_verified_at: result.checkedAt,
      confidence: result.confidence,
      is_inferred: false,
      metadata: { mock: true, estimated_cost: 0 },
    };
    const { data: existingSource } = await supabase
      .from("data_sources")
      .select("id")
      .eq("organization_id", context.organization.id)
      .eq("entity_type", "contact")
      .eq("entity_id", contact.id)
      .eq("field_name", "email_verification")
      .eq("provider", result.provider)
      .eq("external_reference", result.externalReference)
      .maybeSingle();
    const sourceQuery = existingSource
      ? supabase.from("data_sources").update(sourcePayload).eq("id", existingSource.id)
      : supabase.from("data_sources").insert(sourcePayload);
    const { data: source, error: sourceError } = await sourceQuery.select("id").single();
    if (sourceError) throw new Error("La preuve de vérification n’a pas pu être enregistrée.");

    const { error: updateError } = await supabase
      .from("contacts")
      .update({
        email_status: result.status,
        contact_status: contact.do_not_contact ? "do_not_contact" : result.status,
        confidence: result.confidence,
      })
      .eq("organization_id", context.organization.id)
      .eq("id", contact.id);
    if (updateError) throw new Error("Le statut du contact n’a pas pu être actualisé.");

    const output: ContactVerificationResult = {
      contactId: contact.id,
      jobId: started.job.id,
      sourceId: source.id,
      provider: result.provider,
      status: result.status,
      confidence: result.confidence,
      reason: result.reason,
      estimatedCost: 0,
      reused: false,
      mock: true,
    };
    await completeProviderJob(supabase, started.job.id, output as unknown as Json);
    return output;
  } catch (error) {
    await failProviderJob(supabase, started.job.id, error);
    throw error;
  }
}

export async function suppressContact(
  context: AppAuthContext,
  contactId: string,
  reason: string,
  source = "manual",
) {
  assertOrganizationPermission(context.membership.role, "compliance:write");
  if (context.isPreview) throw new Error("L’opposition est désactivée en mode aperçu.");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("suppress_contact", {
    p_contact_id: contactId,
    p_reason: reason,
    p_source: source,
  });
  if (error) throw new Error(error.message);
  return data;
}
