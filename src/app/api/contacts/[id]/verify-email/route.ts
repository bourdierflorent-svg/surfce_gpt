import { NextResponse } from "next/server";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { verifyContactEmailRequestSchema } from "@/features/contacts/schemas";
import { verifyContactEmail } from "@/features/contacts/server/service";
import { campaignActionError, invalidCampaignAction } from "@/app/api/campaigns/route-utils";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const parsed = verifyContactEmailRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return invalidCampaignAction(parsed.error);
  try {
    const context = await requireAppAuthContext();
    const { id } = await params;
    return NextResponse.json(await verifyContactEmail(context, id, parsed.data.idempotencyKey));
  } catch (error) {
    return campaignActionError(error);
  }
}
