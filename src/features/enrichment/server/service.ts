import { hashJson } from "@/lib/ai/hash";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWebsiteEnrichmentProvider } from "@/providers/enrichment";
import { getCompanyRegistryProvider } from "@/providers/registries";
import { runProviderOperation } from "@/lib/providers/quota";
import type { AppAuthContext } from "@/types/auth";
import type { DataSourceRow, Json } from "@/types/database";

import { getWritableCompany } from "./access";
import { completeProviderJob, failProviderJob, startProviderJob } from "./jobs";

export interface EnrichmentActionResult {
  jobId: string;
  provider: string;
  sourceId: string;
  reused: boolean;
  estimatedCost: number;
  warnings: string[];
}

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

function previousResult(output: Json): EnrichmentActionResult | null {
  if (!output || typeof output !== "object" || Array.isArray(output)) return null;
  return output as unknown as EnrichmentActionResult;
}

async function writeSource(
  supabase: SupabaseServerClient,
  input: DataSourceRow["organization_id"] extends string
    ? {
        organizationId: string;
        companyId: string;
        fieldName: string;
        provider: string;
        externalReference: string;
        sourceUrl?: string;
        rawValue: Json;
        normalizedValue: Json;
        confidence: number;
        isInferred: boolean;
        metadata: Json;
      }
    : never,
): Promise<DataSourceRow> {
  const { data: existing } = await supabase
    .from("data_sources")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("entity_type", "company")
    .eq("entity_id", input.companyId)
    .eq("field_name", input.fieldName)
    .eq("provider", input.provider)
    .eq("external_reference", input.externalReference)
    .maybeSingle();
  const payload = {
    organization_id: input.organizationId,
    entity_type: "company",
    entity_id: input.companyId,
    field_name: input.fieldName,
    provider: input.provider,
    external_reference: input.externalReference,
    source_url: input.sourceUrl ?? null,
    raw_value: input.rawValue,
    normalized_value: input.normalizedValue,
    collected_at: new Date().toISOString(),
    last_verified_at: new Date().toISOString(),
    confidence: input.confidence,
    is_inferred: input.isInferred,
    metadata: input.metadata,
  };
  const query = existing
    ? supabase.from("data_sources").update(payload).eq("id", existing.id)
    : supabase.from("data_sources").insert(payload);
  const { data, error } = await query.select("*").single();
  if (error) throw new Error("La provenance de l’enrichissement n’a pas pu être enregistrée.");
  return data;
}

export async function enrichCompanyWebsite(
  context: AppAuthContext,
  companyId: string,
  requestedKey?: string,
): Promise<EnrichmentActionResult> {
  const company = await getWritableCompany(context, companyId);
  const provider = getWebsiteEnrichmentProvider();
  const supabase = await createSupabaseServerClient();
  const inputSnapshot = {
    companyId,
    domain: company.domain,
    websiteUrl: company.website_url,
    updatedAt: company.updated_at,
  };
  const key = requestedKey
    ? `website:${companyId}:${requestedKey}`
    : `website:${companyId}:${hashJson(inputSnapshot)}`;
  const started = await startProviderJob(supabase, context, {
    idempotencyKey: key,
    jobType: "website_analysis",
    provider: provider.name,
    entityType: "company",
    entityId: companyId,
    input: inputSnapshot as Json,
    estimatedCost: provider.estimatedCost,
  });
  if (started.reused) {
    const result = previousResult(started.job.output);
    if (result) return { ...result, reused: true };
  }

  try {
    const result = await runProviderOperation({
      client: supabase,
      organizationId: context.organization.id,
      provider: provider.name,
      operation: "website_analysis",
      sourceId: companyId,
      task: () =>
        provider.analyze({
          companyId,
          legalName: company.legal_name,
          tradeName: company.trade_name,
          websiteUrl: company.website_url,
          domain: company.domain,
          sector: company.sector,
          description: company.description,
        }),
    });
    const source = await writeSource(supabase, {
      organizationId: context.organization.id,
      companyId,
      fieldName: "website_analysis",
      provider: result.provider,
      externalReference: result.summary.externalReference ?? `mock-website:${companyId}`,
      sourceUrl: result.summary.sourceUrl,
      rawValue: { pages: result.pagesInspected, warnings: result.warnings },
      normalizedValue: {
        summary: result.summary.value,
        signals: result.signals as unknown as Json,
      },
      confidence: result.summary.confidence,
      isInferred: result.summary.isInferred,
      metadata: { mock: true, page_count: result.pagesInspected.length },
    });
    const nextQuality = Math.min(100, (company.data_quality_score ?? 50) + 5);
    const { error: companyError } = await supabase
      .from("companies")
      .update({
        data_quality_score: nextQuality,
        last_verified_at: new Date().toISOString(),
        status: company.status === "discovered" ? "qualified" : company.status,
      })
      .eq("id", companyId)
      .eq("organization_id", context.organization.id);
    if (companyError) throw new Error("L’analyse est prête mais la fiche n’a pas été actualisée.");

    const output: EnrichmentActionResult = {
      jobId: started.job.id,
      provider: provider.name,
      sourceId: source.id,
      reused: false,
      estimatedCost: provider.estimatedCost,
      warnings: result.warnings,
    };
    await completeProviderJob(supabase, started.job.id, output as unknown as Json);
    return output;
  } catch (error) {
    await failProviderJob(supabase, started.job.id, error);
    throw error;
  }
}

