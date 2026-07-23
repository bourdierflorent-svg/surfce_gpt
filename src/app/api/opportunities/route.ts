import { NextResponse } from "next/server";

import {
  invalidOpportunityAction,
  opportunityActionError,
} from "@/app/api/opportunities/route-utils";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { createOpportunityRequestSchema } from "@/features/opportunities/schemas";
import { createOpportunity } from "@/features/opportunities/server/service";

export async function POST(request: Request) {
  try {
    const parsed = createOpportunityRequestSchema.safeParse(await request.json());
    if (!parsed.success) return invalidOpportunityAction(parsed.error);
    const context = await requireAppAuthContext();
    return NextResponse.json(await createOpportunity(context, parsed.data), { status: 201 });
  } catch (error) {
    return opportunityActionError(error);
  }
}
