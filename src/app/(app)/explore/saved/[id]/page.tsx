import { notFound } from "next/navigation";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { ExplorerWorkbench } from "@/features/discovery/components/explorer-workbench";
import { discoverySearchSchema, type DiscoverySearchInput } from "@/features/discovery/schemas";
import {
  getSavedDiscoverySearch,
  listSavedDiscoverySearches,
  searchDiscovery,
} from "@/features/discovery/server/service";
import { can } from "@/lib/permissions/roles";
import type { Json } from "@/types/database";

interface SavedExplorePageProps {
  params: Promise<{ id: string }>;
}

function objectValue(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function searchFromRow(
  row: Awaited<ReturnType<typeof getSavedDiscoverySearch>>,
): DiscoverySearchInput | null {
  if (!row) return null;
  const filters = objectValue(row.filters);
  const parsed = discoverySearchSchema.safeParse({
    query: row.query ?? "",
    category: row.category ?? "",
    city: filters.city ?? "Paris",
    district: filters.district ?? "",
    mode: filters.mode ?? (row.area ? "polygon" : "radius"),
    center: filters.center,
    radiusMeters: row.radius_meters ?? undefined,
    polygon: filters.polygon ?? [],
    filters: filters.options ?? {},
  });
  return parsed.success ? parsed.data : null;
}

export default async function SavedExplorePage({ params }: SavedExplorePageProps) {
  const context = await requireAppAuthContext();
  const { id } = await params;
  const saved = await getSavedDiscoverySearch(context, id);
  const input = searchFromRow(saved);
  if (!saved || !input) notFound();
  const [initialResponse, savedSearches] = await Promise.all([
    searchDiscovery(context, input),
    listSavedDiscoverySearches(context),
  ]);

  return (
    <div className="mx-auto max-w-[100rem]">
      <ExplorerWorkbench
        canImport={can(context.membership.role, "companies:write") && !context.isPreview}
        canSave={!context.isPreview}
        initialResponse={initialResponse}
        initialSearch={input}
        savedSearches={savedSearches}
      />
    </div>
  );
}
