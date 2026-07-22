import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppAuthContext } from "@/types/auth";

import type { Venue, VenueDetail, VenueListItem, VenueOffer, VenueStatusFilter } from "../types";

const previewVenues: Venue[] = [
  {
    id: "30000000-0000-0000-0000-000000000001",
    organization_id: "10000000-0000-0000-0000-000000000001",
    name: "Little Room",
    slug: "little-room",
    venue_type: "Club privé",
    description: "Fiche de démonstration à compléter avec les informations validées.",
    address_line1: null,
    address_line2: null,
    postal_code: null,
    city: "Paris",
    country_code: "FR",
    latitude: null,
    longitude: null,
    location: null,
    district: null,
    standing: "Premium",
    atmosphere: "Intimiste et nocturne",
    capacity_seated: null,
    capacity_standing: null,
    minimum_guests: 20,
    minimum_spend: null,
    currency: "EUR",
    features: { bar: true, cocktails: true, dj: true },
    event_types: ["Afterwork", "Soirée clients"],
    target_sectors: ["Conseil", "Communication"],
    opening_rules: { note: "Disponibilités à confirmer" },
    internal_contact: null,
    commercial_terms: "Conditions commerciales à confirmer.",
    is_active: true,
    created_at: "2026-07-22T00:00:00.000Z",
    updated_at: "2026-07-22T00:00:00.000Z",
  },
  {
    id: "30000000-0000-0000-0000-000000000002",
    organization_id: "10000000-0000-0000-0000-000000000001",
    name: "Deflower",
    slug: "deflower",
    venue_type: "Club",
    description: "Fiche de démonstration à compléter avec les informations validées.",
    address_line1: null,
    address_line2: null,
    postal_code: null,
    city: "Paris",
    country_code: "FR",
    latitude: null,
    longitude: null,
    location: null,
    district: null,
    standing: "Premium",
    atmosphere: "Énergique et scénique",
    capacity_seated: null,
    capacity_standing: null,
    minimum_guests: 30,
    minimum_spend: null,
    currency: "EUR",
    features: { bar: true, dj: true, stage: true, sound: true },
    event_types: ["Showcase", "Lancement de produit"],
    target_sectors: ["Musique", "Mode"],
    opening_rules: { note: "Disponibilités à confirmer" },
    internal_contact: null,
    commercial_terms: "Conditions commerciales à confirmer.",
    is_active: true,
    created_at: "2026-07-22T00:00:00.000Z",
    updated_at: "2026-07-22T00:00:00.000Z",
  },
];

const previewOffers: VenueOffer[] = [
  {
    id: "40000000-0000-0000-0000-000000000001",
    organization_id: "10000000-0000-0000-0000-000000000001",
    venue_id: "30000000-0000-0000-0000-000000000001",
    name: "Afterwork 20 à 50 personnes",
    slug: "afterwork-20-50",
    event_type: "Afterwork",
    short_description: "Un format compact pour réunir une équipe ou des clients.",
    description: "Offre de démonstration à valider.",
    min_guests: 20,
    max_guests: 50,
    minimum_budget: null,
    indicative_price: null,
    currency: "EUR",
    duration_minutes: 180,
    available_days: [2, 3, 4],
    available_time_start: null,
    available_time_end: null,
    inclusions: ["Espace réservé", "Accueil dédié"],
    options: ["Cocktail dînatoire", "DJ"],
    commission_rate: null,
    terms: "Conditions commerciales à confirmer.",
    valid_from: null,
    valid_until: null,
    is_active: true,
    created_at: "2026-07-22T00:00:00.000Z",
    updated_at: "2026-07-22T00:00:00.000Z",
  },
];

interface ListVenuesOptions {
  query?: string;
  status?: VenueStatusFilter;
}

