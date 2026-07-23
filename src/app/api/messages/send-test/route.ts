import { NextResponse } from "next/server";

import { campaignActionError, invalidCampaignAction } from "@/app/api/campaigns/route-utils";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { sendTestMessageRequestSchema } from "@/features/messages/schemas";
import { sendTestMessage } from "@/features/messages/server/service";

export async function POST(request: Request) {
  const parsed = sendTestMessageRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return invalidCampaignAction(parsed.error);
  try {
    const context = await requireAppAuthContext();
    return NextResponse.json(
      await sendTestMessage(context, parsed.data.messageId, parsed.data.recipient),
    );
  } catch (error) {
    return campaignActionError(error);
  }
}
