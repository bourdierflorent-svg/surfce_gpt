import "server-only";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { logger } from "@/lib/observability/logger";
import type { Database } from "@/types/database";

type DatabaseClient = SupabaseClient<Database>;

interface ProviderOperationOptions<T> {
  client: DatabaseClient;
  organizationId: string;
  provider: string;
  operation: string;
  sourceId?: string | null;
  task: () => Promise<T>;
}

export class ProviderQuotaError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Le quota de ce provider est atteint. Réessayez dans quelques instants.");
    this.name = "ProviderQuotaError";
    this.retryAfterSeconds = Math.max(retryAfterSeconds, 1);
  }
}

function operationErrorCode(error: unknown) {
  if (error instanceof ProviderQuotaError) return "provider_quota_exceeded";
  if (error instanceof Error) return error.name.slice(0, 120) || "provider_error";
  return "provider_error";
}

async function finalizeOperation(
  client: DatabaseClient,
  eventId: string,
  status: "succeeded" | "failed",
  durationMs: number,
  errorCode?: string,
) {
  const { error } = await client.rpc("finalize_provider_operation", {
    p_event_id: eventId,
    p_status: status,
    p_duration_ms: durationMs,
    p_error_code: errorCode,
  });
  if (error) {
    logger.warn("provider.metric_finalize_failed", {
      providerEventId: eventId,
      status: 500,
      errorCode: "provider_metric_finalize_failed",
    });
  }
}

export async function runProviderOperation<T>({
  client,
  organizationId,
  provider,
  operation,
  sourceId,
  task,
}: ProviderOperationOptions<T>): Promise<T> {
  const requestId = randomUUID();
  const startedAt = Date.now();
  const { data, error } = await client.rpc("consume_provider_quota", {
    p_organization_id: organizationId,
    p_provider: provider,
    p_operation: operation,
    p_request_id: requestId,
    p_source_type: "direct",
    p_source_id: sourceId ?? null,
  });
  if (error) {
    logger.error("provider.quota_unavailable", {
      requestId,
      organizationId,
      provider,
      operation,
      durationMs: Date.now() - startedAt,
      status: 503,
      errorCode: "provider_quota_unavailable",
    });
    throw new Error("Le contrôle de quota du provider est indisponible.");
  }

  const decision = data?.[0];
  if (!decision) throw new Error("Le contrôle de quota du provider n’a retourné aucune décision.");
  if (!decision.allowed) {
    logger.warn("provider.quota_blocked", {
      requestId,
      organizationId,
      provider,
      operation,
      durationMs: Date.now() - startedAt,
      status: 429,
      errorCode: "provider_quota_exceeded",
    });
    throw new ProviderQuotaError(decision.retry_after_seconds);
  }

  try {
    const result = await task();
    const durationMs = Date.now() - startedAt;
    await finalizeOperation(client, decision.event_id, "succeeded", durationMs);
    logger.info("provider.operation", {
      requestId,
      organizationId,
      provider,
      operation,
      durationMs,
      status: 200,
    });
    return result;
  } catch (caught) {
    const durationMs = Date.now() - startedAt;
    const errorCode = operationErrorCode(caught);
    await finalizeOperation(client, decision.event_id, "failed", durationMs, errorCode);
    logger.error("provider.operation", {
      requestId,
      organizationId,
      provider,
      operation,
      durationMs,
      status: 502,
      errorCode,
    });
    throw caught;
  }
}
