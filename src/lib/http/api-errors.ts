import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthorizationError } from "@/lib/errors/authorization-error";
import { logger } from "@/lib/observability/logger";
import { ProviderQuotaError } from "@/lib/providers/quota";

interface ApiErrorOptions {
  failureMessage: string;
  invalidMessage?: string;
}

export function apiErrorResponse(error: unknown, options: ApiErrorOptions) {
  if (error instanceof ZodError || error instanceof SyntaxError) {
    return NextResponse.json(
      { error: options.invalidMessage ?? "La requête transmise est invalide." },
      { status: 400 },
    );
  }
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ error: "Votre rôle ne permet pas cette action." }, { status: 403 });
  }
  if (error instanceof ProviderQuotaError) {
    return NextResponse.json(
      {
        error: error.message,
        safeToRetry: true,
      },
      {
        status: 429,
        headers: { "retry-after": String(error.retryAfterSeconds) },
      },
    );
  }
  if (
    error instanceof Error &&
    /suppression|opposition|do.?not.?contact|contact.*suppressed/i.test(error.message)
  ) {
    return NextResponse.json(
      {
        error:
          "Inscription bloquée : une opposition active interdit tout nouvel envoi à ce contact.",
        safeToRetry: false,
      },
      { status: 409 },
    );
  }

  logger.error("api.operation_failed", {
    status: 500,
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorCode: "api_operation_failed",
  });
  return NextResponse.json(
    {
      error: options.failureMessage,
      safeToRetry: true,
    },
    { status: 500 },
  );
}
