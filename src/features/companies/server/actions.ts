"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { assertOrganizationPermission } from "@/features/organizations/server/authorization";
import { AuthorizationError } from "@/lib/errors/authorization-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { companyFormSchema, normalizeCompanyName, normalizeDomain } from "../schemas";

export interface CompanyActionState {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

function readFormData(formData: FormData) {
  return {
    legal_name: formData.get("legal_name"),
    trade_name: formData.get("trade_name"),
    siren: formData.get("siren"),
    primary_siret: formData.get("primary_siret"),
    legal_form: formData.get("legal_form"),
    sector: formData.get("sector"),
    subsector: formData.get("subsector"),
    activity_code: formData.get("activity_code"),
    description: formData.get("description"),
    website_url: formData.get("website_url"),
    domain: formData.get("domain"),
    phone: formData.get("phone"),
    generic_email: formData.get("generic_email"),
    employee_range: formData.get("employee_range"),
    revenue_range: formData.get("revenue_range"),
    address_line1: formData.get("address_line1"),
    address_line2: formData.get("address_line2"),
    postal_code: formData.get("postal_code"),
    city: formData.get("city"),
    country_code: formData.get("country_code"),
    district: formData.get("district"),
    status: formData.get("status"),
    qualification_score: formData.get("qualification_score"),
    data_quality_score: formData.get("data_quality_score"),
    assigned_to: formData.get("assigned_to"),
    tags: formData.get("tags"),
    do_not_contact: formData.get("do_not_contact") === "on",
    do_not_contact_reason: formData.get("do_not_contact_reason"),
  };
}

export async function updateCompanyAction(
  companyId: string,
  _previousState: CompanyActionState,
  formData: FormData,
): Promise<CompanyActionState> {
  const parsed = companyFormSchema.safeParse(readFormData(formData));
  if (!parsed.success) {
    return {
      success: false,
      message: "Corrigez les champs signalés.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const context = await requireAppAuthContext();
    assertOrganizationPermission(context.membership.role, "companies:write");
    if (context.isPreview) return { success: false, message: "Action désactivée en mode aperçu." };

    const supabase = await createSupabaseServerClient();
    const { data: current } = await supabase
      .from("companies")
      .select("assigned_to")
      .eq("id", companyId)
      .eq("organization_id", context.organization.id)
      .maybeSingle();
    if (!current) return { success: false, message: "Cette entreprise n’existe plus." };

    if (context.membership.role === "sales" && current.assigned_to !== context.user.id) {
      throw new AuthorizationError();
    }

    const data = parsed.data;
    const assignedTo = context.membership.role === "sales" ? context.user.id : data.assigned_to;
    const { error } = await supabase
      .from("companies")
      .update({
        ...data,
        normalized_name: normalizeCompanyName(data.trade_name ?? data.legal_name),
        domain: normalizeDomain(data.domain ?? data.website_url),
        assigned_to: assignedTo,
      })
      .eq("id", companyId)
      .eq("organization_id", context.organization.id);

    if (error) return { success: false, message: "La fiche n’a pas pu être enregistrée." };

    await supabase.from("data_sources").insert({
      organization_id: context.organization.id,
      entity_type: "company",
      entity_id: companyId,
      field_name: "record",
      provider: "manual",
      external_reference: `manual-${crypto.randomUUID()}`,
      raw_value: data,
      normalized_value: { ...data, domain: normalizeDomain(data.domain ?? data.website_url) },
      collected_at: new Date().toISOString(),
      last_verified_at: new Date().toISOString(),
      confidence: 1,
      is_inferred: false,
      metadata: { edited_by: context.user.id },
    });

    revalidatePath("/companies");
    revalidatePath(`/companies/${companyId}`);
    revalidatePath(`/companies/${companyId}/edit`);
    return { success: true, message: "Fiche entreprise enregistrée." };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { success: false, message: "Votre rôle ne permet pas de modifier cette fiche." };
    }
    return { success: false, message: "La fiche n’a pas pu être enregistrée." };
  }
}

export async function openCompanyAfterUpdate(companyId: string) {
  redirect(`/companies/${companyId}`);
}
