import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { verifyOAuthState } from "@/features/mailboxes/oauth-state";
import { mailboxProviderSchema } from "@/features/mailboxes/schemas";
import { saveOAuthMailbox } from "@/features/mailboxes/server/service";
import { decryptSecret } from "@/lib/crypto/oauth-tokens";
import { exchangeAuthorizationCode, readOAuthProviderConfig } from "@/providers/mail/oauth";

const callbackCookieSchema = z.object({
  state: z.string().min(1),
  codeVerifier: z.string().min(43),
});

interface CallbackRouteProps {
  params: Promise<{ provider: string }>;
}

export async function GET(request: Request, { params }: CallbackRouteProps) {
  const url = new URL(request.url);
  const parsedProvider = mailboxProviderSchema.safeParse((await params).provider);
  if (!parsedProvider.success) {
    return NextResponse.json({ error: "Provider mail inconnu." }, { status: 404 });
  }
  const provider = parsedProvider.data;
  const cookieStore = await cookies();
  const cookieName = `surfce_oauth_${provider}`;
  try {
    if (url.searchParams.get("error")) {
      throw new Error("Le consentement OAuth a été refusé.");
    }
    const code = z.string().min(1).parse(url.searchParams.get("code"));
    const state = z.string().min(1).parse(url.searchParams.get("state"));
    const encryptedCookie = z.string().min(1).parse(cookieStore.get(cookieName)?.value);
    const oauthCookie = callbackCookieSchema.parse(JSON.parse(decryptSecret(encryptedCookie)));
    if (oauthCookie.state !== state) throw new Error("L’état OAuth ne correspond pas au cookie.");
    const context = await requireAppAuthContext();
    verifyOAuthState(state, context, provider);
    const tokenSet = await exchangeAuthorizationCode({
      config: readOAuthProviderConfig(provider),
      code,
      codeVerifier: oauthCookie.codeVerifier,
    });
    const mailbox = await saveOAuthMailbox(context, provider, tokenSet);
    cookieStore.delete(cookieName);
    return NextResponse.redirect(
      new URL(`/settings/mailboxes?connected=${mailbox.id}`, request.url),
    );
  } catch {
    cookieStore.delete(cookieName);
    return NextResponse.redirect(
      new URL(`/settings/mailboxes?error=${provider}_connection_failed`, request.url),
    );
  }
}
