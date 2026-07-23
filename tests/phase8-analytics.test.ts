import { describe, expect, it } from "vitest";

import {
  ANALYTICS_EXPORT_COLUMNS,
  buildAnalyticsReport,
  reportToCsv,
  type AnalyticsDataset,
} from "@/features/analytics/aggregation";
import { analyticsFiltersSchema } from "@/features/analytics/schemas";

const organizationId = "10000000-0000-4000-8000-000000000001";
const ownerId = "00000000-0000-4000-8000-000000000001";
const createdAt = "2026-07-10T09:00:00.000Z";
const repliedAt = "2026-07-10T13:00:00.000Z";
const base = { organization_id: organizationId, created_at: createdAt, updated_at: repliedAt };

function dataset(): AnalyticsDataset {
  return {
    companies: [
      {
        ...base,
        id: "company-a",
        legal_name: "Entreprise A",
        normalized_name: "entreprise a",
        city: "Paris",
        district: "75",
        sector: "Conseil",
        employee_range: "11-50",
        status: "qualified",
        assigned_to: ownerId,
        deleted_at: null,
      },
      {
        ...base,
        id: "company-b",
        legal_name: "Entreprise B",
        normalized_name: "entreprise b",
        city: "Lyon",
        district: "69",
        sector: "Technologie",
        employee_range: "51-200",
        status: "qualified",
        assigned_to: ownerId,
        deleted_at: null,
      },
    ] as AnalyticsDataset["companies"],
    contacts: ["company-a", "company-b"].map((company_id, index) => ({
      ...base,
      id: `contact-${index}`,
      company_id,
      first_name: "Contact",
      last_name: String(index),
      full_name: `Contact ${index}`,
      do_not_contact: false,
      deleted_at: null,
    })) as AnalyticsDataset["contacts"],
    campaigns: [{ ...base, id: "campaign-a", name: "Campagne A" }] as AnalyticsDataset["campaigns"],
    enrollments: ["company-a", "company-b"].map((company_id, index) => ({
      ...base,
      id: `enrollment-${index}`,
      campaign_id: "campaign-a",
      company_id,
      contact_id: `contact-${index}`,
      status: "active",
    })) as AnalyticsDataset["enrollments"],
    threads: ["company-a", "company-b"].map((company_id, index) => ({
      ...base,
      id: `thread-${index}`,
      company_id,
      contact_id: `contact-${index}`,
      campaign_id: "campaign-a",
      mailbox_id: "mailbox-a",
      provider_thread_id: `provider-${index}`,
    })) as AnalyticsDataset["threads"],
    messages: [
      ...[0, 1].map((index) => ({
        ...base,
        id: `out-${index}`,
        thread_id: `thread-${index}`,
        enrollment_id: `enrollment-${index}`,
        campaign_id: "campaign-a",
        direction: "outbound",
        status: "delivered",
        sent_at: createdAt,
      })),
      {
        ...base,
        id: "reply",
        thread_id: "thread-0",
        campaign_id: "campaign-a",
        direction: "inbound",
        status: "received",
        classification: "positive",
        received_at: repliedAt,
      },
    ] as AnalyticsDataset["messages"],
    opportunities: [
      {
        ...base,
        id: "opportunity-a",
        company_id: "company-a",
        owner_id: ownerId,
        stage_id: "open",
        venue_id: "venue-a",
        offer_id: "offer-a",
        campaign_id: "campaign-a",
        source: "inbox",
        estimated_amount: 10_000,
        proposed_amount: null,
        signed_amount: null,
        probability: 50,
        won_at: null,
        lost_at: null,
      },
      {
        ...base,
        id: "opportunity-b",
        company_id: "company-b",
        owner_id: ownerId,
        stage_id: "won",
        venue_id: "venue-a",
        offer_id: "offer-a",
        campaign_id: "campaign-a",
        source: "manual",
        estimated_amount: 7_500,
        proposed_amount: 8_000,
        signed_amount: 8_000,
        probability: 100,
        won_at: repliedAt,
        lost_at: null,
      },
    ] as AnalyticsDataset["opportunities"],
    stages: [
      { ...base, id: "open", key: "engaged", label: "Engagé", category: "open" },
      { ...base, id: "won", key: "won", label: "Gagné", category: "won" },
    ] as AnalyticsDataset["stages"],
    appointments: [
      { ...base, id: "appointment", company_id: "company-a", owner_id: ownerId },
    ] as AnalyticsDataset["appointments"],
    proposals: [
      { ...base, id: "proposal", opportunity_id: "opportunity-b", amount: 8_000 },
    ] as AnalyticsDataset["proposals"],
    providerJobs: [
      {
        ...base,
        id: "job",
        entity_id: "company-a",
        job_type: "company_enrichment",
        status: "completed",
        estimated_cost: 4,
        completed_at: repliedAt,
      },
    ] as AnalyticsDataset["providerJobs"],
    tasks: [],
    mailboxes: [{ ...base, id: "mailbox-a", status: "connected" }] as AnalyticsDataset["mailboxes"],
    profiles: [{ id: ownerId, full_name: "Propriétaire", email: "owner@surfce.test" }],
    venues: [{ id: "venue-a", name: "Lieu A" }],
    offers: [{ id: "offer-a", name: "Offre A" }],
  };
}

