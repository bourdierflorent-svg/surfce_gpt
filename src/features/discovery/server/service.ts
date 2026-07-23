import { assertOrganizationPermission } from "@/features/organizations/server/authorization";
import { closePolygonRing } from "@/lib/geo/geometry";
import { runProviderOperation } from "@/lib/providers/quota";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPlacesProvider, type PlaceCandidate } from "@/providers/places";
import type { AppAuthContext } from "@/types/auth";
import type { Json } from "@/types/database";
import type { SavedSearchRow } from "@/types/database";

import type { DiscoverySearchInput } from "../schemas";
import type { DiscoverySearchResponse, ImportResult } from "../types";

function candidateToJson(candidate: PlaceCandidate): Json {
  return {
    external_id: candidate.externalId,
    provider: candidate.provider,
    legal_name: candidate.legalName,
    trade_name: candidate.tradeName,
    normalized_name: candidate.normalizedName,
    sector: candidate.sector,
    subsector: candidate.subsector,
    description: candidate.description,
    website_url: candidate.websiteUrl,
    domain: candidate.domain,
    phone: candidate.phone,
    generic_email: candidate.genericEmail,
    employee_range: candidate.employeeRange,
    address_line1: candidate.addressLine1,
    postal_code: candidate.postalCode,
    city: candidate.city,
    country_code: candidate.countryCode,
    district: candidate.district,
    latitude: candidate.location.latitude,
    longitude: candidate.location.longitude,
    location: candidate.location as unknown as Json,
    qualification_score: candidate.potentialScore,
    data_quality_score: candidate.dataQualityScore,
    tags: candidate.tags,
    collected_at: candidate.collectedAt,
    confidence: candidate.confidence,
  };
}

export async function searchDiscovery(
  context: AppAuthContext,
  input: DiscoverySearchInput,
): Promise<DiscoverySearchResponse> {
  assertOrganizationPermission(context.membership.role, "companies:read");
  const provider = getPlacesProvider();
  const result = context.isPreview
    ? await provider.search(input)
    : await runProviderOperation({
        client: await createSupabaseServerClient(),
        organizationId: context.organization.id,
        provider: provider.name,
        operation: "search",
        task: () => provider.search(input),
      });

  if (context.isPreview || result.results.length === 0) {
    return {
      ...result,
      results: result.results.map((candidate) => ({ ...candidate, importedCompanyId: null })),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("data_sources")
    .select("entity_id, external_reference")
    .eq("organization_id", context.organization.id)
    .eq("entity_type", "company")
    .eq("provider", "mock_places")
    .eq("field_name", "record")
    .in(
      "external_reference",
      result.results.map((candidate) => candidate.externalId),
    );

  if (error) throw new Error("Impossible de vérifier les imports existants.");

  const importedByReference = new Map(
    (data ?? []).map((source) => [source.external_reference, source.entity_id]),
  );

  return {
    ...result,
    results: result.results.map((candidate) => ({
      ...candidate,
      importedCompanyId: importedByReference.get(candidate.externalId) ?? null,
    })),
  };
}

export async function importDiscoveryCandidate(
  context: AppAuthContext,
  externalId: string,
): Promise<ImportResult> {
  assertOrganizationPermission(context.membership.role, "companies:write");
  if (context.isPreview) throw new Error("L’import est désactivé en mode aperçu.");

  const supabase = await createSupabaseServerClient();
  const provider = getPlacesProvider();
  const candidate = await runProviderOperation({
    client: supabase,
    organizationId: context.organization.id,
    provider: provider.name,
    operation: "get_details",
    task: () => provider.getDetails(externalId),
  });
  if (!candidate) throw new Error("Cette société fictive n’est plus disponible.");

  const { data, error } = await supabase.rpc("import_discovered_company", {
    p_organization_id: context.organization.id,
    p_company: candidateToJson(candidate),
  });

  const imported = data?.[0];
  if (error || !imported) throw new Error("L’import n’a pas abouti. Aucune donnée n’a été créée.");

  return {
    companyId: imported.company_id,
    wasCreated: imported.was_created,
    matchReason: imported.match_reason,
  };
}

export async function importDiscoveryBatch(
  context: AppAuthContext,
  externalIds: string[],
): Promise<ImportResult[]> {
  const results: ImportResult[] = [];
  for (const externalId of Array.from(new Set(externalIds))) {
    results.push(await importDiscoveryCandidate(context, externalId));
  }
  return results;
}

export async function findDiscoveryDuplicates(
  context: AppAuthContext,
  externalIds: string[],
): Promise<Record<string, string | null>> {
  assertOrganizationPermission(context.membership.role, "companies:read");
  if (context.isPreview || externalIds.length === 0) {
    return Object.fromEntries(externalIds.map((externalId) => [externalId, null]));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("data_sources")
    .select("entity_id, external_reference")
    .eq("organization_id", context.organization.id)
    .eq("entity_type", "company")
    .eq("provider", "mock_places")
    .eq("field_name", "record")
    .in("external_reference", externalIds);

  if (error) throw new Error("La déduplication n’a pas abouti.");
  const matches = new Map(
    (data ?? []).map((source) => [source.external_reference, source.entity_id]),
  );
  return Object.fromEntries(
    externalIds.map((externalId) => [externalId, matches.get(externalId) ?? null]),
  );
}

export async function saveDiscoverySearch(
  context: AppAuthContext,
  name: string,
  input: DiscoverySearchInput,
  resultCount: number,
): Promise<string> {
  assertOrganizationPermission(context.membership.role, "companies:read");
  if (context.isPreview) throw new Error("La sauvegarde est désactivée en mode aperçu.");

  const ring = input.polygon ? closePolygonRing(input.polygon) : [];
  const center = input.center ? `POINT(${input.center.longitude} ${input.center.latitude})` : null;
  const area =
    ring.length >= 4 ? `POLYGON((${ring.map((point) => point.join(" ")).join(",")}))` : null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("saved_searches")
    .insert({
      organization_id: context.organization.id,
      created_by: context.user.id,
      name,
      query: input.query || null,
      category: input.category || null,
      center,
      radius_meters: input.mode === "radius" ? (input.radiusMeters ?? null) : null,
      area,
      filters: {
        city: input.city,
        district: input.district,
        mode: input.mode,
        center: input.center as unknown as Json,
        polygon: input.polygon ?? [],
        options: input.filters as unknown as Json,
      },
      result_count: resultCount,
      last_run_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) throw new Error("La recherche n’a pas pu être sauvegardée.");
  return data.id;
}

export async function listSavedDiscoverySearches(
  context: AppAuthContext,
): Promise<SavedSearchRow[]> {
  if (context.isPreview) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("saved_searches")
    .select("*")
    .eq("organization_id", context.organization.id)
    .order("updated_at", { ascending: false })
    .limit(8);
  if (error) throw new Error("Impossible de charger les recherches sauvegardées.");
  return data ?? [];
}

export async function getSavedDiscoverySearch(
  context: AppAuthContext,
  searchId: string,
): Promise<SavedSearchRow | null> {
  if (context.isPreview) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("saved_searches")
    .select("*")
    .eq("id", searchId)
    .eq("organization_id", context.organization.id)
    .maybeSingle();
  if (error) throw new Error("Impossible de charger cette recherche sauvegardée.");
  return data;
}
