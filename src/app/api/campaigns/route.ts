import { NextResponse } from "next/server";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { createCampaignRequestSchema } from "@/features/campaigns/schemas";
import { createCampaign } from "@/features/campaigns/server/service";

import { campaignActionError, invalidCampaignAction } from "./route-utils";

export async function POST(request: Request) {
  const parsed = createCampaignRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return invalidCampaignAction(parsed.error);
  try {
    const context = await requireAppAuthContext();
    return NextResponse.json(await createCampaign(context, parsed.data), { status: 201 });
  } catch (error) {
    return campaignActionError(error);
  }
}
