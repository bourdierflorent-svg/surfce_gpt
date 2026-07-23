import { NextResponse } from "next/server";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { pauseCampaign } from "@/features/campaigns/server/service";

import { campaignActionError } from "../../route-utils";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const context = await requireAppAuthContext();
    const { id } = await params;
    return NextResponse.json(await pauseCampaign(context, id));
  } catch (error) {
    return campaignActionError(error);
  }
}
