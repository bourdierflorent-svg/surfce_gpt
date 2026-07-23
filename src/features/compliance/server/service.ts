import "server-only";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";

import { AuthorizationError } from "@/lib/errors/authorization-error";
import { can } from "@/lib/permissions/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppAuthContext } from "@/types/auth";
import type { Json } from "@/types/database";

import type { ComplianceSettingsInput, PrivacyRequestInput } from "../schemas";

function requireAction(
  context: AppAuthContext,
  permission: "compliance:write" | "privacy:write" | "retention:simulate",
) {
  if (context.isPreview || !can(context.membership.role, permission)) {
    throw new AuthorizationError("Cette action de conformité est réservée à l’administrateur.");
  }
}

export async function updateComplianceSettings(
  context: AppAuthContext,
  input: ComplianceSettingsInput,
) {
  requireAction(context, "compliance:write");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("compliance_settings")
    .update({
      default_lawful_basis: input.defaultLawfulBasis,
      contact_retention_days: input.contactRetentionDays,
      message_retention_days: input.messageRetentionDays,
      provider_log_retention_days: input.providerLogRetentionDays,
      audit_retention_days: input.auditRetentionDays,
      anonymize_inactive_contacts: input.anonymizeInactiveContacts,
      retain_suppression_proof: true,
      tracking_enabled: input.trackingEnabled,
      updated_by: context.user.id,
    })
    .eq("organization_id", context.organization.id)
    .select("*")
    .single();
  if (error) throw new Error(`Les réglages n’ont pas été enregistrés : ${error.message}`);
  revalidatePath("/settings/compliance");
  return data;
}

export async function simulateRetention(context: AppAuthContext) {
  requireAction(context, "retention:simulate");
  const supabase = await createSupabaseServerClient();
  const { data: settings, error: settingsError } = await supabase
    .from("compliance_settings")
    .select("*")
    .eq("organization_id", context.organization.id)
    .single();
  if (settingsError || !settings) throw new Error("Les réglages de rétention sont indisponibles.");

  const contactCutoff = new Date(
    Date.now() - settings.contact_retention_days * 86_400_000,
  ).toISOString();
  let contactQuery = supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", context.organization.id)
    .lt("updated_at", contactCutoff);
  contactQuery = settings.anonymize_inactive_contacts
    ? contactQuery.or("deleted_at.not.is.null,do_not_contact.eq.true")
    : contactQuery.not("deleted_at", "is", null);

  const [contacts, messages, jobs, audits] = await Promise.all([
    contactQuery,
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", context.organization.id)
      .lt(
        "created_at",
        new Date(Date.now() - settings.message_retention_days * 86_400_000).toISOString(),
      ),
    supabase
      .from("provider_jobs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", context.organization.id)
      .lt(
        "created_at",
        new Date(Date.now() - settings.provider_log_retention_days * 86_400_000).toISOString(),
      ),
    supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", context.organization.id)
      .lt(
        "created_at",
        new Date(Date.now() - settings.audit_retention_days * 86_400_000).toISOString(),
      ),
  ]);
  const error = [contacts, messages, jobs, audits].find((result) => result.error)?.error;
  if (error) throw new Error(`La simulation n’a pas abouti : ${error.message}`);

  const report = {
    contacts: contacts.count ?? 0,
    messages: messages.count ?? 0,
    provider_jobs: jobs.count ?? 0,
    audit_logs: audits.count ?? 0,
    dry_run: true,
  };
  const now = new Date().toISOString();
  const { data, error: insertError } = await supabase
    .from("retention_runs")
    .insert({
      organization_id: context.organization.id,
      requested_by: context.user.id,
      mode: "simulation",
      status: "completed",
      settings_snapshot: {
        default_lawful_basis: settings.default_lawful_basis,
        contact_retention_days: settings.contact_retention_days,
        message_retention_days: settings.message_retention_days,
        provider_log_retention_days: settings.provider_log_retention_days,
        audit_retention_days: settings.audit_retention_days,
        anonymize_inactive_contacts: settings.anonymize_inactive_contacts,
        retain_suppression_proof: settings.retain_suppression_proof,
        tracking_enabled: settings.tracking_enabled,
      },
      report,
      started_at: now,
      completed_at: now,
    })
    .select("*")
    .single();
  if (insertError)
    throw new Error(`La simulation n’a pas été journalisée : ${insertError.message}`);
  revalidatePath("/settings/compliance");
  return data;
}

export async function processPrivacyRequest(context: AppAuthContext, input: PrivacyRequestInput) {
  requireAction(context, "privacy:write");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("process_contact_privacy_request", {
    p_contact_id: input.contactId,
    p_request_type: input.requestType,
    p_reason: input.reason,
  });
  if (error) throw new Error(`La demande n’a pas abouti : ${error.message}`);
  revalidatePath("/settings/compliance");
  revalidatePath("/contacts");
  return data;
}

