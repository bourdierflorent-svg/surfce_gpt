import { describe, expect, it } from "vitest";

import {
  companyFormSchema,
  normalizeCompanyName,
  normalizeDomain,
} from "@/features/companies/schemas";

const validCompany = {
  legal_name: "Maison Démonstration SAS",
  trade_name: "Maison Démonstration",
  siren: "",
  primary_siret: "",
  legal_form: "SAS",
  sector: "Conseil",
  subsector: "",
  activity_code: "",
  description: "",
  website_url: "https://maison.example",
  domain: "maison.example",
  phone: "+33 1 80 00 00 00",
  generic_email: "bonjour@maison.example",
  employee_range: "11–50",
  revenue_range: "",
  address_line1: "1 rue Fictive",
  address_line2: "",
  postal_code: "75001",
  city: "Paris",
  country_code: "FR",
  district: "1er arrondissement",
  status: "qualified",
  qualification_score: "78",
  data_quality_score: "81",
  assigned_to: "",
  tags: "mock, conseil",
  do_not_contact: false,
  do_not_contact_reason: "",
};

describe("company qualification", () => {
  it("normalizes names and domains for deduplication", () => {
    expect(normalizeCompanyName("  Maison de l’Étoile & Cie  ")).toBe("maison de l etoile cie");
    expect(normalizeDomain("https://www.Maison.Example/equipe")).toBe("maison.example");
  });

  it("parses scores, tags and nullable fields", () => {
    const parsed = companyFormSchema.parse(validCompany);
    expect(parsed.qualification_score).toBe(78);
    expect(parsed.tags).toEqual(["mock", "conseil"]);
    expect(parsed.siren).toBeNull();
  });

  it("requires a reason when do-not-contact is enabled", () => {
    expect(
      companyFormSchema.safeParse({
        ...validCompany,
        do_not_contact: true,
        do_not_contact_reason: "",
      }).success,
    ).toBe(false);
  });
});
