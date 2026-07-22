import { MockPlacesProvider } from "./mock";
import type { PlaceSearchProvider } from "./types";

const mockPlacesProvider = new MockPlacesProvider();

export function getPlacesProvider(): PlaceSearchProvider {
  return mockPlacesProvider;
}

export type { PlaceCandidate, PlaceSearchInput, PlaceSearchResult } from "./types";
