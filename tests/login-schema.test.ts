import { describe, expect, it } from "vitest";

import { loginSchema } from "@/features/auth/schemas";

describe("login input validation", () => {
  it("normalizes a valid professional login", () => {
    expect(
      loginSchema.parse({
        email: "  membre@surfce.local ",
        password: "a-secure-password",
      }),
    ).toEqual({
      email: "membre@surfce.local",
      password: "a-secure-password",
    });
  });

  it("rejects malformed credentials before calling Supabase", () => {
    expect(loginSchema.safeParse({ email: "invalid", password: "short" }).success).toBe(false);
  });
});
