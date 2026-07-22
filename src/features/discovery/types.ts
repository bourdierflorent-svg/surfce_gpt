import type { PlaceCandidate, PlaceSearchResult } from "@/providers/places";

export interface DiscoveryCandidate extends PlaceCandidate {
  importedCompanyId: string | null;
}

export interface DiscoverySearchResponse extends Omit<PlaceSearchResult, "results"> {
  results: DiscoveryCandidate[];
}

export interface ImportResult {
  companyId: string;
  wasCreated: boolean;
  matchReason: string;
}
