import { NextResponse } from "next/server";

import { campaignActionError } from "@/app/api/campaigns/route-utils";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { processDueCampaignMessages } from "@/features/messages/server/service";

export async function POST(request: Request) {
  const configuredSecret = process.env.CRON_SECRET?.trim();
  if (!configuredSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET n’est pas configuré ; le moteur reste fermé." },
      { status: 503 },
    );
  }
  const provided = request.headers.get("authorization");
  if (provided !== `Bearer ${configuredSecret}`) {
    return NextResponse.json({ error: "Secret de planification invalide." }, { status: 401 });
  }
  try {
    const context = await requireAppAuthContext();
    return NextResponse.json(await processDueCampaignMessages(context));
  } catch (error) {
    return campaignActionError(error);
  }
}
