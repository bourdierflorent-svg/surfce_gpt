import { getWritableCompany } from "@/features/enrichment/server/access";
import {
  completeProviderJob,
  failProviderJob,
  startProviderJob,
} from "@/features/enrichment/server/jobs";
import { personaRowToOutput } from "@/features/personas/server/service";
import { hashJson } from "@/lib/ai/hash";
import {
  VENUE_MATCH_PROMPT_VERSION,
  VENUE_MATCH_SYSTEM_PROMPT,
} from "@/lib/ai/prompts/venue-match-rationale.v1";
import { runProviderOperation } from "@/lib/providers/quota";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAiProvider } from "@/providers/ai";
import type { AppAuthContext } from "@/types/auth";
import type { Json } from "@/types/database";

import { scoreVenueOffer } from "../scoring";

export interface MatchingActionResult {
  jobId: string;
  matchIds: string[];
  count: number;
  reused: boolean;
}

export async function generateVenueMatches(
  context: AppAuthContext,
  companyId: string,
  requestedKey?: string,
): Promise<MatchingActionResult> {
  const company = await getWritableCompany(context, companyId);
  const supabase = await createSupabaseServerClient();
  const [{ data: persona, error: personaError }, { data: venues }, { data: offers }] =
    await Promise.all([
      supabase
        .from("personas")
        .select("*")
        .eq("organization_id", context.organization.id)
        .eq("company_id", companyId)
        .in("status", ["draft", "validated"])
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("venues")
        .select("*")
        .eq("organization_id", context.organization.id)
        .eq("is_active", true),
      supabase
        .from("venue_offers")
        .select("*")
        .eq("organization_id", context.organization.id)
        .eq("is_active", true),
    ]);
  if (personaError || !persona) {
    throw new Error("Générez d’abord un persona structuré pour calculer les recommandations.");
  }
  const personaOutput = personaRowToOutput(persona);
  const venueById = new Map((venues ?? []).map((venue) => [venue.id, venue]));
  const candidates = (offers ?? [])
    .map((offer) => {
      const venue = venueById.get(offer.venue_id);
      return venue ? scoreVenueOffer(company, personaOutput, venue, offer) : null;
    })
    .filter((candidate) => candidate !== null)
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);
  if (candidates.length === 0) {
    throw new Error(
      "Aucune offre active et compatible n’est disponible. Aucun score n’a été forcé.",
    );
  }

  const ai = getAiProvider();
  const snapshot = {
    companyId,
    personaId: persona.id,
    personaVersion: persona.version,
    candidates: candidates.map((candidate) => ({
      venueId: candidate.venue.id,
      offerId: candidate.offer.id,
      venueUpdatedAt: candidate.venue.updated_at,
      offerUpdatedAt: candidate.offer.updated_at,
    })),
    scoringVersion: "deterministic-v1",
    promptVersion: VENUE_MATCH_PROMPT_VERSION,
  };
  const inputHash = hashJson(snapshot);
  const key = requestedKey
    ? `matching:${companyId}:${requestedKey}`
    : `matching:${companyId}:${inputHash}`;
  const started = await startProviderJob(supabase, context, {
    idempotencyKey: key,
    jobType: "venue_matching",
    provider: `${ai.name}+deterministic-v1`,
    entityType: "company",
    entityId: companyId,
    input: snapshot as unknown as Json,
  });
  if (started.reused) {
    const output = started.job.output;
    if (output && typeof output === "object" && !Array.isArray(output)) {
      return { ...(output as unknown as MatchingActionResult), reused: true };
    }
  }

  let aiRunId: string | null = null;
  try {
    const { data: aiRun, error: aiRunError } = await supabase
      .from("ai_runs")
      .insert({
        organization_id: context.organization.id,
        run_type: "venue_match_rationale",
        entity_type: "company",
        entity_id: companyId,
        provider: ai.name,
        model: ai.model,
        prompt_version: VENUE_MATCH_PROMPT_VERSION,
        input_hash: inputHash,
        input_snapshot: snapshot as unknown as Json,
        status: "processing",
        created_by: context.user.id,
        token_usage: { mode: "mock", input_tokens: 0, output_tokens: 0 },
      })
      .select("id")
      .single();
    if (aiRunError)
      throw new Error("La justification des recommandations n’a pas pu être journalisée.");
    aiRunId = aiRun.id;

    const enriched = await Promise.all(
      candidates.map(async (candidate) => ({
        candidate,
        rationale: await runProviderOperation({
          client: supabase,
          organizationId: context.organization.id,
          provider: ai.name,
          operation: "venue_match_rationale",
          sourceId: companyId,
          task: () =>
            ai.generateVenueRationale({
              companyName: company.trade_name ?? company.legal_name,
              venueName: candidate.venue.name,
              offerName: candidate.offer.name,
              score: candidate.score,
              reasons: candidate.reasons,
              risks: candidate.risks,
            }),
        }),
      })),
    );
    const { data: matches, error: matchError } = await supabase
      .from("venue_matches")
      .upsert(
        enriched.map(({ candidate, rationale }) => ({
          organization_id: context.organization.id,
          company_id: companyId,
          persona_id: persona.id,
          venue_id: candidate.venue.id,
          offer_id: candidate.offer.id,
          score: candidate.score,
          score_breakdown: candidate.scoreBreakdown,
          reasons: rationale.reasons,
          risks: rationale.risks,
          recommended_pitch: rationale.recommendedPitch,
          model_version: `deterministic-v1+${VENUE_MATCH_PROMPT_VERSION}`,
        })),
        { onConflict: "organization_id,persona_id,venue_id,offer_id" },
      )
      .select("id");
    if (matchError)
      throw new Error("Les recommandations calculées n’ont pas pu être enregistrées.");

    const now = new Date().toISOString();
    const { error: aiCompleteError } = await supabase
      .from("ai_runs")
      .update({
        status: "completed",
        output: enriched.map(({ candidate, rationale }) => ({
          venue_id: candidate.venue.id,
          offer_id: candidate.offer.id,
          score: candidate.score,
          reasons: rationale.reasons,
          risks: rationale.risks,
          recommended_pitch: rationale.recommendedPitch,
        })) as unknown as Json,
        completed_at: now,
      })
      .eq("id", aiRunId);
    if (aiCompleteError)
      throw new Error("Les recommandations sont prêtes mais leur trace IA est incomplète.");

    const result: MatchingActionResult = {
      jobId: started.job.id,
      matchIds: (matches ?? []).map((match) => match.id),
      count: matches?.length ?? 0,
      reused: false,
    };
    await completeProviderJob(supabase, started.job.id, result as unknown as Json);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur de matching.";
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

export async function selectVenueMatch(
  context: AppAuthContext,
  companyId: string,
  matchId: string,
): Promise<{ matchId: string; selected: true }> {
  await getWritableCompany(context, companyId);
  const supabase = await createSupabaseServerClient();
  const { data: match, error } = await supabase
    .from("venue_matches")
    .select("id")
    .eq("id", matchId)
    .eq("company_id", companyId)
    .eq("organization_id", context.organization.id)
    .maybeSingle();
  if (error || !match) throw new Error("La recommandation à sélectionner n’est pas disponible.");
  const { error: resetError } = await supabase
    .from("venue_matches")
    .update({ is_selected: false })
    .eq("organization_id", context.organization.id)
    .eq("company_id", companyId);
  if (resetError) throw new Error("La recommandation précédente n’a pas pu être désélectionnée.");
  const { error: selectError } = await supabase
    .from("venue_matches")
    .update({ is_selected: true })
    .eq("id", matchId)
    .eq("organization_id", context.organization.id);
  if (selectError) throw new Error("La recommandation n’a pas pu être sélectionnée.");
  return { matchId, selected: true };
}

export const venueMatchPromptPolicy = VENUE_MATCH_SYSTEM_PROMPT;
