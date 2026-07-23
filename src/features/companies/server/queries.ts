import { MOCK_PLACES } from "@/providers/places/mock";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { paginateItems, paginationResult, type PaginatedResult } from "@/lib/pagination";
import type { AppAuthContext } from "@/types/auth";
import type { CompanyRow } from "@/types/database";

import type { AssignableMember, CompanyDetail, CompanyListItem } from "../types";

const previewCompanies: CompanyRow[] = MOCK_PLACES.slice(0, 2).map((place, index) => ({
  id: `50000000-0000-0000-0000-00000000000${index + 1}`,
  organization_id: "10000000-0000-0000-0000-000000000001",
  legal_name: place.legalName,
  trade_name: place.tradeName,
  normalized_name: place.normalizedName,
  siren: null,
  primary_siret: null,
  legal_form: null,
  sector: place.sector,
  subsector: place.subsector,
  activity_code: null,
  description: place.description,
  website_url: place.websiteUrl,
  domain: place.domain,
  phone: place.phone,
  generic_email: place.genericEmail,
  linkedin_url: null,
  instagram_url: null,
  employee_range: place.employeeRange,
  revenue_range: null,
  address_line1: place.addressLine1,
  address_line2: null,
  postal_code: place.postalCode,
  city: place.city,
  country_code: place.countryCode,
  location: { type: "Point", coordinates: [place.location.longitude, place.location.latitude] },
  district: place.district,
  status: "discovered",
  qualification_score: place.potentialScore,
  data_quality_score: place.dataQualityScore,
  assigned_to: null,
  do_not_contact: false,
  do_not_contact_reason: null,
  last_verified_at: place.collectedAt,
  last_contacted_at: null,
  next_action_at: null,
  tags: place.tags,
  created_at: place.collectedAt,
  updated_at: place.collectedAt,
  deleted_at: null,
}));

