import { describe, expect, it } from "vitest";

import { offerFormSchema, slugify, venueFormSchema } from "@/features/venues/schemas";

function validVenueInput() {
  return {
    name: "  Le Salon Étoilé  ",
    venue_type: "Lieu événementiel",
    description: "",
    address_line1: "",
    address_line2: "",
    postal_code: "75008",
    city: "Paris",
    country_code: "fr",
    latitude: "48.8701",
    longitude: "2.3082",
    district: "8e",
    standing: "Premium",
    atmosphere: "Feutrée",
    capacity_seated: "80",
    capacity_standing: "120",
    minimum_guests: "20",
    minimum_spend: "5000",
    currency: "eur",
    features: {
      catering: true,
      bar: true,
      cocktails: false,
      terrace: false,
      stage: false,
      dj: true,
      sound: true,
      lighting: true,
      screens: false,
      cloakroom: true,
      accessible: true,
      parking: false,
      full_privatisation: true,
      partial_privatisation: true,
    },
    event_types: "Afterwork, Dîner, Afterwork",
    target_sectors: "Conseil, Tech",
    opening_note: "Du mardi au vendredi",
    internal_contact: "Florent",
    commercial_terms: "À confirmer",
    is_active: true,
  };
}

function validOfferInput() {
  return {
    name: "Afterwork signature",
    event_type: "Afterwork",
    short_description: "Format équipe et clients",
    description: "",
    min_guests: "20",
    max_guests: "50",
    minimum_budget: "1500",
    indicative_price: "2500",
    currency: "eur",
    duration_minutes: "180",
    available_days: [2, 3, 4],
    available_time_start: "18:00",
    available_time_end: "23:00",
    inclusions: "Espace réservé, Accueil",
    options: "DJ, Cocktail",
    commission_rate: "10",
    terms: "À confirmer",
    valid_from: "2026-09-01",
    valid_until: "2026-12-31",
    is_active: true,
  };
}

describe("Phase 2 venue validation", () => {
  it("normalizes structured venue values", () => {
    const result = venueFormSchema.parse(validVenueInput());
    expect(result.name).toBe("Le Salon Étoilé");
    expect(result.country_code).toBe("FR");
    expect(result.capacity_standing).toBe(120);
    expect(result.minimum_spend).toBe(5000);
    expect(result.event_types).toEqual(["Afterwork", "Dîner"]);
  });

  it("requires coordinates to be provided together", () => {
    const input = validVenueInput();
    input.longitude = "";
    const result = venueFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects a guest minimum above venue capacity", () => {
    const input = validVenueInput();
    input.minimum_guests = "150";
    const result = venueFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("generates stable URL slugs without accents", () => {
    expect(slugify("Le Salon Étoilé — Paris")).toBe("le-salon-etoile-paris");
  });
});

describe("Phase 2 offer validation", () => {
  it("normalizes budgets, guest ranges and lists", () => {
    const result = offerFormSchema.parse(validOfferInput());
    expect(result.minimum_budget).toBe(1500);
    expect(result.min_guests).toBe(20);
    expect(result.inclusions).toEqual(["Espace réservé", "Accueil"]);
  });

  it("rejects inverted guest and validity ranges", () => {
    const input = validOfferInput();
    input.min_guests = "80";
    input.valid_from = "2027-01-01";
    const result = offerFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects negative budgets and commissions over 100 percent", () => {
    const input = validOfferInput();
    input.minimum_budget = "-1";
    input.commission_rate = "101";
    const result = offerFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
