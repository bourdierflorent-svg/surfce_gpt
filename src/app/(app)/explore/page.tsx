import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { ExplorerWorkbench } from "@/features/discovery/components/explorer-workbench";
import type { DiscoverySearchInput } from "@/features/discovery/schemas";
import { listSavedDiscoverySearches, searchDiscovery } from "@/features/discovery/server/service";
import { can } from "@/lib/permissions/roles";

export const defaultDiscoverySearch: DiscoverySearchInput = {
  query: "",
  category: "",
  city: "Paris",
  district: "",
  mode: "radius",
  center: { latitude: 48.8667, longitude: 2.3333 },
  radiusMeters: 4_500,
  polygon: [],
  filters: {},
};

export default async function ExplorePage() {
  const context = await requireAppAuthContext();
  const [initialResponse, savedSearches] = await Promise.all([
    searchDiscovery(context, defaultDiscoverySearch),
    listSavedDiscoverySearches(context),
  ]);

  return (
    <div className="mx-auto max-w-[100rem]">
      <ExplorerWorkbench
        canImport={can(context.membership.role, "companies:write") && !context.isPreview}
        canSave={!context.isPreview}
        initialResponse={initialResponse}
        initialSearch={defaultDiscoverySearch}
        savedSearches={savedSearches}
      />
    </div>
  );
}
