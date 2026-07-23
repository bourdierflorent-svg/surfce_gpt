import "server-only";

import { AuthorizationError } from "@/lib/errors/authorization-error";
import { can } from "@/lib/permissions/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppAuthContext } from "@/types/auth";

import { buildAnalyticsReport, type AnalyticsDataset } from "../aggregation";
import type { AnalyticsFilters } from "../schemas";

const ANALYTICS_ROW_LIMIT = 5_000;
const ANALYTICS_MESSAGE_LIMIT = 10_000;

function previewDataset(filters: AnalyticsFilters): AnalyticsDataset {
  const organizationId = "10000000-0000-0000-0000-000000000001";
  const ownerId = "00000000-0000-0000-0000-000000000000";
  const createdAt = `${filters.start}T09:00:00.000Z`;
  const secondAt = `${filters.end}T15:00:00.000Z`;
  const companyIds = ["c1", "c2", "c3", "c4"];
  const stageIds = ["s-open", "s-meeting", "s-won", "s-lost"];
  const base = { organization_id: organizationId, created_at: createdAt, updated_at: secondAt };

  return {
    companies: companyIds.map((id, index) => ({
      ...base,
      id,
      legal_name: ["Studio Huit", "Rive Conseil", "Maison Junot", "Nexa Partners"][index],
      normalized_name: id,
      city: index === 2 ? "Boulogne-Billancourt" : "Paris",
      district: index === 2 ? "92" : "75",
      sector: ["Communication", "Conseil", "Design", "Technologie"][index],
      employee_range: ["11-50", "51-200", "11-50", "201-500"][index],
      status: index === 2 ? "customer" : "qualified",
      assigned_to: ownerId,
      deleted_at: null,
    })) as AnalyticsDataset["companies"],
    contacts: companyIds.slice(0, 3).map((companyId, index) => ({
      ...base,
      id: `contact-${index}`,
      company_id: companyId,
      first_name: ["Lina", "Mathieu", "Ana"][index],
      last_name: ["Martin", "Rivière", "Costa"][index],
      full_name: ["Lina Martin", "Mathieu Rivière", "Ana Costa"][index],
      email: `contact${index}@example.test`,
      lawful_basis: "legitimate_interest",
      do_not_contact: false,
      deleted_at: null,
    })) as AnalyticsDataset["contacts"],
    campaigns: [
      { ...base, id: "campaign-1", name: "Décideurs Q3" },
      { ...base, id: "campaign-2", name: "Séminaires rentrée" },
    ] as AnalyticsDataset["campaigns"],
    enrollments: companyIds.slice(0, 3).map((companyId, index) => ({
      ...base,
      id: `enrollment-${index}`,
      campaign_id: index < 2 ? "campaign-1" : "campaign-2",
      company_id: companyId,
      contact_id: `contact-${index}`,
      status: "active",
    })) as AnalyticsDataset["enrollments"],
    threads: companyIds.slice(0, 3).map((companyId, index) => ({
      ...base,
      id: `thread-${index}`,
      mailbox_id: "mailbox-1",
      provider_thread_id: `preview-${index}`,
      company_id: companyId,
      contact_id: `contact-${index}`,
      campaign_id: index < 2 ? "campaign-1" : "campaign-2",
    })) as AnalyticsDataset["threads"],
    messages: [
      ...companyIds.slice(0, 3).map((_, index) => ({
        ...base,
        id: `out-${index}`,
        thread_id: `thread-${index}`,
        campaign_id: index < 2 ? "campaign-1" : "campaign-2",
        enrollment_id: `enrollment-${index}`,
        direction: "outbound",
        status: "delivered",
        sent_at: createdAt,
      })),
      {
        ...base,
        id: "in-1",
        thread_id: "thread-0",
        direction: "inbound",
        status: "received",
        classification: "positive",
        received_at: secondAt,
      },
      {
        ...base,
        id: "in-2",
        thread_id: "thread-1",
        direction: "inbound",
        status: "received",
        classification: "appointment_request",
        received_at: secondAt,
      },
    ] as AnalyticsDataset["messages"],
    opportunities: companyIds.slice(0, 4).map((companyId, index) => ({
      ...base,
      id: `opportunity-${index}`,
      company_id: companyId,
      owner_id: ownerId,
      stage_id: stageIds[index],
      venue_id: index < 3 ? "venue-1" : "venue-2",
      offer_id: index < 3 ? "offer-1" : "offer-2",
      campaign_id: index < 2 ? "campaign-1" : "campaign-2",
      source: index < 3 ? "inbox" : "manual",
      estimated_amount: [6800, 12400, 9200, 5400][index],
      proposed_amount: index === 2 ? 9200 : null,
      signed_amount: index === 2 ? 9200 : null,
      probability: [45, 60, 100, 0][index],
      won_at: index === 2 ? secondAt : null,
      lost_at: index === 3 ? secondAt : null,
    })) as AnalyticsDataset["opportunities"],
    stages: [
      { ...base, id: "s-open", key: "engaged", label: "Engagé", category: "open" },
      { ...base, id: "s-meeting", key: "appointment", label: "Rendez-vous", category: "open" },
      { ...base, id: "s-won", key: "won", label: "Gagné", category: "won" },
      { ...base, id: "s-lost", key: "lost", label: "Perdu", category: "lost" },
    ] as AnalyticsDataset["stages"],
    appointments: [
      {
        ...base,
        id: "appointment-1",
        company_id: "c2",
        opportunity_id: "opportunity-1",
        owner_id: ownerId,
      },
    ] as AnalyticsDataset["appointments"],
    proposals: [
      {
        ...base,
        id: "proposal-1",
        opportunity_id: "opportunity-2",
        amount: 9200,
      },
    ] as AnalyticsDataset["proposals"],
    providerJobs: [
      {
        ...base,
        id: "job-1",
        entity_id: "c1",
        job_type: "company_enrichment",
        status: "completed",
        estimated_cost: 3.4,
        completed_at: secondAt,
      },
      {
        ...base,
        id: "job-2",
        entity_id: "c2",
        job_type: "contact_discovery",
        status: "completed",
        estimated_cost: 2.1,
        completed_at: secondAt,
      },
    ] as AnalyticsDataset["providerJobs"],
    tasks: [
      {
        ...base,
        id: "task-1",
        status: "todo",
        due_at: "2025-01-01T09:00:00.000Z",
      },
    ] as AnalyticsDataset["tasks"],
    mailboxes: [{ ...base, id: "mailbox-1", status: "connected" }] as AnalyticsDataset["mailboxes"],
    profiles: [{ id: ownerId, full_name: "Florent Bourdier", email: "florent@surfce.fr" }],
    venues: [
      { id: "venue-1", name: "Little Room" },
      { id: "venue-2", name: "Maison Junot" },
    ],
    offers: [
      { id: "offer-1", name: "Afterwork signature" },
      { id: "offer-2", name: "Séminaire direction" },
    ],
  };
}

