import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const migration = [
  "202607230003_phase_5_contacts_campaigns_schema.sql",
  "202607230004_phase_5_contacts_campaigns_rls.sql",
  "202607230005_phase_5_provider_policies_enrollment.sql",
  "202607230006_phase_5_suppression.sql",
  "202607230007_phase_5_mock_processing.sql",
  "202607230009_phase_5_mock_processing_enum_fix.sql",
  "202607230010_phase_5_suppression_scope_fix.sql",
  "202607230011_phase_5_mock_processing_scope_fix.sql",
  "202607230012_phase_5_rpc_anon_hardening.sql",
]
  .map((name) => readFileSync(join(root, "supabase/migrations", name), "utf8"))
  .join("\n")
  .toLowerCase();
const indexes = readFileSync(
  join(root, "supabase/migrations/202607230008_phase_5_fk_indexes.sql"),
  "utf8",
).toLowerCase();
const seed = readFileSync(join(root, "supabase/seed.sql"), "utf8").toLowerCase();
const remoteAssertions = readFileSync(
  join(root, "supabase/tests/00006_phase_5_remote_assertions.sql"),
  "utf8",
).toLowerCase();

describe("Phase 5 database model", () => {
  it.each([
    "contacts",
    "mailboxes",
    "campaigns",
    "sequence_steps",
    "campaign_enrollments",
    "mail_threads",
    "messages",
    "suppression_list",
    "audit_logs",
  ])("creates and protects %s", (table) => {
    expect(migration).toContain(`create table public.${table}`);
    expect(migration).toContain(`alter table public.${table} enable row level security`);
  });

  it("keeps schedules configurable and first messages approval-gated", () => {
    expect(migration).toContain("delay_days integer not null");
    expect(migration).toContain("send_window jsonb not null");
    expect(migration).toContain("requires_first_message_approval boolean not null default true");
    expect(migration).toContain("approval_required");
  });

  it("enforces suppression and mock delivery atomically", () => {
    expect(migration).toContain("create or replace function public.enroll_contact_in_campaign");
    expect(migration).toContain("create or replace function public.process_mock_campaign_message");
    expect(migration).toContain("for update of m, ce, mb");
    expect(migration).toContain("message.blocked_by_suppression");
    expect(migration).toContain("messages_deduplication_unique");
  });

  it("adds indexes for every new composite foreign-key path", () => {
    expect(indexes).toContain("campaigns_offer_composite_fk_idx");
    expect(indexes).toContain("messages_campaign_due_idx");
    expect(indexes).toContain("campaign_enrollments_contact_fk_idx");
    expect(indexes).toContain("suppression_list_domain_idx");
  });

  it("never adds globally permissive authenticated policies", () => {
    expect(migration).not.toMatch(/using\s*\(\s*true\s*\)/);
    expect(migration).not.toMatch(/with check\s*\(\s*true\s*\)/);
  });

  it("seeds fifteen fictional contacts, two campaigns and a token-free mailbox", () => {
    expect(seed.match(/'70000000-0000-0000-0000-0000000000\d\d'/g)?.length).toBeGreaterThanOrEqual(
      15,
    );
    expect(seed).toContain("afterwork agences parisiennes");
    expect(seed).toContain("dîner cabinets de conseil");
    expect(seed).toContain("encrypted_access_token = null");
    expect(seed).toContain(".example");
  });

  it("contains rollback-only Phase 5 assertions", () => {
    expect(remoteAssertions).toContain("phase_5_campaign_and_suppression_assertions_passed");
    expect(remoteAssertions).toContain("double mock send");
    expect(remoteAssertions).toContain("rollback;");
  });
});
