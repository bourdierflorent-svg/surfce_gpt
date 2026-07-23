import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const migration = [
  "202607230020_phase_7_opportunities_schema.sql",
  "202607230021_phase_7_opportunities_rls.sql",
  "202607230022_phase_7_opportunities_indexes.sql",
  "202607230023_phase_7_opportunity_automation.sql",
]
  .map((name) => readFileSync(join(root, "supabase/migrations", name), "utf8"))
  .join("\n")
  .toLowerCase();
const seed = readFileSync(join(root, "supabase/seed.sql"), "utf8").toLowerCase();
const remoteAssertions = readFileSync(
  join(root, "supabase/tests/00008_phase_7_remote_assertions.sql"),
  "utf8",
).toLowerCase();

describe("Phase 7 database model", () => {
  it.each([
    "opportunity_stages",
    "opportunities",
    "activities",
    "tasks",
    "appointments",
    "proposals",
  ])("creates and protects %s", (table) => {
    expect(migration).toContain(`create table public.${table}`);
    expect(migration).toContain(`alter table public.${table} enable row level security`);
  });

  it("creates eleven configurable default stages", () => {
    for (const key of [
      "target_detected",
      "company_enriched",
      "prospect_qualified",
      "contacted",
      "engaged",
      "appointment",
      "proposal_sent",
      "negotiation",
      "event_confirmed",
      "won",
      "lost",
    ]) {
      expect(migration).toContain(`'${key}'`);
    }
  });

  it("audits mutations and records stage, task, appointment and proposal activities", () => {
    expect(migration).toContain("create or replace function private.audit_phase7_mutation");
    expect(migration).toContain("create trigger opportunities_audit");
    expect(migration).toContain("create trigger tasks_activity");
    expect(migration).toContain("create trigger appointments_activity");
    expect(migration).toContain("create trigger proposals_activity");
  });

  it("converts a qualified thread idempotently and blocks anon", () => {
    expect(migration).toContain("create or replace function public.create_opportunity_from_thread");
    expect(migration).toContain("'duplicate', true");
    expect(migration).toContain("from public, anon");
    expect(migration).not.toMatch(/using\s*\(\s*true\s*\)/);
  });

  it("seeds five fictitious opportunities and their operational records", () => {
    for (const suffix of ["1", "2", "3", "4", "5"]) {
      expect(seed).toContain(`'82000000-0000-0000-0000-00000000000${suffix}'`);
    }
    expect(seed).toContain("seed_phase7_demo");
    expect(seed).toContain("rendez-vous découverte");
    expect(seed).toContain("cocktail presse fictif");
  });

  it("contains rollback-only Phase 7 assertions", () => {
    expect(remoteAssertions).toContain("phase_7_opportunity_assertions_passed");
    expect(remoteAssertions).toContain("weighted pipeline");
    expect(remoteAssertions).toContain("rollback;");
  });
});