export async function getAnalyticsReport(context: AppAuthContext, filters: AnalyticsFilters) {
  if (!can(context.membership.role, "analytics:read")) {
    throw new AuthorizationError("Votre rôle ne permet pas de consulter les analyses.");
  }
  if (context.isPreview) {
    return buildAnalyticsReport(previewDataset(filters), filters, true);
  }

  const supabase = await createSupabaseServerClient();
  const organizationId = context.organization.id;
  const periodStart = `${filters.start}T00:00:00.000Z`;
  const periodEnd = `${filters.end}T23:59:59.999Z`;
  const messageLookback = new Date(periodStart);
  messageLookback.setUTCDate(messageLookback.getUTCDate() - 90);
  const queries = await Promise.all([
    supabase
      .from("companies")
      .select("*")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .limit(ANALYTICS_ROW_LIMIT),
    supabase
      .from("contacts")
      .select("*")
      .eq("organization_id", organizationId)
      .limit(ANALYTICS_ROW_LIMIT),
    supabase.from("campaigns").select("*").eq("organization_id", organizationId).limit(1_000),
    supabase
      .from("campaign_enrollments")
      .select("*")
      .eq("organization_id", organizationId)
      .limit(ANALYTICS_ROW_LIMIT),
    supabase
      .from("mail_threads")
      .select("*")
      .eq("organization_id", organizationId)
      .limit(ANALYTICS_ROW_LIMIT),
    supabase
      .from("messages")
      .select("*")
      .eq("organization_id", organizationId)
      .gte("created_at", messageLookback.toISOString())
      .lte("created_at", periodEnd)
      .limit(ANALYTICS_MESSAGE_LIMIT),
    supabase
      .from("opportunities")
      .select("*")
      .eq("organization_id", organizationId)
      .gte("created_at", periodStart)
      .lte("created_at", periodEnd)
      .limit(ANALYTICS_ROW_LIMIT),
    supabase
      .from("opportunity_stages")
      .select("*")
      .eq("organization_id", organizationId)
      .limit(200),
    supabase
      .from("appointments")
      .select("*")
      .eq("organization_id", organizationId)
      .gte("created_at", periodStart)
      .lte("created_at", periodEnd)
      .limit(ANALYTICS_ROW_LIMIT),
    supabase
      .from("proposals")
      .select("*")
      .eq("organization_id", organizationId)
      .gte("created_at", periodStart)
      .lte("created_at", periodEnd)
      .limit(ANALYTICS_ROW_LIMIT),
    supabase
      .from("provider_jobs")
      .select("*")
      .eq("organization_id", organizationId)
      .gte("created_at", messageLookback.toISOString())
      .lte("created_at", periodEnd)
      .limit(ANALYTICS_ROW_LIMIT),
    supabase
      .from("tasks")
      .select("*")
      .eq("organization_id", organizationId)
      .limit(ANALYTICS_ROW_LIMIT),
    supabase.from("mailboxes").select("*").eq("organization_id", organizationId).limit(500),
    supabase
      .from("memberships")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .limit(500),
    supabase.from("venues").select("id, name").eq("organization_id", organizationId).limit(1_000),
    supabase
      .from("venue_offers")
      .select("id, name")
      .eq("organization_id", organizationId)
      .limit(1_000),
    supabase
      .from("provider_usage_events")
      .select("*")
      .eq("organization_id", organizationId)
      .gte("created_at", periodStart)
      .lte("created_at", periodEnd)
      .limit(ANALYTICS_ROW_LIMIT),
  ]);
  const firstError = queries.find((query) => query.error)?.error;
  if (firstError) throw new Error(`Impossible de calculer les analyses : ${firstError.message}`);

  const memberIds = (queries[13].data ?? []).map((item) => item.user_id);
  const profiles = memberIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", memberIds)
    : { data: [], error: null };
  if (profiles.error)
    throw new Error(`Impossible de charger les responsables : ${profiles.error.message}`);

  return buildAnalyticsReport(
    {
      companies: queries[0].data ?? [],
      contacts: queries[1].data ?? [],
      campaigns: queries[2].data ?? [],
      enrollments: queries[3].data ?? [],
      threads: queries[4].data ?? [],
      messages: queries[5].data ?? [],
      opportunities: queries[6].data ?? [],
      stages: queries[7].data ?? [],
      appointments: queries[8].data ?? [],
      proposals: queries[9].data ?? [],
      providerJobs: queries[10].data ?? [],
      tasks: queries[11].data ?? [],
      mailboxes: queries[12].data ?? [],
      profiles: profiles.data ?? [],
      venues: queries[14].data ?? [],
      offers: queries[15].data ?? [],
      providerUsageEvents: queries[16].data ?? [],
    },
    filters,
  );
}
