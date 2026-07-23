import "server-only";

import { createHash } from "node:crypto";

import { AuthorizationError } from "@/lib/errors/authorization-error";
import { can } from "@/lib/permissions/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppAuthContext } from "@/types/auth";
import type { Json } from "@/types/database";

import { ANALYTICS_EXPORT_COLUMNS, reportToCsv } from "../aggregation";
import type { AnalyticsFilters } from "../schemas";
import { getAnalyticsReport } from "./queries";

export async function exportAnalyticsCsv(context: AppAuthContext, filters: AnalyticsFilters) {
  if (!can(context.membership.role, "analytics:export")) {
    throw new AuthorizationError("Votre rôle ne permet pas d’exporter les analyses.");
  }

  const report = await getAnalyticsReport(context, filters);
  const csv = reportToCsv(report);
  if (!context.isPreview) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("analytics_exports").insert({
      organization_id: context.organization.id,
      requested_by: context.user.id,
      export_type: "analytics_overview",
      format: "csv",
      filters: filters as unknown as Json,
      columns: [...ANALYTICS_EXPORT_COLUMNS],
      row_count: report.metrics.length,
      status: "completed",
      checksum: createHash("sha256").update(csv).digest("hex"),
      expires_at: null,
    });
    if (error) throw new Error(`L’export n’a pas pu être journalisé : ${error.message}`);
  }
  return csv;
}
