import "server-only";

import { AuthorizationError } from "@/lib/errors/authorization-error";
import { can } from "@/lib/permissions/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppAuthContext } from "@/types/auth";
import type {
  AnalyticsExportRow,
  AuditLogRow,
  ComplianceSettingsRow,
  PrivacyRequestRow,
  RetentionRunRow,
} from "@/types/database";

import type { AuditFilters } from "../schemas";
import type { AuditEntry, AuditLedger, ComplianceCenter } from "../types";

const previewOrganizationId = "10000000-0000-0000-0000-000000000001";
const previewUserId = "00000000-0000-0000-0000-000000000000";

function previewSettings(): ComplianceSettingsRow {
  return {
    organization_id: previewOrganizationId,
    default_lawful_basis: "legitimate_interest",
    contact_retention_days: 730,
    message_retention_days: 365,
    provider_log_retention_days: 180,
    audit_retention_days: 2190,
    anonymize_inactive_contacts: true,
    retain_suppression_proof: true,
    tracking_enabled: false,
    updated_by: previewUserId,
    created_at: "2026-07-23T09:00:00.000Z",
    updated_at: "2026-07-23T09:00:00.000Z",
  };
}

function changedFields(entry: AuditLogRow) {
  const before =
    entry.before && typeof entry.before === "object" && !Array.isArray(entry.before)
      ? entry.before
      : {};
  const after =
    entry.after && typeof entry.after === "object" && !Array.isArray(entry.after)
      ? entry.after
      : {};
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .filter((key) => !["updated_at", "created_at"].includes(key))
    .slice(0, 8);
}

export async function getComplianceCenter(context: AppAuthContext): Promise<ComplianceCenter> {
  if (!can(context.membership.role, "compliance:read")) {
    throw new AuthorizationError("Votre rôle ne permet pas de consulter la conformité.");
  }
  if (context.isPreview) {
    return {
      settings: previewSettings(),
      contacts: [
        {
          id: "70000000-0000-0000-0000-000000000001",
          name: "Lina Martin",
          email: "lina.martin@example.test",
          lawfulBasis: "legitimate_interest",
          doNotContact: false,
          deletedAt: null,
        },
        {
          id: "70000000-0000-0000-0000-000000000002",
          name: "Contact à qualifier",
          email: null,
          lawfulBasis: null,
          doNotContact: true,
          deletedAt: null,
        },
      ],
      diagnostics: {
        activeContacts: 24,
        missingLawfulBasis: 3,
        suppressedContacts: 5,
        deletionCandidates: 2,
        documentedSources: 41,
      },
      retentionRuns: [
        {
          id: "run-preview",
          organization_id: previewOrganizationId,
          requested_by: previewUserId,
          mode: "simulation",
          status: "completed",
          settings_snapshot: { contact_retention_days: 730 },
          report: { contacts: 2, messages: 7, provider_jobs: 4, audit_logs: 0 },
          error: null,
          started_at: "2026-07-23T11:12:00.000Z",
          completed_at: "2026-07-23T11:12:00.000Z",
          created_at: "2026-07-23T11:12:00.000Z",
        },
      ] as RetentionRunRow[],
      exports: [],
      privacyRequests: [],
      isPreview: true,
    };
  }

  const supabase = await createSupabaseServerClient();
  const organizationId = context.organization.id;
  const [settings, contacts, runs, exportsResult, privacy, sources] = await Promise.all([
    supabase.from("compliance_settings").select("*").eq("organization_id", organizationId).single(),
    supabase
      .from("contacts")
      .select("id, full_name, email, lawful_basis, do_not_contact, deleted_at, updated_at")
      .eq("organization_id", organizationId)
      .order("full_name")
      .limit(250),
    supabase
      .from("retention_runs")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("analytics_exports")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("privacy_requests")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("data_sources")
      .select("entity_id")
      .eq("organization_id", organizationId)
      .eq("entity_type", "contact")
      .limit(5000),
  ]);
  const error = [settings, contacts, runs, exportsResult, privacy, sources].find(
    (result) => result.error,
  )?.error;
  if (error || !settings.data) {
    throw new Error(
      `Impossible de charger le centre de conformité : ${error?.message ?? "réglages absents"}`,
    );
  }

  const rows = contacts.data ?? [];
  const cutoff = Date.now() - settings.data.contact_retention_days * 86_400_000;
  return {
    settings: settings.data,
    contacts: rows.map((contact) => ({
      id: contact.id,
      name: contact.full_name,
      email: contact.email,
      lawfulBasis: contact.lawful_basis,
      doNotContact: contact.do_not_contact,
      deletedAt: contact.deleted_at,
    })),
    diagnostics: {
      activeContacts: rows.filter((contact) => !contact.deleted_at).length,
      missingLawfulBasis: rows.filter(
        (contact) => !contact.deleted_at && !contact.do_not_contact && !contact.lawful_basis,
      ).length,
      suppressedContacts: rows.filter((contact) => contact.do_not_contact).length,
      deletionCandidates: rows.filter(
        (contact) =>
          Boolean(
            contact.deleted_at ||
            (settings.data.anonymize_inactive_contacts && contact.do_not_contact),
          ) && new Date(contact.updated_at).getTime() < cutoff,
      ).length,
      documentedSources: new Set((sources.data ?? []).map((source) => source.entity_id)).size,
    },
    retentionRuns: (runs.data ?? []) as RetentionRunRow[],
    exports: (exportsResult.data ?? []) as AnalyticsExportRow[],
    privacyRequests: (privacy.data ?? []) as PrivacyRequestRow[],
    isPreview: false,
  };
}