interface ListCompaniesOptions {
  query?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export async function listCompanies(
  context: AppAuthContext,
  options: ListCompaniesOptions = {},
): Promise<PaginatedResult<CompanyListItem>> {
  const page = options.page ?? 1;
  const pageSize = Math.min(Math.max(options.pageSize ?? 50, 10), 100);
  if (context.isPreview) {
    const query = options.query?.trim().toLocaleLowerCase("fr") ?? "";
    const filtered = previewCompanies
      .filter(
        (company) =>
          (!query ||
            `${company.trade_name} ${company.legal_name} ${company.sector}`
              .toLocaleLowerCase("fr")
              .includes(query)) &&
          (!options.status || options.status === "all" || company.status === options.status),
      )
      .map((company) => ({ ...company, sourceProvider: "mock_places" }));
    return paginateItems(filtered, page, pageSize);
  }

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("companies")
    .select("*", { count: "exact" })
    .eq("organization_id", context.organization.id)
    .is("deleted_at", null)
    .order("qualification_score", { ascending: false, nullsFirst: false })
    .order("trade_name")
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (options.query?.trim()) query = query.ilike("normalized_name", `%${options.query.trim()}%`);
  if (options.status && options.status !== "all")
    query = query.eq("status", options.status as CompanyRow["status"]);

  const { data: companies, error, count } = await query;
  if (error) throw new Error("Impossible de charger les entreprises.");

  const ids = (companies ?? []).map((company) => company.id);
  const sources = ids.length
    ? await supabase
        .from("data_sources")
        .select("entity_id, provider")
        .eq("organization_id", context.organization.id)
        .eq("entity_type", "company")
        .eq("field_name", "record")
        .in("entity_id", ids)
    : { data: [], error: null };

  if (sources.error) throw new Error("Impossible de charger la provenance.");
  const providerByCompany = new Map(
    (sources.data ?? []).map((source) => [source.entity_id, source.provider]),
  );

  return paginationResult(
    (companies ?? []).map((company) => ({
      ...company,
      sourceProvider: providerByCompany.get(company.id) ?? null,
    })),
    count ?? 0,
    page,
    pageSize,
  );
}

export async function getCompanyDetail(
  context: AppAuthContext,
  companyId: string,
): Promise<CompanyDetail | null> {
  if (context.isPreview) {
    const company = previewCompanies.find((item) => item.id === companyId);
    if (!company) return null;
    return {
      ...company,
      locations: [],
      sources: [],
      assignedUser: null,
      latestPersona: null,
      matches: [],
      recentJobs: [],
    };
  }

  const supabase = await createSupabaseServerClient();
  const [companyResult, locationsResult, sourcesResult, personaResult, jobsResult] =
    await Promise.all([
      supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .eq("organization_id", context.organization.id)
        .is("deleted_at", null)
        .maybeSingle(),
      supabase
        .from("company_locations")
        .select("*")
        .eq("company_id", companyId)
        .eq("organization_id", context.organization.id)
        .order("is_headquarters", { ascending: false }),
      supabase
        .from("data_sources")
        .select("*")
        .eq("entity_id", companyId)
        .eq("entity_type", "company")
        .eq("organization_id", context.organization.id)
        .order("collected_at", { ascending: false }),
      supabase
        .from("personas")
        .select("*")
        .eq("company_id", companyId)
        .eq("organization_id", context.organization.id)
        .in("status", ["draft", "validated"])
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("provider_jobs")
        .select("*")
        .eq("entity_id", companyId)
        .eq("entity_type", "company")
        .eq("organization_id", context.organization.id)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  if (
    companyResult.error ||
    locationsResult.error ||
    sourcesResult.error ||
    personaResult.error ||
    jobsResult.error
  ) {
    throw new Error("Impossible de charger cette entreprise.");
  }
  if (!companyResult.data) return null;

  const matchesResult = personaResult.data
    ? await supabase
        .from("venue_matches")
        .select("*")
        .eq("company_id", companyId)
        .eq("persona_id", personaResult.data.id)
        .eq("organization_id", context.organization.id)
        .order("is_selected", { ascending: false })
        .order("score", { ascending: false })
    : { data: [], error: null };
  if (matchesResult.error) throw new Error("Impossible de charger les recommandations.");

  const venueIds = Array.from(new Set((matchesResult.data ?? []).map((match) => match.venue_id)));
  const offerIds = Array.from(
    new Set(
      (matchesResult.data ?? []).flatMap((match) => (match.offer_id ? [match.offer_id] : [])),
    ),
  );
  const [venuesResult, offersResult] = await Promise.all([
    venueIds.length
      ? supabase.from("venues").select("id, name, venue_type").in("id", venueIds)
      : Promise.resolve({ data: [], error: null }),
    offerIds.length
      ? supabase.from("venue_offers").select("id, name, event_type").in("id", offerIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (venuesResult.error || offersResult.error) {
    throw new Error("Impossible de résoudre les établissements recommandés.");
  }
  const venuesById = new Map((venuesResult.data ?? []).map((venue) => [venue.id, venue]));
  const offersById = new Map((offersResult.data ?? []).map((offer) => [offer.id, offer]));

  let assignedUser: CompanyDetail["assignedUser"] = null;
  if (companyResult.data.assigned_to) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", companyResult.data.assigned_to)
      .maybeSingle();
    assignedUser = profile
      ? { id: profile.id, fullName: profile.full_name, email: profile.email }
      : null;
  }

  return {
    ...companyResult.data,
    locations: locationsResult.data ?? [],
    sources: sourcesResult.data ?? [],
    assignedUser,
    latestPersona: personaResult.data,
    recentJobs: jobsResult.data ?? [],
    matches: (matchesResult.data ?? []).map((match) => {
      const venue = venuesById.get(match.venue_id);
      const offer = match.offer_id ? offersById.get(match.offer_id) : null;
      return {
        ...match,
        venueName: venue?.name ?? "Établissement indisponible",
        venueType: venue?.venue_type ?? "Type inconnu",
        offerName: offer?.name ?? null,
        eventType: offer?.event_type ?? null,
      };
    }),
  };
}

export async function listAssignableMembers(context: AppAuthContext): Promise<AssignableMember[]> {
  if (context.isPreview) return [];
  const supabase = await createSupabaseServerClient();
  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("organization_id", context.organization.id)
    .eq("is_active", true)
    .in("role", ["admin", "sales_manager", "sales"]);
  if (error) throw new Error("Impossible de charger les responsables commerciaux.");
  const ids = (memberships ?? []).map((membership) => membership.user_id);
  if (ids.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", ids)
    .order("full_name");
  if (profilesError) throw new Error("Impossible de charger les responsables commerciaux.");
  return (profiles ?? []).map((profile) => ({
    id: profile.id,
    fullName: profile.full_name,
    email: profile.email,
  }));
}