const CONTACT_EXPORT_COLUMNS = [
  "contact",
  "company",
  "sources",
  "campaign_enrollments",
  "conversations",
] as const;

export async function exportContactSubject(
  context: AppAuthContext,
  contactId: string,
  reason: string,
) {
  requireAction(context, "privacy:write");
  const supabase = await createSupabaseServerClient();
  const organizationId = context.organization.id;
  const [contact, sources, enrollments, threads] = await Promise.all([
    supabase
      .from("contacts")
      .select(
        "id, company_id, first_name, last_name, full_name, job_title, department, email, phone, linkedin_url, contact_status, lawful_basis, do_not_contact, do_not_contact_reason, tags, created_at, updated_at, deleted_at",
      )
      .eq("organization_id", organizationId)
      .eq("id", contactId)
      .maybeSingle(),
    supabase
      .from("data_sources")
      .select(
        "field_name, provider, source_url, collected_at, last_verified_at, confidence, is_inferred",
      )
      .eq("organization_id", organizationId)
      .eq("entity_type", "contact")
      .eq("entity_id", contactId),
    supabase
      .from("campaign_enrollments")
      .select("id, campaign_id, status, created_at, stopped_at, stop_reason")
      .eq("organization_id", organizationId)
      .eq("contact_id", contactId),
    supabase
      .from("mail_threads")
      .select("id, campaign_id, subject, classification, priority, created_at, last_message_at")
      .eq("organization_id", organizationId)
      .eq("contact_id", contactId),
  ]);
  const error = [contact, sources, enrollments, threads].find((result) => result.error)?.error;
  if (error || !contact.data) throw new Error("Le contact demandé est introuvable.");

  const company = await supabase
    .from("companies")
    .select("id, legal_name, trade_name, sector, city, country_code")
    .eq("organization_id", organizationId)
    .eq("id", contact.data.company_id)
    .maybeSingle();
  if (company.error)
    throw new Error(`L’entreprise liée est indisponible : ${company.error.message}`);
  const threadIds = (threads.data ?? []).map((thread) => thread.id);
  const messages = threadIds.length
    ? await supabase
        .from("messages")
        .select(
          "thread_id, direction, subject, body_text, status, classification, sent_at, received_at, created_at",
        )
        .eq("organization_id", organizationId)
        .in("thread_id", threadIds)
        .order("created_at")
    : { data: [], error: null };
  if (messages.error)
    throw new Error(`Les échanges sont indisponibles : ${messages.error.message}`);

  const payload = {
    generated_at: new Date().toISOString(),
    organization: { id: organizationId, name: context.organization.name },
    contact: contact.data,
    company: company.data,
    sources: sources.data ?? [],
    campaign_enrollments: enrollments.data ?? [],
    conversations: (threads.data ?? []).map((thread) => ({
      ...thread,
      messages: (messages.data ?? []).filter((message) => message.thread_id === thread.id),
    })),
  };
  const body = `${JSON.stringify(payload, null, 2)}\n`;
  const checksum = createHash("sha256").update(body).digest("hex");
  const now = new Date().toISOString();
  const [privacyLog, exportLog] = await Promise.all([
    supabase.from("privacy_requests").insert({
      organization_id: organizationId,
      contact_id: contactId,
      requested_by: context.user.id,
      request_type: "access",
      status: "completed",
      reason,
      result: {
        exported_sections: [...CONTACT_EXPORT_COLUMNS],
        checksum,
      },
      completed_at: now,
    }),
    supabase.from("analytics_exports").insert({
      organization_id: organizationId,
      requested_by: context.user.id,
      export_type: "contact_subject",
      format: "json",
      filters: { contact_id: contactId },
      columns: [...CONTACT_EXPORT_COLUMNS],
      row_count: 1,
      status: "completed",
      checksum,
      expires_at: null,
    }),
  ]);
  if (privacyLog.error || exportLog.error) {
    throw new Error(
      `L’export n’a pas pu être journalisé : ${privacyLog.error?.message ?? exportLog.error?.message}`,
    );
  }
  return { body, fileName: `surfce-donnees-contact-${contactId}.json` };
}

export async function runRetentionAsService(organizationId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("run_retention", {
    p_organization_id: organizationId,
    p_dry_run: false,
  });
  if (error) throw new Error(error.message);
  return data as Json;
}

export async function runScheduledRetention() {
  const supabase = createSupabaseAdminClient();
  const { data: organizations, error } = await supabase.from("organizations").select("id");
  if (error) throw new Error(error.message);
  const results = [];
  for (const organization of organizations ?? []) {
    results.push({
      organizationId: organization.id,
      report: await runRetentionAsService(organization.id),
    });
  }
  return { processedOrganizations: results.length, results };
}
