import { createHash, randomBytes } from "node:crypto";

import { z } from "zod";

import { signServerValue, verifyServerSignature } from "@/lib/crypto/oauth-tokens";
import type { AppAuthContext } from "@/types/auth";
import type { MailProviderName } from "@/providers/mail";

const oauthStateSchema = z.object({
  provider: z.enum(["google", "microsoft"]),
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  nonce: z.string().min(16),
  expiresAt: z.number().int().positive(),
});

export type OAuthProvider = Exclude<MailProviderName, "mock">;

export function createPkcePair() {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function createOAuthState(
  context: AppAuthContext,
  provider: OAuthProvider,
  environment: NodeJS.ProcessEnv = process.env,
) {
  const payload = Buffer.from(
    JSON.stringify({
      provider,
      organizationId: context.organization.id,
      userId: context.user.id,
      nonce: randomBytes(24).toString("base64url"),
      expiresAt: Date.now() + 10 * 60 * 1000,
    }),
  ).toString("base64url");
  return `${payload}.${signServerValue(payload, environment)}`;
}

export function verifyOAuthState(
  state: string,
  context: AppAuthContext,
  provider: OAuthProvider,
  environment: NodeJS.ProcessEnv = process.env,
) {
  const [payload, signature, ...extra] = state.split(".");
  if (
    !payload ||
    !signature ||
    extra.length ||
    !verifyServerSignature(payload, signature, environment)
  ) {
    throw new Error("L’état OAuth est invalide.");
  }
  const parsed = oauthStateSchema.parse(
    JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
  );
  if (
    parsed.provider !== provider ||
    parsed.organizationId !== context.organization.id ||
    parsed.userId !== context.user.id ||
    parsed.expiresAt < Date.now()
  ) {
    throw new Error("La tentative OAuth a expiré ou ne correspond pas à cette session.");
  }
  return parsed;
}
