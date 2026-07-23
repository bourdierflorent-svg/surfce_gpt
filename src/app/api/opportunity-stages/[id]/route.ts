import { NextResponse } from "next/server";

import {
  invalidOpportunityAction,
  opportunityActionError,
} from "@/app/api/opportunities/route-utils";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { stageConfigurationRequestSchema } from "@/features/opportunities/schemas";
import { updateOpportunityStageConfiguration } from "@/features/opportunities/server/service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const parsed = stageConfigurationRequestSchema.safeParse(await request.json());
    if (!parsed.success) return invalidOpportunityAction(parsed.error);
    const context = await requireAppAuthContext();
    const { id } = await params;
    return NextResponse.json(await updateOpportunityStageConfiguration(context, id, parsed.data));
  } catch (error) {
    return opportunityActionError(error);
  }
}
