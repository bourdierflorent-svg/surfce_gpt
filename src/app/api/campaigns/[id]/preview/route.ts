import { NextResponse } from "next/server";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { campaignActionRequestSchema } from "@/features/campaigns/schemas";
import { generateCampaignMessages } from "@/features/campaigns/server/service";

import { campaignActionError, invalidCampaignAction } from "../../route-utils";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const parsed = campaignActionRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return invalidCampaignAction(parsed.error);
  try {
    const context = await requireAppAuthContext();
    const { id } = await params;
    return NextResponse.json(
      await generateCampaignMessages(context, id, parsed.data.idempotencyKey),
    );
  } catch (error) {
    return campaignActionError(error);
  }
}