export async function getAuditLedger(
  context: AppAuthContext,
  filters: AuditFilters,
): Promise<AuditLedger> {
  if (!can(context.membership.role, "audit:read")) {
    throw new AuthorizationError("Votre rôle ne permet pas de consulter le journal d’audit.");
  }
  if (context.isPreview) {
    const previewRows: AuditLogRow[] = [
      {
        id: "audit-1",
        organization_id: previewOrganizationId,
        actor_user_id: previewUserId,
        action: "compliance_settings.UPDATE",
        entity_type: "compliance_settings",
        entity_id: previewOrganizationId,
        before: { message_retention_days: 730 },
        after: { message_retention_days: 365 },
        ip_hash: null,
        user_agent: null,
        created_at: "2026-07-23T11:10:00.000Z",
      },
      {
        id: "audit-2",
        organization_id: previewOrganizationId,
        actor_user_id: previewUserId,
        action: "analytics_exports.INSERT",
        entity_type: "analytics_exports",
        entity_id: "export-preview",
        before: null,
        after: { export_type: "analytics_overview", row_count: 17 },
        ip_hash: null,
        user_agent: null,
        created_at: "2026-07-23T11:14:00.000Z",
      },
    ];
    return {
      entries: previewRows.map((entry) => ({
        ...entry,
        actorLabel: "Florent Bourdier",
        changedFields: changedFields(entry),
      })),
      actors: [{ id: previewUserId, label: "Florent Bourdier" }],
      actions: [...new Set(previewRows.map((entry) => entry.action))],
      entityTypes: [...new Set(previewRows.map((entry) => entry.entity_type))],
      isPreview: true,
    };
  }

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("audit_logs")
    .select("*")
    .eq("organization_id", context.organization.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (filters.action) query = query.eq("action", filters.action);
  if (filters.entityType) query = query.eq("entity_type", filters.entityType);
  if (filters.actor) query = query.eq("actor_user_id", filters.actor);
  if (filters.start) query = query.gte("created_at", `${filters.start}T00:00:00.000Z`);
  if (filters.end) query = query.lte("created_at", `${filters.end}T23:59:59.999Z`);

  const { data, error } = await query;
  if (error) throw new Error(`Impossible de charger le journal d’audit : ${error.message}`);
  const rows = data ?? [];
  const actorIds = [
    ...new Set(rows.map((entry) => entry.actor_user_id).filter(Boolean)),
  ] as string[];
  const profiles = actorIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", actorIds)
    : { data: [], error: null };
  if (profiles.error)
    throw new Error(`Impossible de charger les acteurs : ${profiles.error.message}`);
  const actorLabels = new Map(
    (profiles.data ?? []).map((profile) => [profile.id, profile.full_name ?? profile.email]),
  );

  return {
    entries: rows.map((entry): AuditEntry => ({
      ...entry,
      actorLabel: entry.actor_user_id
        ? (actorLabels.get(entry.actor_user_id) ?? "Membre supprimé")
        : "Système",
      changedFields: changedFields(entry),
    })),
    actors: (profiles.data ?? []).map((profile) => ({
      id: profile.id,
      label: profile.full_name ?? profile.email,
    })),
    actions: [...new Set(rows.map((entry) => entry.action))].sort(),
    entityTypes: [...new Set(rows.map((entry) => entry.entity_type))].sort(),
    isPreview: false,
  };
}
