import { NextResponse } from "next/server";

import { campaignActionError, invalidCampaignAction } from "@/app/api/campaigns/route-utils";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { sendMessageRequestSchema } from "@/features/messages/schemas";
import { processCampaignMessage } from "@/features/messages/server/service";

export async function POST(request: Request) {
  const parsed = sendMessageRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return invalidCampaignAction(parsed.error);
  try {
    const context = await requireAppAuthContext();
    return NextResponse.json(await processCampaignMessage(context, parsed.data.messageId));
  } catch (error) {
    return campaignActionError(error);
  }
}
