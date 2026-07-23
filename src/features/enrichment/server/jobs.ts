import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProviderQuotaError } from "@/lib/providers/quota";
import type { AppAuthContext } from "@/types/auth";
import type { Json, ProviderJobRow } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

interface StartJobInput {
  idempotencyKey: string;
  jobType: string;
  provider: string;
  entityType: string;
  entityId: string;
  input: Json;
  estimatedCost?: number;
}

export interface StartedJob {
  job: ProviderJobRow;
  reused: boolean;
}

function throwProviderJobError(error: { message: string; hint?: string } | null) {
  if (error?.message.includes("provider_quota_exceeded")) {
    throw new ProviderQuotaError(Number(error.hint) || 60);
  }
}

export async function startProviderJob(
  supabase: SupabaseServerClient,
  context: AppAuthContext,
  input: StartJobInput,
): Promise<StartedJob> {
  const { data: existing, error: existingError } = await supabase
    .from("provider_jobs")
    .select("*")
    .eq("organization_id", context.organization.id)
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  if (existingError) throw new Error("Impossible de vérifier l’idempotence du traitement.");
  if (existing?.status === "completed") return { job: existing, reused: true };
  if (existing?.status === "processing") {
    throw new Error("Ce traitement est déjà en cours. Une relance immédiate n’est pas nécessaire.");
  }

  const now = new Date().toISOString();
  if (existing) {
    if (existing.attempt_count >= 5) {
      throw new Error("Ce traitement a atteint sa limite de relances.");
    }
    const { data, error } = await supabase
      .from("provider_jobs")
      .update({
        status: "processing",
        error: null,
        output: null,
        attempt_count: existing.attempt_count + 1,
        started_at: now,
        completed_at: null,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) {
      throwProviderJobError(error);
      throw new Error("La relance du traitement n’a pas pu démarrer.");
    }
    return { job: data, reused: false };
  }

  const { data, error } = await supabase
    .from("provider_jobs")
    .insert({
      organization_id: context.organization.id,
      idempotency_key: input.idempotencyKey,
      job_type: input.jobType,
      provider: input.provider,
      entity_type: input.entityType,
      entity_id: input.entityId,
      status: "processing",
      input: input.input,
      attempt_count: 1,
      estimated_cost: input.estimatedCost ?? 0,
      started_at: now,
    })
    .select("*")
    .single();
  if (error) {
    throwProviderJobError(error);
    throw new Error("Le traitement n’a pas pu être journalisé.");
  }
  return { job: data, reused: false };
}

export async function completeProviderJob(
  supabase: SupabaseServerClient,
  jobId: string,
  output: Json,
): Promise<void> {
  const { error } = await supabase
    .from("provider_jobs")
    .update({
      status: "completed",
      output,
      error: null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);
  if (error) throw new Error("Le résultat est prêt mais son journal n’a pas pu être finalisé.");
}

export async function failProviderJob(
  supabase: SupabaseServerClient,
  jobId: string,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : "Erreur de traitement inconnue.";
  await supabase
    .from("provider_jobs")
    .update({
      status: "failed",
      error: message.slice(0, 2000),
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}
