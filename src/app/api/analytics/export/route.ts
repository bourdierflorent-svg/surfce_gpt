import { NextResponse } from "next/server";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { parseAnalyticsFilters } from "@/features/analytics/schemas";
import { exportAnalyticsCsv } from "@/features/analytics/server/service";
import { AuthorizationError } from "@/lib/errors/authorization-error";

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
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "L’export n’a pas abouti." },
      { status: 500 },
    );
  }
}
