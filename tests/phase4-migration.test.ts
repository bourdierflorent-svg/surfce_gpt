import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const migration = readFileSync(
  join(root, "supabase/migrations/202607230001_phase_4_enrichment_persona_matching.sql"),
  "utf8",
).toLowerCase();
const performanceMigration = readFileSync(
  join(root, "supabase/migrations/202607230002_phase_4_fk_indexes.sql"),
  "utf8",
).toLowerCase();
const seed = readFileSync(join(root, "supabase/seed.sql"), "utf8").toLowerCase();
const remoteAssertions = readFileSync(
  join(root, "supabase/tests/00005_phase_4_remote_assertions.sql"),
  "utf8",
).toLowerCase();

describe("Phase 4 database model", () => {
  it.each(["personas", "venue_matches", "provider_jobs", "ai_runs"])(
    "creates and protects %s",
    (table) => {
      expect(migration).toContain(`create table public.${table}`);
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    },
  );

  it("keeps jobs idempotent, bounded and cost-aware", () => {
    expect(migration).toContain("provider_jobs_idempotency_unique");
    expect(migration).toContain("attempt_count between 0 and 5");
    expect(migration).toContain("estimated_cost");
  });

  it("versions personas and records model and prompt provenance", () => {
    expect(migration).toContain("personas_company_version_unique");
    expect(migration).toContain("model_provider text not null");
    expect(migration).toContain("prompt_version text not null");
    expect(migration).toContain("validated_by uuid");
  });

  it("uses explainable matching and assigned-sales policies", () => {
    expect(migration).toContain("score_breakdown jsonb");
    expect(migration).toContain("recommended_pitch text");
    expect(migration).toContain("c.assigned_to = (select auth.uid())");
    expect(migration).not.toMatch(/using\s*\(\s*true\s*\)/);
  });

  it("covers every composite venue match foreign key", () => {
    expect(performanceMigration).toContain("venue_matches_persona_composite_fk_idx");
    expect(performanceMigration).toContain("organization_id, company_id, persona_id");
    expect(performanceMigration).toContain("venue_matches_venue_composite_fk_idx");
    expect(performanceMigration).toContain("venue_matches_offer_composite_fk_idx");
  });

  it("seeds at least three fictional recommendations with explicit null budget", () => {
    expect(seed).toContain("mock_ai");
    expect(seed).toContain('"min":null,"max":null');
    expect(seed.match(/61000000-0000-0000-0000-00000000000/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it("contains rollback-only Phase 4 assertions", () => {
    expect(remoteAssertions).toContain("phase_4_rls_and_intelligence_assertions_passed");
    expect(remoteAssertions).toContain("duplicate provider job was accepted");
    expect(remoteAssertions).toContain("rollback;");
  });
});
