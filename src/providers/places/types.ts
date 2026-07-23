import type { GeoPoint, PolygonRing } from "@/lib/geo/geometry";

export type SourceConfidence = "low" | "medium" | "high";

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

export type DiscoveryMode = "radius" | "polygon";

export interface PlaceSearchFilters {
  hasWebsite?: boolean;
  hasPhone?: boolean;
  employeeRange?: string;
}

export interface PlaceSearchInput {
  query?: string;
  category?: string;
  city?: string;
  district?: string;
  mode: DiscoveryMode;
  center?: GeoPoint;
  radiusMeters?: number;
  polygon?: PolygonRing;
  filters?: PlaceSearchFilters;
}

export interface PlaceCandidate {
  externalId: string;
  provider: "mock_places";
  legalName: string;
  tradeName: string;
  normalizedName: string;
  sector: string;
  subsector: string;
  description: string;
  websiteUrl: string | null;
  domain: string | null;
  phone: string | null;
  genericEmail: string | null;
  employeeRange: string;
  addressLine1: string;
  postalCode: string;
  city: string;
  countryCode: "FR";
  district: string;
  location: GeoPoint;
  potentialScore: number;
  dataQualityScore: number;
  tags: string[];
  collectedAt: string;
  confidence: number;
  distanceMeters?: number;
}

export interface PlaceSearchResult {
  provider: "mock_places";
  results: PlaceCandidate[];
  total: number;
  estimatedExternalCost: 0;
  isFictional: true;
}

export interface PlaceSearchProvider {
  readonly name: string;
  search(input: PlaceSearchInput): Promise<PlaceSearchResult>;
  getDetails(externalId: string): Promise<PlaceCandidate | null>;
}
