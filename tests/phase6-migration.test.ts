import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const migration = [
  "202607230013_phase_6_inbox_schema.sql",
  "202607230014_phase_6_inbox_rls.sql",
  "202607230015_phase_6_inbox_rpcs.sql",
  "202607230016_phase_6_provider_delivery.sql",
  "202607230017_phase_6_ingest_variable_resolution.sql",
  "202607230018_phase_6_delivery_service_only.sql",
  "202607230019_phase_6_retire_legacy_mock_delivery.sql",
]
  .map((name) => readFileSync(join(root, "supabase/migrations", name), "utf8"))
  .join("\n")
  .toLowerCase();
const seed = readFileSync(join(root, "supabase/seed.sql"), "utf8").toLowerCase();
const remoteAssertions = readFileSync(
  join(root, "supabase/tests/00007_phase_6_remote_assertions.sql"),
  "utf8",
).toLowerCase();

describe("Phase 6 database model", () => {
  it.each(["message_events", "message_attachments"])("creates and protects %s", (table) => {
    expect(migration).toContain(`create table public.${table}`);
    expect(migration).toContain(`alter table public.${table} enable row level security`);
  });

  it("stores encrypted-provider metadata without exposing tokens through RPCs", () => {
    expect(migration).toContain("oauth_scopes text[]");
    expect(migration).toContain("watch_resource_id text");
    expect(migration).toContain("sync_failure_count integer");
    expect(migration).not.toContain("decrypt");
  });

  it("ingests provider messages atomically and stops future campaign messages", () => {
    expect(migration).toContain("create or replace function public.ingest_provider_message");
    expect(migration).toContain("'campaign_stopped'");
    expect(migration).toContain("error_code = 'reply_received'");
    expect(migration).toContain("on conflict (organization_id, normalized_email)");
  });

  it("reserves provider delivery before sending and finalizes it once", () => {
    expect(migration).toContain("create or replace function public.claim_campaign_message");
    expect(migration).toContain("status = 'processing'");
    expect(migration).toContain("create or replace function public.finalize_campaign_message");
    expect(migration).toContain("for update of m, ce, mb");
  });

  it("keeps provider ingestion service-only and anon blocked", () => {
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
    expect(migration).toContain(
      "revoke all on function public.process_mock_campaign_message(uuid, text)",
    );
    expect(migration).toContain("from public, anon");
    expect(migration).not.toMatch(/using\s*\(\s*true\s*\)/);
  });

  it("seeds three fictional inbound replies, a campaign stop and attachment metadata", () => {
    expect(seed).toContain("mock_reply_seed_lina");
    expect(seed).toContain("mock_reply_seed_alix");
    expect(seed).toContain("mock_reply_seed_nina");
    expect(seed).toContain("brief-evenement-fictif.pdf");
    expect(seed).toContain("inbound_reply:interested");
  });

  it("contains rollback-only Phase 6 assertions", () => {
    expect(remoteAssertions).toContain("phase_6_inbox_assertions_passed");
    expect(remoteAssertions).toContain("duplicate provider ingestion");
    expect(remoteAssertions).toContain("rollback;");
  });
});
