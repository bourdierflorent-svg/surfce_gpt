import { NextResponse } from "next/server";

import { campaignActionError, invalidCampaignAction } from "@/app/api/campaigns/route-utils";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { suppressContactRequestSchema } from "@/features/contacts/schemas";
import { suppressContact } from "@/features/contacts/server/service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const parsed = suppressContactRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return invalidCampaignAction(parsed.error);
  try {
    const context = await requireAppAuthContext();
    const { id } = await params;
    return NextResponse.json(
      await suppressContact(context, id, parsed.data.reason, parsed.data.source),
    );
  } catch (error) {
    return campaignActionError(error);
  }
}
