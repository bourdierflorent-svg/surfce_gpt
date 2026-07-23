import { NextResponse } from "next/server";

import {
  invalidOpportunityAction,
  opportunityActionError,
} from "@/app/api/opportunities/route-utils";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { updateOpportunityRequestSchema } from "@/features/opportunities/schemas";
import { updateOpportunity } from "@/features/opportunities/server/service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const parsed = updateOpportunityRequestSchema.safeParse(await request.json());
    if (!parsed.success) return invalidOpportunityAction(parsed.error);
    const context = await requireAppAuthContext();
    const { id } = await params;
    return NextResponse.json(await updateOpportunity(context, id, parsed.data));
  } catch (error) {
    return opportunityActionError(error);
  }
}
