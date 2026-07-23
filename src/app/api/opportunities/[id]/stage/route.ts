import { NextResponse } from "next/server";

import {
  invalidOpportunityAction,
  opportunityActionError,
} from "@/app/api/opportunities/route-utils";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { moveOpportunityStageRequestSchema } from "@/features/opportunities/schemas";
import { moveOpportunityStage } from "@/features/opportunities/server/service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const parsed = moveOpportunityStageRequestSchema.safeParse(await request.json());
    if (!parsed.success) return invalidOpportunityAction(parsed.error);
    const context = await requireAppAuthContext();
    const { id } = await params;
    return NextResponse.json(
      await moveOpportunityStage(context, id, parsed.data.stageId, parsed.data.lossReason),
    );
  } catch (error) {
    return opportunityActionError(error);
  }
}
