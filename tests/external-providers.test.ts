import { afterEach, describe, expect, it, vi } from "vitest";

import { HunterContactVerificationProvider } from "@/providers/contacts/hunter";
import { getContactVerificationProvider } from "@/providers/contacts";
import { getCompanyRegistryProvider } from "@/providers/registries";
import { SireneCompanyRegistryProvider } from "@/providers/registries/sirene";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("Hunter contact verification provider", () => {
  it("authenticates by header and maps Hunter statuses without exposing the address in its reference", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            status: "accept_all",
            score: 72,
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const provider = new HunterContactVerificationProvider("hunter-secret", fetcher);
    const result = await provider.verifyEmail({
      contactId: "contact-1",
      fullName: "Florent Bourdier",
      email: "florent@example.com",
      companyDomain: "example.com",
    });

    expect(result).toMatchObject({
      provider: "hunter",
      status: "risky",
      confidence: 0.72,
      mock: false,
    });
    expect(result.externalReference).not.toContain("florent@example.com");
    const [target, init] = fetcher.mock.calls[0]!;
    expect(String(target)).toContain("email=florent%40example.com");
    expect(new Headers(init?.headers).get("X-API-KEY")).toBe("hunter-secret");
    expect(String(target)).not.toContain("hunter-secret");
  });

  it("fails closed while Hunter is still processing", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 202 }));
    const provider = new HunterContactVerificationProvider("hunter-secret", fetcher);

    await expect(
      provider.verifyEmail({
        contactId: "contact-1",
        fullName: "Florent Bourdier",
        email: "florent@example.com",
        companyDomain: "example.com",
      }),
    ).rejects.toThrow("traite encore");
  });

  it("loads Hunter only when the selector and secret are complete", () => {
    vi.stubEnv("CONTACT_VERIFICATION_PROVIDER", "hunter");
    vi.stubEnv("HUNTER_API_KEY", "hunter-secret");
    expect(getContactVerificationProvider()).toBeInstanceOf(HunterContactVerificationProvider);
  });
});

describe("INSEE SIRENE company registry provider", () => {
  it("uses the official secret header and normalizes an establishment record", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          etablissement: {
            siret: "55210055400013",
            siren: "552100554",
            activitePrincipaleEtablissement: "58.11Z",
            adresseEtablissement: { libelleCommuneEtablissement: "PARIS 8E ARRONDISSEMENT" },
            uniteLegale: {
              siren: "552100554",
              denominationUniteLegale: "EXEMPLE EDITIONS",
              categorieJuridiqueUniteLegale: "5710",
              activitePrincipaleUniteLegale: "58.11Z",
            },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const provider = new SireneCompanyRegistryProvider(
      "https://api.insee.fr/api-sirene/3.11",
      "sirene-secret",
      fetcher,
    );
    const result = await provider.verify({
      companyId: "company-1",
      legalName: "Exemple Editions",
      siren: null,
      primarySiret: "552 100 554 00013",
      sector: "Edition",
      city: "Paris",
    });

    expect(result.provider).toBe("sirene");
    expect(result.legalName.value).toBe("EXEMPLE EDITIONS");
    expect(result.siren.value).toBe("552100554");
    expect(result.primarySiret.value).toBe("55210055400013");
    expect(result.legalForm.value).toBe("5710");
    expect(result.activityCode.value).toBe("58.11Z");
    expect(result.headquartersCity.value).toBe("PARIS 8E ARRONDISSEMENT");
    expect(result.sector.value).toBeNull();
    const [target, init] = fetcher.mock.calls[0]!;
    expect(String(target)).toBe("https://api.insee.fr/api-sirene/3.11/siret/55210055400013");
    expect(new Headers(init?.headers).get("X-INSEE-Api-Key-Integration")).toBe("sirene-secret");
    expect(String(target)).not.toContain("sirene-secret");
  });

  it("rejects ambiguous lookups without a valid SIREN or SIRET", async () => {
    const provider = new SireneCompanyRegistryProvider(
      "https://api.insee.fr/api-sirene/3.11",
      "sirene-secret",
      vi.fn<typeof fetch>(),
    );
    await expect(
      provider.verify({
        companyId: "company-1",
        legalName: "Entreprise sans identifiant",
        siren: null,
        primarySiret: null,
        sector: null,
        city: "Paris",
      }),
    ).rejects.toThrow("sans ambiguïté");
  });

  it("loads SIRENE aliases only with an official base URL and a secret", () => {
    vi.stubEnv("COMPANY_REGISTRY_PROVIDER", "insee");
    vi.stubEnv("SIRENE_API_BASE_URL", "https://api.insee.fr/api-sirene/3.11");
    vi.stubEnv("SIRENE_API_KEY", "sirene-secret");
    expect(getCompanyRegistryProvider()).toBeInstanceOf(SireneCompanyRegistryProvider);
  });
});
