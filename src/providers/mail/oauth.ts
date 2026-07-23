import { z } from "zod";

import type { MailProviderName, OAuthTokenSet } from "./types";

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  expires_in: z.coerce.number().int().positive(),
  scope: z.string().optional(),
});

export interface OAuthProviderConfig {
  provider: Exclude<MailProviderName, "mock">;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  scopes: string[];
  extraAuthorizationParameters: Record<string, string>;
}

function appUrl(environment: NodeJS.ProcessEnv): string {
  return (environment.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
}

export function readOAuthProviderConfig(
  provider: Exclude<MailProviderName, "mock">,
  environment: NodeJS.ProcessEnv = process.env,
): OAuthProviderConfig {
  if (provider === "google") {
    const parsed = z
      .object({
        clientId: z.string().min(1),
        clientSecret: z.string().min(1),
        redirectUri: z.string().url(),
      })
      .parse({
        clientId: environment.GOOGLE_CLIENT_ID,
        clientSecret: environment.GOOGLE_CLIENT_SECRET,
        redirectUri:
          environment.GOOGLE_REDIRECT_URI || `${appUrl(environment)}/api/oauth/google/callback`,
      });
    return {
      provider,
      ...parsed,
      authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenEndpoint: "https://oauth2.googleapis.com/token",
      scopes: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/gmail.send",
      ],
      extraAuthorizationParameters: {
        access_type: "offline",
        include_granted_scopes: "true",
        prompt: "consent",
      },
    };
  }

  const tenant = environment.MICROSOFT_TENANT_ID?.trim() || "common";
  const parsed = z
    .object({
      clientId: z.string().min(1),
      clientSecret: z.string().min(1),
      redirectUri: z.string().url(),
    })
    .parse({
      clientId: environment.MICROSOFT_CLIENT_ID,
      clientSecret: environment.MICROSOFT_CLIENT_SECRET,
      redirectUri:
        environment.MICROSOFT_REDIRECT_URI || `${appUrl(environment)}/api/oauth/microsoft/callback`,
    });
  return {
    provider,
    ...parsed,
    authorizationEndpoint: `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/authorize`,
    tokenEndpoint: `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`,
    scopes: [
      "openid",
      "email",
      "profile",
      "offline_access",
      "User.Read",
      "Mail.ReadWrite",
      "Mail.Send",
    ],
    extraAuthorizationParameters: {
      response_mode: "query",
      prompt: "select_account",
    },
  };
}

export function isOAuthProviderConfigured(
  provider: Exclude<MailProviderName, "mock">,
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  try {
    readOAuthProviderConfig(provider, environment);
    return true;
  } catch {
    return false;
  }
}

export function buildAuthorizationUrl(input: {
  config: OAuthProviderConfig;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL(input.config.authorizationEndpoint);
  const parameters = {
    client_id: input.config.clientId,
    redirect_uri: input.config.redirectUri,
    response_type: "code",
    scope: input.config.scopes.join(" "),
    state: input.state,
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
    ...input.config.extraAuthorizationParameters,
  };
  Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

function normalizeTokenSet(
  payload: z.infer<typeof tokenResponseSchema>,
  requestedScopes: string[],
  previousRefreshToken?: string | null,
): OAuthTokenSet {
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? previousRefreshToken ?? null,
    expiresAt: new Date(Date.now() + payload.expires_in * 1000).toISOString(),
    scopes: payload.scope?.split(/\s+/).filter(Boolean) ?? requestedScopes,
  };
}

async function readTokenResponse(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      "Le provider a refusé l’échange OAuth. Vérifiez la redirect URI et les secrets.",
    );
  }
  return tokenResponseSchema.parse(payload);
}

export async function exchangeAuthorizationCode(input: {
  config: OAuthProviderConfig;
  code: string;
  codeVerifier: string;
  fetcher?: typeof fetch;
}): Promise<OAuthTokenSet> {
  const response = await (input.fetcher ?? fetch)(input.config.tokenEndpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: input.config.clientId,
      client_secret: input.config.clientSecret,
      code: input.code,
      code_verifier: input.codeVerifier,
      redirect_uri: input.config.redirectUri,
      grant_type: "authorization_code",
      scope: input.config.scopes.join(" "),
    }),
    cache: "no-store",
  });
  return normalizeTokenSet(await readTokenResponse(response), input.config.scopes);
}

export async function refreshOAuthToken(input: {
  config: OAuthProviderConfig;
  refreshToken: string;
  fetcher?: typeof fetch;
}): Promise<OAuthTokenSet> {
  const response = await (input.fetcher ?? fetch)(input.config.tokenEndpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: input.config.clientId,
      client_secret: input.config.clientSecret,
      refresh_token: input.refreshToken,
      grant_type: "refresh_token",
      scope: input.config.scopes.join(" "),
    }),
    cache: "no-store",
  });
  return normalizeTokenSet(
    await readTokenResponse(response),
    input.config.scopes,
    input.refreshToken,
  );
}
