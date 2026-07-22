import type { CompanyRow, DataSourceRow } from "@/types/database";
import type { PersonaOutput } from "@/features/personas/schemas";

export interface PersonaGenerationInput {
  company: CompanyRow;
  sources: DataSourceRow[];
}

export interface VenueRationaleInput {
  companyName: string;
  venueName: string;
  offerName: string;
  score: number;
  reasons: string[];
  risks: string[];
}

export interface VenueRationale {
  reasons: string[];
  risks: string[];
  recommendedPitch: string;
}

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  generatePersona(input: PersonaGenerationInput): Promise<PersonaOutput>;
  generateVenueRationale(input: VenueRationaleInput): Promise<VenueRationale>;
}
