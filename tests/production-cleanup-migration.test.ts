import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/202608070001_remove_production_demo_fixtures.sql"),
  "utf8",
).toLowerCase();

describe("production demo fixture cleanup", () => {
  it("fails closed when reserved identifiers no longer contain demo records", () => {
    expect(migration).toContain("reserved company fixture identifiers contain non-demo data");
    expect(migration).toContain("reserved contact fixture identifiers contain non-demo data");
    expect(migration).toContain("reserved venue offer identifiers contain non-demo data");
  });

  it("removes fictional business fixtures and mock provider traces", () => {
    for (const table of [
      "public.companies",
      "public.contacts",
      "public.campaigns",
      "public.messages",
      "public.opportunities",
      "public.provider_usage_events",
    ]) {
      expect(migration).toContain(`delete from ${table}`);
    }
    expect(migration).toContain("provider like 'mock%'");
    expect(migration).toContain("production demo fixture cleanup is incomplete");
  });

  it("keeps the organization and venue shells while removing invented venue fields", () => {
    expect(migration).toContain("update public.venues");
    expect(migration).toContain("description = null");
    expect(migration).toContain("features = '{}'::jsonb");
    expect(migration).not.toContain("delete from public.organizations");
    expect(migration).not.toContain("delete from public.memberships");
    expect(migration).not.toContain("delete from public.venues");
    expect(migration).not.toContain("delete from legacy.");
  });
});
