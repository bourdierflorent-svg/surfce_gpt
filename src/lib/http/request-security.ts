import { type NextRequest, type NextResponse } from "next/server";

const REQUEST_ID_PATTERN = /^[a-zA-Z0-9._-]{1,100}$/;
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const SERVER_TO_SERVER_PREFIXES = ["/api/cron/", "/api/webhooks/"];
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

interface DynamicSecurityOptions {
  contentSecurityPolicy: string;
  requestId: string;
  rateLimit?: RateLimitDecision;
  cacheControl?: string;
}

function clientAddress(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || request.headers.get("x-real-ip") || "unknown").slice(0, 80);
}

function rateLimitPolicy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/login" && request.method === "POST") return { scope: "login", limit: 10 };
  if (
    path.startsWith("/api/") &&
    !SERVER_TO_SERVER_PREFIXES.some((prefix) => path.startsWith(prefix))
  ) {
    return { scope: "api", limit: 120 };
  }
  return null;
}

function cleanupRateLimitBuckets(now: number) {
  if (rateLimitBuckets.size < 2_000) return;
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  }
}

export function createRequestId(candidate: string | null) {
  return candidate && REQUEST_ID_PATTERN.test(candidate) ? candidate : crypto.randomUUID();
}

export function createNonce() {
  return btoa(crypto.randomUUID());
}

export function buildContentSecurityPolicy(nonce: string) {
  const scriptSources = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(process.env.NODE_ENV === "development" ? ["'unsafe-eval'"] : []),
  ];
  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://*.supabase.co",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export function shouldProtectMutation(request: NextRequest) {
  if (!MUTATION_METHODS.has(request.method) || !request.nextUrl.pathname.startsWith("/api/")) {
    return false;
  }
  return !SERVER_TO_SERVER_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix));
}

export function isTrustedMutation(request: NextRequest) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return fetchSite === "same-origin" || fetchSite === "same-site";

  try {
    const originUrl = new URL(origin);
    const allowedOrigins = new Set([request.nextUrl.origin]);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const requestHost = forwardedHost || request.headers.get("host");
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    if (requestHost) {
      const protocol = forwardedProtocol || request.nextUrl.protocol.replace(":", "");
      allowedOrigins.add(`${protocol}://${requestHost}`);
    }
    const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (configured) allowedOrigins.add(new URL(configured).origin);
    return allowedOrigins.has(originUrl.origin);
  } catch {
    return false;
  }
}

export function checkRequestRateLimit(request: NextRequest): RateLimitDecision {
  const policy = rateLimitPolicy(request);
  if (!policy) {
    return { allowed: true, limit: 0, remaining: 0, retryAfterSeconds: 0 };
  }

  const now = Date.now();
  cleanupRateLimitBuckets(now);
  const key = `${policy.scope}:${clientAddress(request)}`;
  const current = rateLimitBuckets.get(key);
  const bucket =
    current && current.resetAt > now
      ? current
      : {
          count: 0,
          resetAt: now + RATE_LIMIT_WINDOW_MS,
        };
  bucket.count += 1;
  rateLimitBuckets.set(key, bucket);
  return {
    allowed: bucket.count <= policy.limit,
    limit: policy.limit,
    remaining: Math.max(policy.limit - bucket.count, 0),
    retryAfterSeconds: Math.max(Math.ceil((bucket.resetAt - now) / 1000), 1),
  };
}

export function applyDynamicSecurityHeaders(
  response: NextResponse,
  options: DynamicSecurityOptions,
) {
  response.headers.set("content-security-policy", options.contentSecurityPolicy);
  response.headers.set("x-request-id", options.requestId);
  if (options.cacheControl) response.headers.set("cache-control", options.cacheControl);
  if (options.rateLimit?.limit) {
    response.headers.set("x-ratelimit-limit", String(options.rateLimit.limit));
    response.headers.set("x-ratelimit-remaining", String(options.rateLimit.remaining));
  }
  return response;
}
