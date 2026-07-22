import { getWritableCompany } from "@/features/enrichment/server/access";
import {
  completeProviderJob,
  failProviderJob,
  startProviderJob,
} from "@/features/enrichment/server/jobs";
import { hashJson } from "@/lib/ai/hash";
import { PERSONA_PROMPT_VERSION, PERSONA_SYSTEM_PROMPT } from "@/lib/ai/prompts/persona.v1";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAiProvider } from "@/providers/ai";
import type { AppAuthContext } from "@/types/auth";
import type { Json, PersonaRow } from "@/types/database";

import { personaOutputSchema, type PersonaOutput } from "../schemas";

export interface PersonaActionResult {
  jobId: string;
  personaId: string;
  version: number;
  reused: boolean;
}

function storedOutput(row: PersonaRow): PersonaOutput {
  return personaOutputSchema.parse({
    company_type: row.company_type,
    summary: row.summary,
    estimated_size: row.estimated_size,
    event_maturity: { level: row.event_maturity, confidence: row.confidence },
    probable_needs: row.probable_needs,
    likely_contact_roles: row.likely_contact_roles,
    recommended_event_types: row.recommended_event_types,
    estimated_guest_range: row.estimated_guest_range,
    estimated_budget_range: row.estimated_budget_range,
    fit_score: row.fit_score,
    confidence: row.confidence,
    risks: row.risks,
    evidence: row.evidence,
  });
}

export function personaRowToOutput(row: PersonaRow): PersonaOutput {
  return storedOutput(row);
}

export async function generateCompanyPersona(
  context: AppAuthContext,
  companyId: string,
  requestedKey?: string,
): Promise<PersonaActionResult> {
  const company = await getWritableCompany(context, companyId);
  const supabase = await createSupabaseServerClient();
  const { data: sources, error: sourcesError } = await supabase
    .from("data_sources")
    .select("*")
    .eq("organization_id", context.organization.id)
    .eq("entity_type", "company")
    .eq("entity_id", companyId)
    .order("collected_at", { ascending: false });
  if (sourcesError) throw new Error("Les sources du persona ne sont pas disponibles.");

  const ai = getAiProvider();
  const snapshot = {
    company: {
      id: company.id,
      legalName: company.legal_name,
      tradeName: company.trade_name,
      sector: company.sector,
      subsector: company.subsector,
      employeeRange: company.employee_range,
      city: company.city,
      description: company.description,
    },
    sources: (sources ?? []).map((source) => ({
      id: source.id,
      provider: source.provider,
      fieldName: source.field_name,
      confidence: source.confidence,
      isInferred: source.is_inferred,
    })),
    promptVersion: PERSONA_PROMPT_VERSION,
  };
  const inputHash = hashJson(snapshot);
  const key = requestedKey
    ? `persona:${companyId}:${requestedKey}`
    : `persona:${companyId}:${inputHash}`;
  const started = await startProviderJob(supabase, context, {
    idempotencyKey: key,
    jobType: "persona_generation",
    provider: ai.name,
    entityType: "company",
    entityId: companyId,
    input: snapshot as unknown as Json,
  });
  if (started.reused) {
    const output = started.job.output;
    if (output && typeof output === "object" && !Array.isArray(output)) {
      return { ...(output as unknown as PersonaActionResult), reused: true };
    }
  }

  let aiRunId: string | null = null;
  try {
    const { data: aiRun, error: aiRunError } = await supabase
      .from("ai_runs")
      .insert({
        organization_id: context.organization.id,
        run_type: "persona_generation",
        entity_type: "company",
        entity_id: companyId,
        provider: ai.name,
        model: ai.model,
        prompt_version: PERSONA_PROMPT_VERSION,
        input_hash: inputHash,
        input_snapshot: snapshot as unknown as Json,
        status: "processing",
        created_by: context.user.id,
        token_usage: { mode: "mock", input_tokens: 0, output_tokens: 0 },
      })
      .select("id")
      .single();
    if (aiRunError) throw new Error("L’exécution du persona n’a pas pu être journalisée.");
    aiRunId = aiRun.id;

    const output = personaOutputSchema.parse(
      await ai.generatePersona({ company, sources: sources ?? [] }),
    );
    const { data: latest } = await supabase
      .from("personas")
      .select("version")
      .eq("organization_id", context.organization.id)
      .eq("company_id", companyId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const version = (latest?.version ?? 0) + 1;

    await supabase
      .from("personas")
      .update({ status: "superseded" })
      .eq("organization_id", context.organization.id)
      .eq("company_id", companyId)
      .eq("status", "draft");

    const { data: persona, error: personaError } = await supabase
      .from("personas")
      .insert({
        organization_id: context.organization.id,
        company_id: companyId,
        version,
        status: "draft",
        summary: output.summary,
        company_type: output.company_type,
        event_maturity: output.event_maturity.level,
        estimated_size: output.estimated_size,
        probable_needs: output.probable_needs,
        likely_contact_roles: output.likely_contact_roles,
        recommended_event_types: output.recommended_event_types,
        estimated_guest_range: output.estimated_guest_range,
        estimated_budget_range: output.estimated_budget_range,
        fit_score: output.fit_score,
        confidence: output.confidence,
        risks: output.risks,
        evidence: output.evidence,
        input_snapshot: snapshot as unknown as Json,
        model_provider: ai.name,
        model_name: ai.model,
        prompt_version: PERSONA_PROMPT_VERSION,
      })
      .select("id")
      .single();
    if (personaError) throw new Error("Le persona valide n’a pas pu être enregistré.");

    const now = new Date().toISOString();
    const { error: aiCompleteError } = await supabase
      .from("ai_runs")
      .update({
        status: "completed",
        output: output as unknown as Json,
        completed_at: now,
      })
      .eq("id", aiRunId);
    if (aiCompleteError)
      throw new Error("Le persona est prêt mais son exécution reste incomplète.");

    const result: PersonaActionResult = {
      jobId: started.job.id,
      personaId: persona.id,
      version,
      reused: false,
    };
    await completeProviderJob(supabase, started.job.id, result as unknown as Json);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur de génération du persona.";
    if (aiRunId) {
      await supabase
        .from("ai_runs")
        .update({ status: "failed", error: message, completed_at: new Date().toISOString() })
        .eq("id", aiRunId);
    }
    await failProviderJob(supabase, started.job.id, error);
    throw error;
  }
}

export async function validateCompanyPersona(
  context: AppAuthContext,
  companyId: string,
  personaId: string,
): Promise<{ personaId: string; status: "validated" }> {
  await getWritableCompany(context, companyId);
  const supabase = await createSupabaseServerClient();
  const { data: persona, error } = await supabase
    .from("personas")
    .select("id")
    .eq("id", personaId)
    .eq("company_id", companyId)
    .eq("organization_id", context.organization.id)
    .maybeSingle();
  if (error || !persona) throw new Error("Le persona à valider n’est pas disponible.");

  await supabase
    .from("personas")
    .update({ status: "superseded" })
    .eq("organization_id", context.organization.id)
    .eq("company_id", companyId)
    .eq("status", "validated")
    .neq("id", personaId);
  const { error: validationError } = await supabase
    .from("personas")
    .update({
      status: "validated",
      validated_by: context.user.id,
      validated_at: new Date().toISOString(),
    })
    .eq("id", personaId)
    .eq("organization_id", context.organization.id);
  if (validationError) throw new Error("La validation humaine n’a pas pu être enregistrée.");
  return { personaId, status: "validated" };
}

export const personaPromptPolicy = PERSONA_SYSTEM_PROMPT;
