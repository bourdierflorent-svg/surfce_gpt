import { NextResponse } from "next/server";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { jobRequestSchema } from "@/features/enrichment/schemas";
import { enrichCompanyWebsite } from "@/features/enrichment/server/service";

import { companyActionError, invalidCompanyAction } from "../../route-utils";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const parsed = jobRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return invalidCompanyAction(parsed.error);
  try {
    const context = await requireAppAuthContext();
    const { id } = await params;
    return NextResponse.json(await enrichCompanyWebsite(context, id, parsed.data.idempotencyKey));
  } catch (error) {
    return companyActionError(error);
  }
}
