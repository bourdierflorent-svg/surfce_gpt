import { assertOrganizationPermission } from "@/features/organizations/server/authorization";
import { AuthorizationError } from "@/lib/errors/authorization-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppAuthContext } from "@/types/auth";
import type { CompanyRow } from "@/types/database";

export async function getWritableCompany(
  context: AppAuthContext,
  companyId: string,
): Promise<CompanyRow> {
  assertOrganizationPermission(context.membership.role, "intelligence:run");
  if (context.isPreview) {
    throw new Error("Les traitements sont désactivés en mode aperçu.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: company, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .eq("organization_id", context.organization.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error("Impossible de charger l’entreprise à traiter.");
  if (!company) throw new Error("Cette entreprise n’existe pas dans votre organisation.");
  if (context.membership.role === "sales" && company.assigned_to !== context.user.id) {
    throw new AuthorizationError();
  }
  return company;
}
