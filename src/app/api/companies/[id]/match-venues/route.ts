import { NextResponse } from "next/server";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { matchingRequestSchema } from "@/features/enrichment/schemas";
import { generateVenueMatches, selectVenueMatch } from "@/features/matching/server/service";

import { companyActionError, invalidCompanyAction } from "../../route-utils";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const parsed = matchingRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return invalidCompanyAction(parsed.error);
  try {
    const context = await requireAppAuthContext();
    const { id } = await params;
    if (parsed.data.action === "select") {
      return NextResponse.json(await selectVenueMatch(context, id, parsed.data.matchId));
    }
    return NextResponse.json(await generateVenueMatches(context, id, parsed.data.idempotencyKey));
  } catch (error) {
    return companyActionError(error);
  }
}
