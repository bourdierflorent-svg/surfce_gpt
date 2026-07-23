import { NextResponse } from "next/server";

import { processDueCampaignMessagesAsService } from "@/features/messages/server/service";
import { safeSecretEqual } from "@/lib/http/secrets";

export async function POST(request: Request) {
  const configuredSecret = process.env.CRON_SECRET?.trim();
  if (!configuredSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET n’est pas configuré ; le moteur reste fermé." },
      { status: 503 },
    );
  }
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!safeSecretEqual(provided, configuredSecret)) {
    return NextResponse.json({ error: "Secret de planification invalide." }, { status: 401 });
  }
  try {
    return NextResponse.json(await processDueCampaignMessagesAsService());
  } catch {
    return NextResponse.json(
      { error: "Le traitement planifié des campagnes n’a pas abouti." },
      { status: 500 },
    );
  }
}