export async function listVenues(
  context: AppAuthContext,
  options: ListVenuesOptions = {},
): Promise<VenueListItem[]> {
  const status = options.status ?? "active";
  const normalizedQuery = options.query?.trim().toLocaleLowerCase("fr") ?? "";

  if (context.isPreview) {
    return previewVenues
      .filter((venue) => {
        const matchesStatus =
          status === "all" || (status === "active" ? venue.is_active : !venue.is_active);
        const matchesQuery =
          !normalizedQuery ||
          `${venue.name} ${venue.venue_type} ${venue.city}`
            .toLocaleLowerCase("fr")
            .includes(normalizedQuery);
        return matchesStatus && matchesQuery;
      })
      .map((venue) => {
        const offers = previewOffers.filter((offer) => offer.venue_id === venue.id);
        return {
          ...venue,
          offerCount: offers.length,
          activeOfferCount: offers.filter((offer) => offer.is_active).length,
        };
      });
  }

  const supabase = await createSupabaseServerClient();
  let venueQuery = supabase
    .from("venues")
    .select("*")
    .eq("organization_id", context.organization.id)
    .order("name");

  if (status !== "all") {
    venueQuery = venueQuery.eq("is_active", status === "active");
  }

  if (options.query?.trim()) {
    venueQuery = venueQuery.ilike("name", `%${options.query.trim()}%`);
  }

  const [{ data: venues, error: venuesError }, { data: offers, error: offersError }] =
    await Promise.all([
      venueQuery,
      supabase
        .from("venue_offers")
        .select("venue_id, is_active")
        .eq("organization_id", context.organization.id),
    ]);

  if (venuesError || offersError) {
    throw new Error("Impossible de charger les établissements.");
  }

  return (venues ?? []).map((venue) => {
    const venueOffers = (offers ?? []).filter((offer) => offer.venue_id === venue.id);
    return {
      ...venue,
      offerCount: venueOffers.length,
      activeOfferCount: venueOffers.filter((offer) => offer.is_active).length,
    };
  });
}

export async function getVenueDetail(
  context: AppAuthContext,
  venueId: string,
): Promise<VenueDetail | null> {
  if (context.isPreview) {
    const venue = previewVenues.find((item) => item.id === venueId);
    if (!venue) return null;
    return {
      ...venue,
      offers: previewOffers.filter((offer) => offer.venue_id === venueId),
      assets: [],
    };
  }

  const supabase = await createSupabaseServerClient();
  const [venueResult, offersResult, assetsResult] = await Promise.all([
    supabase
      .from("venues")
      .select("*")
      .eq("id", venueId)
      .eq("organization_id", context.organization.id)
      .maybeSingle(),
    supabase
      .from("venue_offers")
      .select("*")
      .eq("venue_id", venueId)
      .eq("organization_id", context.organization.id)
      .order("is_active", { ascending: false })
      .order("name"),
    supabase
      .from("venue_assets")
      .select("*")
      .eq("venue_id", venueId)
      .eq("organization_id", context.organization.id)
      .order("sort_order")
      .order("created_at"),
  ]);

  if (venueResult.error || offersResult.error || assetsResult.error) {
    throw new Error("Impossible de charger cet établissement.");
  }

  if (!venueResult.data) return null;

  const assets = await Promise.all(
    (assetsResult.data ?? []).map(async (asset) => {
      const { data } = await supabase.storage
        .from("venue-assets")
        .createSignedUrl(asset.storage_path, 60 * 60);
      return { ...asset, signedUrl: data?.signedUrl ?? null };
    }),
  );

  return {
    ...venueResult.data,
    offers: offersResult.data ?? [],
    assets,
  };
}

export async function getOffer(
  context: AppAuthContext,
  venueId: string,
  offerId: string,
): Promise<VenueOffer | null> {
  if (context.isPreview) {
    return (
      previewOffers.find((offer) => offer.id === offerId && offer.venue_id === venueId) ?? null
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("venue_offers")
    .select("*")
    .eq("id", offerId)
    .eq("venue_id", venueId)
    .eq("organization_id", context.organization.id)
    .maybeSingle();

  if (error) throw new Error("Impossible de charger cette offre.");
  return data;
}
