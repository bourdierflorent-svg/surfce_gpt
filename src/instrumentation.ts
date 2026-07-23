import type { Instrumentation } from "next";

import { logger } from "@/lib/observability/logger";

export function register() {
  logger.info("application.started", {
    runtime: process.env.NEXT_RUNTIME ?? "nodejs",
    release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "local",
  });
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const errorName = error instanceof Error ? error.name : "UnknownError";
  const errorDigest =
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string"
      ? error.digest
      : "unhandled_error";
  logger.error("http.unhandled_error", {
    method: request.method,
    path: request.path.split("?")[0],
    route: context.routePath,
    routeType: context.routeType,
    errorName,
    errorCode: errorDigest,
  });
};
