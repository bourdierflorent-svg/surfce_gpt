import type { SourcedValue } from "@/providers/registries";

export interface WebsiteEnrichmentInput {
  companyId: string;
  legalName: string;
  tradeName: string | null;
  websiteUrl: string | null;
  domain: string | null;
  sector: string | null;
  description: string | null;
}

export interface WebsiteSignal {
  type: "service" | "culture" | "event" | "audience";
  label: string;
  confidence: number;
  sourceReference: string;
}

export interface WebsiteEnrichmentResult {
  provider: string;
  summary: SourcedValue<string>;
  signals: WebsiteSignal[];
  pagesInspected: Array<{
    kind: "home" | "contact" | "about";
    url: string;
    status: "mocked" | "unavailable";
  }>;
  warnings: string[];
}

export interface WebsiteEnrichmentProvider {
  readonly name: string;
  readonly estimatedCost: number;
  analyze(input: WebsiteEnrichmentInput): Promise<WebsiteEnrichmentResult>;
}
