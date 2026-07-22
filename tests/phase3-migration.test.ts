import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const migration = readFileSync(
  join(root, "supabase/migrations/202607220005_phase_3_companies_discovery.sql"),
  "utf8",
).toLowerCase();
const performanceMigration = readFileSync(
  join(root, "supabase/migrations/202607220006_phase_3_rls_performance.sql"),
  "utf8",
).toLowerCase();
const seed = readFileSync(join(root, "supabase/seed.sql"), "utf8").toLowerCase();
const remoteAssertions = readFileSync(
  join(root, "supabase/tests/00004_phase_3_remote_assertions.sql"),
  "utf8",
).toLowerCase();

describe("Phase 3 database model", () => {
  it.each(["saved_searches", "companies", "company_locations", "data_sources"])(
    "creates and protects %s",
    (table) => {
      expect(migration).toContain(`create table public.${table}`);
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    },
  );

  it("creates secured PostGIS radius and polygon functions", () => {
    expect(migration).toContain("function public.search_companies_in_radius");
    expect(migration).toContain("function public.search_companies_in_polygon");
    expect(migration).toContain("security invoker");
    expect(migration).toContain("extensions.st_dwithin");
    expect(migration).toContain("extensions.st_covers");
  });

  it("indexes both company geographies", () => {
    expect(migration).toContain("companies_location_gix");
    expect(migration).toContain("company_locations_location_gix");
    expect(migration.match(/using gist/g)).toHaveLength(2);
  });

  it("uses role-scoped policies and assigned sales access", () => {
    expect(migration).toContain("array['admin', 'sales_manager']::public.app_role[]");
    expect(migration).toContain("and assigned_to = auth.uid()");
    expect(migration).not.toMatch(/using\s*\(\s*true\s*\)/);
    expect(migration).not.toMatch(/with check\s*\(\s*true\s*\)/);
  });

  it("covers Phase 3 foreign keys and caches auth.uid in policies", () => {
    expect(performanceMigration).toContain("companies_assigned_to_fk_idx");
    expect(performanceMigration).toContain("company_locations_source_fk_idx");
    expect(performanceMigration).toContain("saved_searches_created_by_fk_idx");
    expect(performanceMigration).toContain("(select auth.uid())");
  });

  it("imports atomically and checks the required duplicate keys", () => {
    expect(migration).toContain("function public.import_discovered_company");
    expect(migration).toContain("'provider_reference'::text");
    expect(migration).toContain("'domain'::text");
    expect(migration).toContain("'phone'::text");
    expect(migration).toContain("'name_address'::text");
  });

  it("seeds fictional companies with reserved domains and provenance", () => {
    expect(seed).toContain("studio huit communication sas fictive");
    expect(seed).toContain("cabinet rive conseil sas fictif");
    expect(seed).toContain(".example");
    expect(seed).toContain("'mock_places'");
  });

  it("contains rollback-only Phase 3 remote assertions", () => {
    expect(remoteAssertions).toContain("phase_3_rls_and_postgis_assertions_passed");
    expect(remoteAssertions).toContain("viewer updated a company");
    expect(remoteAssertions).toContain("search_companies_in_radius");
    expect(remoteAssertions).toContain("rollback;");
  });
});
