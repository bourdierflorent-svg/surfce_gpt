import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const migration = readFileSync(
  join(repositoryRoot, "supabase/migrations/202607220001_phase_0_1_auth_organizations.sql"),
  "utf8",
).toLowerCase();
const rlsTest = readFileSync(
  join(repositoryRoot, "supabase/tests/00001_phase_1_rls.test.sql"),
  "utf8",
).toLowerCase();
const hardeningMigration = readFileSync(
  join(repositoryRoot, "supabase/migrations/202607220002_harden_rls_event_trigger.sql"),
  "utf8",
).toLowerCase();
const remoteAssertions = readFileSync(
  join(repositoryRoot, "supabase/tests/00002_phase_1_remote_assertions.sql"),
  "utf8",
).toLowerCase();

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listSourceFiles(path) : [path];
  });
}

describe("phase 1 database security", () => {
  it.each(["organizations", "profiles", "memberships"])("enables RLS on %s", (table) => {
    expect(migration).toContain(`alter table public.${table} enable row level security`);
  });

  it("uses membership and role helpers with hardened search paths", () => {
    expect(migration).toContain("function private.is_org_member");
    expect(migration).toContain("function private.has_org_role");
    expect(migration).toContain("security definer\nset search_path = ''");
  });

  it("keeps definer helpers outside the exposed API schema", () => {
    expect(migration).toContain("create schema if not exists private");
    expect(migration).toContain("function public.create_organization");
    expect(migration).toContain("security invoker");
    expect(migration).not.toContain("function public.is_org_member");
  });

  it("hardens the pre-existing automatic RLS event trigger", () => {
    expect(hardeningMigration).toContain("to_regprocedure('public.rls_auto_enable()')");
    expect(hardeningMigration).toContain(
      "revoke execute on function public.rls_auto_enable() from public, anon, authenticated",
    );
  });

  it("does not contain globally permissive RLS expressions", () => {
    expect(migration).not.toMatch(/using\s*\(\s*true\s*\)/);
    expect(migration).not.toMatch(/with check\s*\(\s*true\s*\)/);
  });

  it("contains an executable cross-organization pgTAP scenario", () => {
    expect(rlsTest).toContain("select plan(10)");
    expect(rlsTest).toContain("organization b is hidden from organization a");
    expect(rlsTest).toContain("a viewer cannot update their organization");
    expect(rlsTest).toContain("select * from finish()");
  });

  it("contains rollback-only remote RLS assertions", () => {
    expect(remoteAssertions).toContain("begin;");
    expect(remoteAssertions).toContain("set local role authenticated");
    expect(remoteAssertions).toContain("viewer updated organization a");
    expect(remoteAssertions).toContain("rollback;");
    expect(remoteAssertions).toContain("phase_1_rls_assertions_passed");
  });

  it("keeps the service role key isolated in the dedicated server-only client", () => {
    const sourceFiles = listSourceFiles(join(repositoryRoot, "src"));
    const adminClient = join(repositoryRoot, "src/lib/supabase/admin.ts");
    const otherSource = sourceFiles
      .filter((path) => path !== adminClient)
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");
    expect(otherSource).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(readFileSync(adminClient, "utf8")).toContain('import "server-only"');
  });
});
