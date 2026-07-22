import type { Database } from "@/types/database";

export type Venue = Database["public"]["Tables"]["venues"]["Row"];
export type VenueOffer = Database["public"]["Tables"]["venue_offers"]["Row"];
export type VenueAsset = Database["public"]["Tables"]["venue_assets"]["Row"];

export interface VenueListItem extends Venue {
  activeOfferCount: number;
  offerCount: number;
}

export interface VenueAssetWithUrl extends VenueAsset {
  signedUrl: string | null;
}

export interface VenueDetail extends Venue {
  assets: VenueAssetWithUrl[];
  offers: VenueOffer[];
}

export type VenueStatusFilter = "active" | "inactive" | "all";