export async function verifyCompanyRegistry(
  context: AppAuthContext,
  companyId: string,
  requestedKey?: string,
): Promise<EnrichmentActionResult> {
  const company = await getWritableCompany(context, companyId);
  const provider = getCompanyRegistryProvider();
  const supabase = await createSupabaseServerClient();
  const inputSnapshot = {
    companyId,
    legalName: company.legal_name,
    siren: company.siren,
    primarySiret: company.primary_siret,
    updatedAt: company.updated_at,
  };
  const key = requestedKey
    ? `registry:${companyId}:${requestedKey}`
    : `registry:${companyId}:${hashJson(inputSnapshot)}`;
  const started = await startProviderJob(supabase, context, {
    idempotencyKey: key,
    jobType: "registry_verification",
    provider: provider.name,
    entityType: "company",
    entityId: companyId,
    input: inputSnapshot as Json,
    estimatedCost: provider.estimatedCost,
  });
  if (started.reused) {
    const result = previousResult(started.job.output);
    if (result) return { ...result, reused: true };
  }

  try {
    const result = await runProviderOperation({
      client: supabase,
      organizationId: context.organization.id,
      provider: provider.name,
      operation: "registry_verification",
      sourceId: companyId,
      task: () =>
        provider.verify({
          companyId,
          legalName: company.legal_name,
          siren: company.siren,
          primarySiret: company.primary_siret,
          sector: company.sector,
          city: company.city,
        }),
    });
    const source = await writeSource(supabase, {
      organizationId: context.organization.id,
      companyId,
      fieldName: "registry_record",
      provider: result.provider,
      externalReference: result.legalName.externalReference ?? `mock-registry:${companyId}`,
      rawValue: result as unknown as Json,
      normalizedValue: {
        legal_name: result.legalName.value,
        siren: result.siren.value,
        primary_siret: result.primarySiret.value,
        legal_form: result.legalForm.value,
        activity_code: result.activityCode.value,
        sector: result.sector.value,
        headquarters_city: result.headquartersCity.value,
      },
      confidence: result.legalName.confidence,
      isInferred: false,
      metadata: { mock: true, unknown_values_are_null: true },
    });
    const { error: companyError } = await supabase
      .from("companies")
      .update({
        legal_form: company.legal_form ?? result.legalForm.value,
        activity_code: company.activity_code ?? result.activityCode.value,
        last_verified_at: new Date().toISOString(),
      })
      .eq("id", companyId)
      .eq("organization_id", context.organization.id);
    if (companyError)
      throw new Error("La vérification est prête mais la fiche n’a pas été mise à jour.");

    const output: EnrichmentActionResult = {
      jobId: started.job.id,
      provider: provider.name,
      sourceId: source.id,
      reused: false,
      estimatedCost: provider.estimatedCost,
      warnings: result.siren.value ? [] : ["SIREN inconnu : aucune valeur n’a été inventée."],
    };
    await completeProviderJob(supabase, started.job.id, output as unknown as Json);
    return output;
  } catch (error) {
    await failProviderJob(supabase, started.job.id, error);
    throw error;
  }
}
