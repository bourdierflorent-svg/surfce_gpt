import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { readSupabasePublicConfig } from "@/lib/supabase/env";

describe("Supabase public environment", () => {
  it("accepts a complete public configuration", () => {
    expect(
      readSupabasePublicConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      anonKey: "public-anon-key",
    });
  });

  it("rejects partial or invalid configuration", () => {
    expect(
      readSupabasePublicConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      }),
    ).toBeNull();
    expect(
      readSupabasePublicConfig({
        NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
      }),
    ).toBeNull();
  });
});

describe("Next.js route topology", () => {
  it("keeps mailbox provider and mailbox id parameters on distinct segments", () => {
    expect(
      existsSync(join(process.cwd(), "src/app/api/mailboxes/connect/[provider]/route.ts")),
    ).toBe(true);
    expect(
      existsSync(join(process.cwd(), "src/app/api/mailboxes/[provider]/connect/route.ts")),
    ).toBe(false);
  });
});
