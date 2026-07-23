import { NextResponse } from "next/server";

import { campaignActionError, invalidCampaignAction } from "@/app/api/campaigns/route-utils";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { generateCampaignMessages } from "@/features/campaigns/server/service";
import { generateMessagesRequestSchema } from "@/features/messages/schemas";

export async function POST(request: Request) {
  const parsed = generateMessagesRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return invalidCampaignAction(parsed.error);
  try {
    const context = await requireAppAuthContext();
    return NextResponse.json(
      await generateCampaignMessages(context, parsed.data.campaignId, parsed.data.idempotencyKey),
    );
  } catch (error) {
    return campaignActionError(error);
  }
}
