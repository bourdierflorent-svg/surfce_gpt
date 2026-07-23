import { describe, expect, it } from "vitest";

import {
  createAppointmentRequestSchema,
  createOpportunityFromThreadRequestSchema,
  createOpportunityRequestSchema,
  moveOpportunityStageRequestSchema,
} from "@/features/opportunities/schemas";
import { summarizePipeline } from "@/features/opportunities/server/queries";
import type { OpportunityListItem } from "@/features/opportunities/types";
import type { OpportunityStageRow } from "@/types/database";

const stage: OpportunityStageRow = {
  id: "81000000-0000-4000-8000-000000000001",
  organization_id: "10000000-0000-0000-0000-000000000001",
  key: "engaged",
  label: "Engagé",
  position: 50,
  default_probability: 45,
  category: "open",
  color: "violet",
  is_active: true,
  created_at: "2026-07-23T00:00:00.000Z",
  updated_at: "2026-07-23T00:00:00.000Z",
};

function opportunity(overrides: Partial<OpportunityListItem> = {}): OpportunityListItem {
  return {
    id: "82000000-0000-0000-0000-000000000001",
    organization_id: stage.organization_id,
    company_id: "50000000-0000-0000-0000-000000000001",
    primary_contact_id: null,
    venue_id: null,
    offer_id: null,
    campaign_id: null,
    owner_id: "00000000-0000-0000-0000-000000000001",
    stage_id: stage.id,
    title: "Dossier fictif",
    probability: 45,
    estimated_amount: 10_000,
    proposed_amount: null,
    signed_amount: null,
    currency: "EUR",
    estimated_guests: null,
    event_type: null,
    desired_event_date: null,
    expected_close_date: null,
    source: "test",
    objections: [],
    next_action: null,
    next_action_at: null,
    loss_reason: null,
    notes: null,
    last_activity_at: "2026-07-23T00:00:00.000Z",
    won_at: null,
    lost_at: null,
    created_at: "2026-07-23T00:00:00.000Z",
    updated_at: "2026-07-23T00:00:00.000Z",
    stage,
    companyName: "Entreprise fictive",
    contactName: null,
    venueName: null,
    ownerName: "Commercial fictif",
    openTaskCount: 0,
    overdueTaskCount: 0,
    ...overrides,
  };
}

describe("Phase 7 opportunity rules", () => {
  it("calculates open, weighted and won revenue without double counting", () => {
    const wonStage = { ...stage, id: "won", category: "won" as const, default_probability: 100 };
    const summary = summarizePipeline([
      opportunity(),
      opportunity({
        id: "82000000-0000-0000-0000-000000000002",
        proposed_amount: 20_000,
        probability: 60,
      }),
      opportunity({
        id: "82000000-0000-0000-0000-000000000003",
        stage: wonStage,
        stage_id: wonStage.id,
        probability: 100,
        signed_amount: 7_500,
      }),
    ]);
    expect(summary.openAmount).toBe(30_000);
    expect(summary.weightedAmount).toBe(16_500);
    expect(summary.wonAmount).toBe(7_500);
  });

  it("validates a complete opportunity and the venue-offer dependency", () => {
    const valid = {
      companyId: "50000000-0000-4000-8000-000000000001",
      stageId: stage.id,
      title: "Séminaire fictif",
      currency: "eur",
      objections: [],
    };
    expect(createOpportunityRequestSchema.parse(valid).currency).toBe("EUR");
    expect(
      createOpportunityRequestSchema.safeParse({
        ...valid,
        offerId: "40000000-0000-4000-8000-000000000001",
      }).success,
    ).toBe(false);
  });

  it("requires a loss reason when the destination is handled by the service", () => {
    expect(
      moveOpportunityStageRequestSchema.safeParse({
        stageId: stage.id,
        lossReason: "Budget annulé",
      }).success,
    ).toBe(true);
  });

  it("rejects invalid appointment chronology", () => {
    expect(
      createAppointmentRequestSchema.safeParse({
        title: "Rendez-vous",
        startsAt: "2026-07-24T12:00:00.000Z",
        endsAt: "2026-07-24T11:00:00.000Z",
      }).success,
    ).toBe(false);
  });

  it("validates inbox automation prefill", () => {
    expect(
      createOpportunityFromThreadRequestSchema.safeParse({
        title: "Afterwork fictif",
        estimatedGuests: 35,
        desiredEventDate: "2026-09-18",
        nextAction: "Qualifier le budget",
      }).success,
    ).toBe(true);
  });
});
