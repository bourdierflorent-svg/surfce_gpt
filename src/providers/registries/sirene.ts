import { z } from "zod";

import type {
  CompanyRegistryInput,
  CompanyRegistryProvider,
  CompanyRegistryResult,
  SourcedValue,
} from "./types";

const REQUEST_TIMEOUT_MS = 15_000;
const SIRENE_HOSTNAME = "api.insee.fr";

const optionalText = z.string().nullable().optional();
const unitSchema = z.object({
  siren: optionalText,
  denominationUniteLegale: optionalText,
  denominationUsuelle1UniteLegale: optionalText,
  categorieJuridiqueUniteLegale: optionalText,
  activitePrincipaleUniteLegale: optionalText,
});
const establishmentSchema = z.object({
  siret: optionalText,
  siren: optionalText,
  activitePrincipaleEtablissement: optionalText,
  uniteLegale: unitSchema.optional(),
  adresseEtablissement: z
    .object({
      libelleCommuneEtablissement: optionalText,
      libelleCommuneEtrangerEtablissement: optionalText,
    })
    .optional(),
});
const sirenResponseSchema = z.object({ uniteLegale: unitSchema });
const siretResponseSchema = z.object({ etablissement: establishmentSchema });

function text(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function digits(value: string | null, length: number): string | null {
  if (!value) return null;
  const normalized = value.replace(/\D/g, "");
  return normalized.length === length ? normalized : null;
}

function readBaseUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("SIRENE_API_BASE_URL doit être une URL HTTPS INSEE valide.");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== SIRENE_HOSTNAME ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      "SIRENE_API_BASE_URL doit pointer vers https://api.insee.fr sans identifiants.",
    );
  }
  return parsed.toString().replace(/\/$/, "");
}

function sourced<T>(input: {
  value: T | null;
  externalReference: string;
  sourceUrl: string;
  collectedAt: string;
  confidence: number;
  isInferred?: boolean;
}): SourcedValue<T> {
  return {
    value: input.value,
    provider: "sirene",
    externalReference: input.externalReference,
    sourceUrl: input.sourceUrl,
    collectedAt: input.collectedAt,
    lastVerifiedAt: input.collectedAt,
    confidence: input.value === null ? 0 : input.confidence,
    isInferred: input.isInferred ?? false,
  };
}

function providerError(status: number): Error {
  if (status === 401 || status === 403) {
    return new Error("La clé API SIRENE est invalide, révoquée ou non autorisée.");
  }
  if (status === 404) return new Error("Aucune entreprise SIRENE ne correspond à cet identifiant.");
  if (status === 429) return new Error("Le quota SIRENE est temporairement atteint.");
  if (status >= 500) return new Error("L’API SIRENE est temporairement indisponible.");
  return new Error(`L’API SIRENE a refusé la vérification (statut ${status}).`);
}

export class SireneCompanyRegistryProvider implements CompanyRegistryProvider {
  readonly name = "sirene";
  readonly estimatedCost = 0;
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly apiKey: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    this.baseUrl = readBaseUrl(baseUrl);
    if (!apiKey.trim()) throw new Error("SIRENE_API_KEY est requise pour activer SIRENE.");
  }

  async verify(input: CompanyRegistryInput): Promise<CompanyRegistryResult> {
    const siret = digits(input.primarySiret, 14);
    const siren = digits(input.siren, 9);
    if (!siret && !siren) {
      throw new Error(
        "Un SIREN ou un SIRET valide est requis pour interroger SIRENE sans ambiguïté.",
      );
    }

    const kind = siret ? "siret" : "siren";
    const identifier = siret ?? siren!;
    const target = new URL(`${this.baseUrl}/${kind}/${identifier}`);
    const response = await this.fetcher(target, {
      headers: {
        accept: "application/json",
        "X-INSEE-Api-Key-Integration": this.apiKey,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw providerError(response.status);

    const payload: unknown = await response.json();
    const establishment = kind === "siret" ? siretResponseSchema.safeParse(payload) : null;
    const unitResult = kind === "siren" ? sirenResponseSchema.safeParse(payload) : null;
    if (establishment && !establishment.success) {
      throw new Error("La réponse établissement SIRENE est incomplète ou incompatible.");
    }
    if (unitResult && !unitResult.success) {
      throw new Error("La réponse entreprise SIRENE est incomplète ou incompatible.");
    }

    const establishmentValue = establishment?.success ? establishment.data.etablissement : null;
    const unit =
      establishmentValue?.uniteLegale ?? (unitResult?.success ? unitResult.data.uniteLegale : null);
    if (!unit) throw new Error("La réponse SIRENE ne contient aucune unité légale exploitable.");

    const collectedAt = new Date().toISOString();
    const sourceUrl = target.toString();
    const externalReference = `sirene:${kind}:${identifier}`;
    const legalName = text(unit.denominationUniteLegale ?? unit.denominationUsuelle1UniteLegale);
    const resolvedSiren = digits(text(unit.siren ?? establishmentValue?.siren), 9);
    const resolvedSiret = digits(text(establishmentValue?.siret), 14);
    const activityCode = text(
      unit.activitePrincipaleUniteLegale ?? establishmentValue?.activitePrincipaleEtablissement,
    );
    const headquartersCity = text(
      establishmentValue?.adresseEtablissement?.libelleCommuneEtablissement ??
        establishmentValue?.adresseEtablissement?.libelleCommuneEtrangerEtablissement,
    );
    const common = { externalReference, sourceUrl, collectedAt };

    return {
      provider: this.name,
      legalName: sourced({ value: legalName, confidence: 0.99, ...common }),
      siren: sourced({ value: resolvedSiren, confidence: 1, ...common }),
      primarySiret: sourced({ value: resolvedSiret, confidence: 1, ...common }),
      legalForm: sourced({
        value: text(unit.categorieJuridiqueUniteLegale),
        confidence: 0.99,
        ...common,
      }),
      activityCode: sourced({ value: activityCode, confidence: 0.99, ...common }),
      sector: sourced<string>({ value: null, confidence: 0, ...common }),
      headquartersCity: sourced({ value: headquartersCity, confidence: 0.99, ...common }),
    };
  }
}
