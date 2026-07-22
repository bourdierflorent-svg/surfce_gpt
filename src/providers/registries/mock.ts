import type {
  CompanyRegistryInput,
  CompanyRegistryProvider,
  CompanyRegistryResult,
  SourcedValue,
} from "./types";

function sourced<T>(
  value: T | null,
  input: CompanyRegistryInput,
  confidence: number,
): SourcedValue<T> {
  const collectedAt = new Date().toISOString();
  return {
    value,
    provider: "mock_registry",
    externalReference: `mock-registry:${input.companyId}`,
    collectedAt,
    lastVerifiedAt: collectedAt,
    confidence,
    isInferred: false,
  };
}

export class MockCompanyRegistryProvider implements CompanyRegistryProvider {
  readonly name = "mock_registry";
  readonly estimatedCost = 0;

  async verify(input: CompanyRegistryInput): Promise<CompanyRegistryResult> {
    return {
      provider: this.name,
      legalName: sourced(input.legalName, input, 0.92),
      siren: sourced(input.siren, input, input.siren ? 0.9 : 0),
      primarySiret: sourced(input.primarySiret, input, input.primarySiret ? 0.9 : 0),
      legalForm: sourced<string>(null, input, 0),
      activityCode: sourced<string>(null, input, 0),
      sector: sourced(input.sector, input, input.sector ? 0.76 : 0),
      headquartersCity: sourced(input.city, input, 0.82),
    };
  }
}
