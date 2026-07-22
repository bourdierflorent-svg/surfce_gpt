import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const migration = readFileSync(
  join(repositoryRoot, "supabase/migrations/202607220003_phase_2_venues_offers_assets.sql"),
  "utf8",
).toLowerCase();
const indexMigration = readFileSync(
  join(repositoryRoot, "supabase/migrations/202607220004_phase_2_asset_fk_indexes.sql"),
  "utf8",
).toLowerCase();
const seed = readFileSync(join(repositoryRoot, "supabase/seed.sql"), "utf8").toLowerCase();
const remoteAssertions = readFileSync(
  join(repositoryRoot, "supabase/tests/00003_phase_2_remote_assertions.sql"),
  "utf8",
).toLowerCase();

describe("Phase 2 database model", () => {
  it.each(["venues", "venue_offers", "venue_assets"])("creates and protects %s", (table) => {
    expect(migration).toContain(`create table public.${table}`);
    expect(migration).toContain(`alter table public.${table} enable row level security`);
  });

  it("enforces organization-scoped foreign keys", () => {
    expect(migration).toContain("foreign key (organization_id, venue_id)");
    expect(migration).toContain("foreign key (organization_id, venue_id, offer_id)");
  });

  it("covers the composite asset foreign keys with an index", () => {
    expect(indexMigration).toContain("(organization_id, venue_id, offer_id)");
    expect(indexMigration).toContain("covers both composite venue_assets foreign keys");
  });

  it("validates capacities, budgets, guest ranges and dates", () => {
    expect(migration).toContain("venues_minimum_guests_capacity");
    expect(migration).toContain("venue_offers_guest_range");
    expect(migration).toContain("minimum_budget is null or minimum_budget >= 0");
    expect(migration).toContain("venue_offers_validity_range");
  });

  it("uses role-scoped write policies without permissive global expressions", () => {
    expect(migration).toContain("array['admin', 'venue_manager', 'marketing']");
    expect(migration).not.toMatch(/using\s*\(\s*true\s*\)/);
    expect(migration).not.toMatch(/with check\s*\(\s*true\s*\)/);
  });

  it("creates a private, constrained asset bucket", () => {
    expect(migration).toContain("'venue-assets'");
    expect(migration).toContain("10485760");
    expect(migration).toContain("venue_assets_storage_insert_editors");
  });

  it("seeds the four editable Stargazing venues and offers", () => {
    for (const venue of ["little room", "deflower", "fresh touch", "giulia"]) {
      expect(seed).toContain(`'${venue}'`);
    }
    expect(seed.match(/insert into public\.venue_offers/g)).toHaveLength(1);
    expect(seed).toContain("conditions commerciales à confirmer");
  });

  it("contains rollback-only Phase 2 RLS assertions", () => {
    expect(remoteAssertions).toContain("viewer updated a venue");
    expect(remoteAssertions).toContain("venue manager could not update a venue");
    expect(remoteAssertions).toContain("rollback;");
    expect(remoteAssertions).toContain("phase_2_rls_assertions_passed");
  });
});
