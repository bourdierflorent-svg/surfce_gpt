import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { createOAuthState, createPkcePair } from "@/features/mailboxes/oauth-state";
import { mailboxProviderSchema } from "@/features/mailboxes/schemas";
import { assertOrganizationPermission } from "@/features/organizations/server/authorization";
import { encryptSecret } from "@/lib/crypto/oauth-tokens";
import { buildAuthorizationUrl, readOAuthProviderConfig } from "@/providers/mail/oauth";

interface ConnectRouteProps {
  params: Promise<{ provider: string }>;
}

export async function GET(request: Request, { params }: ConnectRouteProps) {
  const context = await requireAppAuthContext();
  assertOrganizationPermission(context.membership.role, "mailboxes:write");
  if (context.isPreview) {
    return NextResponse.redirect(new URL("/settings/mailboxes?error=preview", request.url));
  }
  const parsedProvider = mailboxProviderSchema.safeParse((await params).provider);
  if (!parsedProvider.success) {
    return NextResponse.json({ error: "Provider mail inconnu." }, { status: 404 });
  }
  try {
    const provider = parsedProvider.data;
    const config = readOAuthProviderConfig(provider);
    const state = createOAuthState(context, provider);
    const pkce = createPkcePair();
    const cookieStore = await cookies();
    cookieStore.set(
      `surfce_oauth_${provider}`,
      encryptSecret(JSON.stringify({ state, codeVerifier: pkce.verifier })),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: new URL(request.url).protocol === "https:",
        path: `/api/oauth/${provider}/callback`,
        maxAge: 10 * 60,
      },
    );
    return NextResponse.redirect(
      buildAuthorizationUrl({ config, state, codeChallenge: pkce.challenge }),
    );
  } catch {
    return NextResponse.redirect(
      new URL(`/settings/mailboxes?error=${parsedProvider.data}_not_configured`, request.url),
    );
  }
}