const filters = analyticsFiltersSchema.parse({ start: "2026-07-01", end: "2026-07-31" });

describe("Phase 8 analytics", () => {
  it("calculates the 17 required measures with explicit sources", () => {
    const report = buildAnalyticsReport(dataset(), filters);
    expect(report.metrics).toHaveLength(17);
    expect(report.metrics.every((item) => item.definition && item.source)).toBe(true);
    expect(report.metrics.find((item) => item.key === "revenue")?.value).toBe(8_000);
    expect(report.metrics.find((item) => item.key === "weighted_revenue")?.value).toBe(5_000);
    expect(report.metrics.find((item) => item.key === "avg_response_delay")?.value).toBe(4);
  });

  it("keeps funnel rates tied to the previous visible denominator", () => {
    const report = buildAnalyticsReport(dataset(), filters);
    const replies = report.funnel.find((step) => step.key === "replies");
    expect(replies).toMatchObject({ value: 1, denominator: 2, rate: 50 });
    expect(report.funnel[0]).toMatchObject({ denominator: null, rate: null });
  });

  it("applies company dimensions coherently to downstream measures", () => {
    const report = buildAnalyticsReport(dataset(), { ...filters, sector: "Conseil" });
    expect(report.metrics.find((item) => item.key === "prospects")?.value).toBe(1);
    expect(report.metrics.find((item) => item.key === "opportunities")?.value).toBe(1);
    expect(report.metrics.find((item) => item.key === "revenue")?.value).toBe(0);
    expect(report.metrics.find((item) => item.key === "messages")?.value).toBe(1);
  });

  it("exports only the fixed analytics whitelist and escapes CSV content", () => {
    const report = buildAnalyticsReport(dataset(), filters);
    report.metrics[0]!.definition = 'Valeur, dite "sourcée"';
    const csv = reportToCsv(report);
    expect(csv.startsWith(`\uFEFF${ANALYTICS_EXPORT_COLUMNS.join(",")}`)).toBe(true);
    expect(csv).toContain('"Valeur, dite ""sourcée"""');
    expect(csv).not.toContain("email");
    expect(csv.split("\r\n")).toHaveLength(19);
  });

  it("rejects inverted periods and periods longer than one year", () => {
    expect(
      analyticsFiltersSchema.safeParse({ start: "2026-07-31", end: "2026-07-01" }).success,
    ).toBe(false);
    expect(
      analyticsFiltersSchema.safeParse({ start: "2024-01-01", end: "2026-01-01" }).success,
    ).toBe(false);
  });
});
