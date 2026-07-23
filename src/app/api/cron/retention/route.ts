import { NextResponse } from "next/server";

import { runScheduledRetention } from "@/features/compliance/server/service";
import { safeSecretEqual } from "@/lib/http/secrets";

export async function POST(request: Request) {
  const configuredSecret = process.env.CRON_SECRET?.trim();
  if (!configuredSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET n’est pas configuré ; la rétention reste fermée." },
      { status: 503 },
    );
  }
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!safeSecretEqual(provided, configuredSecret)) {
    return NextResponse.json({ error: "Secret de planification invalide." }, { status: 401 });
  }
  try {
    return NextResponse.json(await runScheduledRetention());
  } catch {
    return NextResponse.json(
      { error: "Le traitement planifié de rétention n’a pas abouti." },
      { status: 500 },
    );
  }
}
