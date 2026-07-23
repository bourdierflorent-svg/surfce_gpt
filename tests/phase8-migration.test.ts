import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const migration = [
  "202607230024_phase_8_analytics_compliance_schema.sql",
  "202607230025_phase_8_analytics_compliance_rls.sql",
  "202607230026_phase_8_analytics_compliance_indexes.sql",
  "202607230027_phase_8_compliance_automation.sql",
  "202607230028_phase_8_suppression_proof_invariant.sql",
]
  .map((name) => readFileSync(join(root, "supabase/migrations", name), "utf8"))
  .join("\n")
  .toLowerCase();
const seed = readFileSync(join(root, "supabase/seed.sql"), "utf8").toLowerCase();
const remoteAssertions = readFileSync(
  join(root, "supabase/tests/00009_phase_8_remote_assertions.sql"),
  "utf8",
).toLowerCase();

describe("Phase 8 database model", () => {
  it.each(["compliance_settings", "analytics_exports", "retention_runs", "privacy_requests"])(
    "creates and protects %s",
    (table) => {
      expect(migration).toContain(`create table public.${table}`);
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    },
  );

  it("keeps retention execution service-only and privacy processing anonymous-proof", () => {
    expect(migration).toContain("create or replace function public.run_retention");
    expect(migration).toContain(
      "revoke all on function public.run_retention(uuid, boolean)\n  from public, anon, authenticated",
    );
    expect(migration).toContain(
      "grant execute on function public.run_retention(uuid, boolean)\n  to service_role",
    );
    expect(migration).toContain(
      "create or replace function public.process_contact_privacy_request",
    );
    expect(migration).toContain("from public, anon");
    expect(migration).not.toMatch(/using\s*\(\s*true\s*\)/);
  });

  it("preserves opposition proof, stops sequences and removes personal message content", () => {
    expect(migration).toContain("insert into public.suppression_list");
    expect(migration).toContain("status = 'stopped'");
    expect(migration).toContain("body_text = '[contenu supprimé");
    expect(migration).toContain("full_name = 'contact anonymisé'");
    expect(migration).toContain("compliance_settings_suppression_proof_required");
  });

  it("audits settings, exports, retention and privacy requests", () => {
    expect(migration).toContain("create trigger compliance_settings_audit");
    expect(migration).toContain("create trigger analytics_exports_audit");
    expect(migration).toContain("create trigger retention_runs_audit");
    expect(migration).toContain("create trigger privacy_requests_audit");
  });

  it("seeds disabled tracking and metadata-only proof records", () => {
    expect(seed).toContain("seed_phase8_demo");
    expect(seed).toContain("tracking_enabled = false");
    expect(seed).toContain("'analytics_overview'");
    expect(seed).toContain("'simulation'");
  });

  it("contains rollback-only isolation, role, privacy and retention assertions", () => {
    expect(remoteAssertions).toContain("phase_8_analytics_compliance_assertions_passed");
    expect(remoteAssertions).toContain("sales manager audit limitation");
    expect(remoteAssertions).toContain("opposition proof is missing");
    expect(remoteAssertions).toContain("rollback;");
  });
});
