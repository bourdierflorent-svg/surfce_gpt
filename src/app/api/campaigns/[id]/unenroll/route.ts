import { NextResponse } from "next/server";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { unenrollCampaignRequestSchema } from "@/features/campaigns/schemas";
import { unenrollContact } from "@/features/campaigns/server/service";

import { campaignActionError, invalidCampaignAction } from "../../route-utils";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const parsed = unenrollCampaignRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return invalidCampaignAction(parsed.error);
  try {
    const context = await requireAppAuthContext();
    const { id } = await params;
    return NextResponse.json(
      await unenrollContact(context, id, parsed.data.enrollmentId, parsed.data.reason),
    );
  } catch (error) {
    return campaignActionError(error);
  }
}
