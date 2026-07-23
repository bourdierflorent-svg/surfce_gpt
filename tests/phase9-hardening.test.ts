import { readFileSync } from "node:fs";
import { join } from "node:path";

import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildContentSecurityPolicy,
  createRequestId,
  isTrustedMutation,
  shouldProtectMutation,
} from "@/lib/http/request-security";
import { logger } from "@/lib/observability/logger";
import { paginateItems, paginationResult } from "@/lib/pagination";
import { postgresUuidSchema } from "@/lib/validation/identifiers";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/202607230029_phase_9_provider_quotas_observability.sql"),
  "utf8",
);
const policyOptimization = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/202607230030_phase_9_provider_quota_policy_optimization.sql",
  ),
  "utf8",
);
const remoteAssertions = readFileSync(
  join(process.cwd(), "supabase/tests/00010_phase_9_remote_assertions.sql"),
  "utf8",
);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Phase 9 request hardening", () => {
  it("builds a nonce-based CSP compatible with the local map worker", () => {
    const policy = buildContentSecurityPolicy("nonce-test");
    expect(policy).toContain("script-src 'self' 'nonce-nonce-test' 'strict-dynamic'");
    expect(policy).toContain("worker-src 'self' blob:");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
  });

  it("protects browser mutations and rejects a cross-site origin", () => {
    const request = new NextRequest("https://surfce-gpt.vercel.app/api/discovery/search", {
      method: "POST",
      headers: {
        origin: "https://attacker.example",
        "sec-fetch-site": "cross-site",
      },
    });
    expect(shouldProtectMutation(request)).toBe(true);
    expect(isTrustedMutation(request)).toBe(false);
  });

  it("allows same-origin mutations and excludes signed server callbacks", () => {
    const request = new NextRequest("https://surfce-gpt.vercel.app/api/discovery/search", {
      method: "POST",
      headers: {
        origin: "https://surfce-gpt.vercel.app",
        "sec-fetch-site": "same-origin",
      },
    });
    const webhook = new NextRequest("https://surfce-gpt.vercel.app/api/webhooks/provider/mock", {
      method: "POST",
    });
    expect(isTrustedMutation(request)).toBe(true);
    expect(shouldProtectMutation(webhook)).toBe(false);
  });

  it("trusts the effective forwarded host when Next normalizes its request URL", () => {
    const request = new NextRequest("http://localhost:3000/api/discovery/search", {
      method: "POST",
      headers: {
        host: "127.0.0.1:3101",
        origin: "http://127.0.0.1:3101",
        "sec-fetch-site": "same-origin",
        "x-forwarded-proto": "http",
      },
    });
    expect(isTrustedMutation(request)).toBe(true);
  });

  it("keeps a valid upstream request ID and replaces an unsafe one", () => {
    expect(createRequestId("req-safe_123")).toBe("req-safe_123");
    expect(createRequestId("../../unsafe")).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("Phase 9 observability", () => {
  it("redacts structured secret fields and token-shaped values", () => {
    const output = vi.spyOn(console, "log").mockImplementation(() => undefined);
    logger.info("test.redaction", {
      authorization: "Bearer secret-value",
      provider: "mock_ai",
      note: "Bearer abcdefghijklmnopqrstuvwxyz",
    });
    const record = String(output.mock.calls[0]?.[0]);
    expect(record).toContain('"authorization":"[REDACTED]"');
    expect(record).toContain('"provider":"mock_ai"');
    expect(record).not.toContain("secret-value");
    expect(record).not.toContain("abcdefghijklmnopqrstuvwxyz");
  });
});

describe("Phase 9 server pagination", () => {
  it("slices preview data with stable offsets", () => {
    expect(paginateItems(["a", "b", "c", "d"], 2, 2)).toEqual({
      items: ["c", "d"],
      page: 2,
      pageSize: 2,
      pageCount: 2,
      total: 4,
      offset: 2,
    });
  });

  it("represents a database page without recomputing the total", () => {
    expect(paginationResult(["c"], 5, 3, 2)).toMatchObject({
      items: ["c"],
      page: 3,
      pageCount: 3,
      total: 5,
      offset: 4,
    });
  });
});

describe("Phase 9 PostgreSQL identifiers", () => {
  it("accepts deterministic seed UUIDs while rejecting malformed identifiers", () => {
    expect(postgresUuidSchema.safeParse("70000000-0000-0000-0000-000000000015").success).toBe(true);
    expect(postgresUuidSchema.safeParse("../not-an-identifier").success).toBe(false);
  });
});

describe("Phase 9 provider quota migration", () => {
  it("creates distributed quota tables with RLS and indexed windows", () => {
    expect(migration).toContain("create table public.provider_quotas");
    expect(migration).toContain("create table public.provider_usage_events");
    expect(migration).toContain("alter table public.provider_quotas enable row level security");
    expect(migration).toContain("provider_quota_events_window_idx");
  });

  it("uses an invoker RPC, an advisory transaction lock and blocks anon", () => {
    expect(migration).toContain("create or replace function public.consume_provider_quota");
    expect(migration).toMatch(
      /consume_provider_quota[\s\S]+security invoker[\s\S]+pg_advisory_xact_lock/,
    );
    expect(migration).toContain(
      "revoke all on function public.consume_provider_quota(uuid, text, text, uuid, text, uuid)",
    );
    expect(migration).toContain("to authenticated, service_role");
  });

  it("enforces quotas before every provider job attempt", () => {
    expect(migration).toContain("create trigger provider_jobs_enforce_quota");
    expect(migration).toContain("provider_quota_exceeded");
    expect(migration).toContain("create trigger provider_jobs_finalize_quota");
  });

  it("keeps one permissive select policy and executable rollback-only assertions", () => {
    expect(policyOptimization).toContain("drop policy provider_quotas_manage_admin");
    expect(policyOptimization).toContain("create policy provider_quotas_update_admin");
    expect(remoteAssertions).toContain("provider_quota_exceeded");
    expect(remoteAssertions).toContain("rollback;");
    expect(remoteAssertions).toContain("phase_9_hardening_assertions_passed");
  });
});
