import { NextResponse } from "next/server";

import {
  invalidOpportunityAction,
  opportunityActionError,
} from "@/app/api/opportunities/route-utils";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { createTaskRequestSchema } from "@/features/opportunities/schemas";
import { createOpportunityTask } from "@/features/opportunities/server/service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const parsed = createTaskRequestSchema.safeParse(await request.json());
    if (!parsed.success) return invalidOpportunityAction(parsed.error);
    const context = await requireAppAuthContext();
    const { id } = await params;
    return NextResponse.json(await createOpportunityTask(context, id, parsed.data), {
      status: 201,
    });
  } catch (error) {
    return opportunityActionError(error);
  }
}
