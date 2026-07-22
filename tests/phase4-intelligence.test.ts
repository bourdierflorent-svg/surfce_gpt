import { describe, expect, it } from "vitest";

import { scoreVenueOffer } from "@/features/matching/scoring";
import { personaOutputSchema, type PersonaOutput } from "@/features/personas/schemas";
import { MockAiProvider } from "@/providers/ai/mock";
import { MockWebsiteEnrichmentProvider } from "@/providers/enrichment/mock-website";
import { MockCompanyRegistryProvider } from "@/providers/registries/mock";
import type { CompanyRow, DataSourceRow } from "@/types/database";
import type { Venue, VenueOffer } from "@/features/venues/types";

const company = {
  id: "50000000-0000-0000-0000-000000000001",
  legal_name: "Studio fictif",
  trade_name: "Studio fictif",
  sector: "Communication",
  subsector: "Agence de communication",
  employee_range: "11–50",
  city: "Paris",
  description: "Société de démonstration.",
  status: "qualified",
  do_not_contact: false,
} as unknown as CompanyRow;

const venue = {
  id: "30000000-0000-0000-0000-000000000001",
  name: "Little Room",
  city: "Paris",
  target_sectors: ["Communication"],
  is_active: true,
} as unknown as Venue;

const offer = {
  id: "40000000-0000-0000-0000-000000000001",
  venue_id: venue.id,
  name: "Afterwork 20 à 50 personnes",
  event_type: "Afterwork",
  min_guests: 20,
  max_guests: 50,
  minimum_budget: null,
  is_active: true,
} as unknown as VenueOffer;

const persona: PersonaOutput = personaOutputSchema.parse({
  company_type: "Agence de communication",
  summary: "Hypothèse commerciale strictement fondée sur les données disponibles.",
  estimated_size: { label: "11–50", confidence: 0.72 },
  event_maturity: { level: "high", confidence: 0.68 },
  probable_needs: [
    { type: "afterwork", confidence: 0.82, reason: "Format plausible à confirmer." },
  ],
  likely_contact_roles: ["Office Manager"],
  recommended_event_types: ["Afterwork"],
  estimated_guest_range: { min: 10, max: 60, confidence: 0.54 },
  estimated_budget_range: { min: null, max: null, currency: "EUR", confidence: 0 },
  fit_score: 84,
  confidence: 0.68,
  risks: ["Budget inconnu"],
  evidence: [
    {
      claim: "Le secteur soutient une hypothèse d’afterwork.",
      source_type: "mock_website",
      source_reference: "source-1",
      confidence: 0.7,
    },
  ],
});

describe("Phase 4 persona", () => {
  it("accepts explicit nulls for unknown budget values", () => {
    expect(persona.estimated_budget_range).toEqual({
      min: null,
      max: null,
      currency: "EUR",
      confidence: 0,
    });
  });

  it("rejects invalid confidence and malformed output", () => {
    expect(personaOutputSchema.safeParse({ ...persona, confidence: 1.2 }).success).toBe(false);
  });

  it("generates a sourced mock persona without inventing a budget", async () => {
    const source = {
      id: "source-1",
      provider: "mock_places",
      field_name: "record",
      confidence: 0.78,
      is_inferred: false,
    } as unknown as DataSourceRow;
    const result = await new MockAiProvider().generatePersona({ company, sources: [source] });
    expect(result.estimated_budget_range.min).toBeNull();
    expect(result.estimated_budget_range.max).toBeNull();
    expect(result.evidence[0]?.source_reference).toBe("source-1");
  });
});

describe("Phase 4 deterministic matching", () => {
  it("explains every weighted component and totals the score", () => {
    const match = scoreVenueOffer(company, persona, venue, offer);
    expect(match?.scoreBreakdown).toEqual({
      event_fit: 30,
      capacity_budget_fit: 16,
      distance_fit: 10,
      brand_fit: 15,
      availability_fit: 7,
      history_fit: 5,
    });
    expect(match?.score).toBe(83);
    expect(match?.risks).toContain("Budget non confirmé");
  });

  it("applies hard exclusions for capacity and opposition", () => {
    expect(scoreVenueOffer(company, persona, venue, { ...offer, max_guests: 5 })).toBeNull();
    expect(scoreVenueOffer({ ...company, do_not_contact: true }, persona, venue, offer)).toBeNull();
  });
});

describe("Phase 4 mock providers", () => {
  it("returns null registry identifiers when they are unknown", async () => {
    const result = await new MockCompanyRegistryProvider().verify({
      companyId: company.id,
      legalName: company.legal_name,
      siren: null,
      primarySiret: null,
      sector: company.sector,
      city: company.city,
    });
    expect(result.siren.value).toBeNull();
    expect(result.primarySiret.value).toBeNull();
  });

  it("labels website analysis as mocked and never fetched", async () => {
    const result = await new MockWebsiteEnrichmentProvider().analyze({
      companyId: company.id,
      legalName: company.legal_name,
      tradeName: company.trade_name,
      websiteUrl: "https://studio.example",
      domain: "studio.example",
      sector: company.sector,
      description: company.description,
    });
    expect(result.pagesInspected.every((page) => page.status === "mocked")).toBe(true);
    expect(result.warnings.join(" ")).toContain("simulée");
  });
});
