import { NextResponse } from "next/server";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { enrollCampaignRequestSchema } from "@/features/campaigns/schemas";
import { enrollContact } from "@/features/campaigns/server/service";

import { campaignActionError, invalidCampaignAction } from "../../route-utils";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const parsed = enrollCampaignRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return invalidCampaignAction(parsed.error);
  try {
    const context = await requireAppAuthContext();
    const { id } = await params;
    return NextResponse.json(await enrollContact(context, id, parsed.data.contactId));
  } catch (error) {
    return campaignActionError(error);
  }
}
