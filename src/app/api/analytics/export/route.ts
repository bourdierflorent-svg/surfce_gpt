import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { parseAnalyticsFilters } from "@/features/analytics/schemas";
import { exportAnalyticsCsv } from "@/features/analytics/server/service";
import { apiErrorResponse } from "@/lib/http/api-errors";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filters = parseAnalyticsFilters(Object.fromEntries(url.searchParams.entries()));
    const context = await requireAppAuthContext();
    const csv = await exportAnalyticsCsv(context, filters);
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="surfce-analyse-${filters.start}-${filters.end}.csv"`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return apiErrorResponse(error, {
      invalidMessage: "Les filtres de l’export sont invalides.",
      failureMessage: "L’export n’a pas été généré. Aucun fichier incomplet n’a été conservé.",
    });
  }
}
