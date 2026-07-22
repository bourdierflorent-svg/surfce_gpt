export interface SourcedValue<T> {
  value: T | null;
  provider: string;
  externalReference?: string;
  sourceUrl?: string;
  collectedAt: string;
  lastVerifiedAt?: string;
  confidence: number;
  isInferred: boolean;
}

export interface CompanyRegistryInput {
  companyId: string;
  legalName: string;
  siren: string | null;
  primarySiret: string | null;
  sector: string | null;
  city: string;
}

export interface CompanyRegistryResult {
  provider: string;
  legalName: SourcedValue<string>;
  siren: SourcedValue<string>;
  primarySiret: SourcedValue<string>;
  legalForm: SourcedValue<string>;
  activityCode: SourcedValue<string>;
  sector: SourcedValue<string>;
  headquartersCity: SourcedValue<string>;
}

export interface CompanyRegistryProvider {
  readonly name: string;
  readonly estimatedCost: number;
  verify(input: CompanyRegistryInput): Promise<CompanyRegistryResult>;
}
