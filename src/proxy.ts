import { type NextRequest, NextResponse } from "next/server";

import {
  applyDynamicSecurityHeaders,
  buildContentSecurityPolicy,
  checkRequestRateLimit,
  createNonce,
  createRequestId,
  isTrustedMutation,
  shouldProtectMutation,
} from "@/lib/http/request-security";
import { logger } from "@/lib/observability/logger";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

export default async function proxy(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = createRequestId(request.headers.get("x-request-id"));
  const nonce = createNonce();
  const requestHeaders = new Headers(request.headers);
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", contentSecurityPolicy);

  if (shouldProtectMutation(request) && !isTrustedMutation(request)) {
    logger.warn("http.csrf_rejected", {
      requestId,
      method: request.method,
      path: request.nextUrl.pathname,
      status: 403,
      durationMs: Date.now() - startedAt,
      errorCode: "csrf_origin_rejected",
    });
    const response = NextResponse.json(
      {
        error: "Origine de la requête non autorisée.",
        requestId,
      },
      { status: 403 },
    );
    return applyDynamicSecurityHeaders(response, {
      contentSecurityPolicy,
      requestId,
      cacheControl: "private, no-store",
    });
  }

  const rateLimit = checkRequestRateLimit(request);
  if (!rateLimit.allowed) {
    logger.warn("http.rate_limited", {
      requestId,
      method: request.method,
      path: request.nextUrl.pathname,
      status: 429,
      durationMs: Date.now() - startedAt,
      errorCode: "request_rate_limited",
    });
    const response = NextResponse.json(
      {
        error: "Trop de requêtes. Réessayez dans quelques instants.",
        requestId,
      },
      {
        status: 429,
        headers: {
          "retry-after": String(rateLimit.retryAfterSeconds),
        },
      },
    );
    return applyDynamicSecurityHeaders(response, {
      contentSecurityPolicy,
      requestId,
      rateLimit,
      cacheControl: "private, no-store",
    });
  }

  const response = await updateSupabaseSession(request, requestHeaders);
  applyDynamicSecurityHeaders(response, {
    contentSecurityPolicy,
    requestId,
    rateLimit,
    cacheControl: request.nextUrl.pathname.startsWith("/api/") ? "private, no-store" : undefined,
  });
  logger.info("http.request", {
    requestId,
    method: request.method,
    path: request.nextUrl.pathname,
    status: response.status,
    durationMs: Date.now() - startedAt,
  });
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
