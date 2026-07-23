import type { CompanyRow, DataSourceRow } from "@/types/database";
import type { PersonaOutput } from "@/features/personas/schemas";
import type { EmailGenerationOutput } from "@/features/messages/schemas";

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

export interface VerifiedPersonalizationFact {
  fact: string;
  sourceReference: string;
}

export interface EmailGenerationInput {
  contactFirstName: string;
  contactJobTitle: string | null;
  companyName: string;
  companySector: string | null;
  venueName: string | null;
  offerName: string | null;
  senderName: string;
  tone: string;
  objective: string;
  language: string;
  stepPosition: number;
  verifiedFacts: VerifiedPersonalizationFact[];
}

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  generatePersona(input: PersonaGenerationInput): Promise<PersonaOutput>;
  generateVenueRationale(input: VenueRationaleInput): Promise<VenueRationale>;
  generateEmailVariants(input: EmailGenerationInput): Promise<EmailGenerationOutput>;
}
