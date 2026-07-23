import { NextResponse } from "next/server";

import { syncAllConnectedMailboxes } from "@/features/mailboxes/server/service";
import { safeSecretEqual } from "@/lib/http/secrets";

export async function POST(request: Request) {
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET n’est pas configuré." }, { status: 503 });
  }
  if (!safeSecretEqual(provided, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Secret de planification invalide." }, { status: 401 });
  }
  try {
    return NextResponse.json(await syncAllConnectedMailboxes());
  } catch {
    return NextResponse.json(
      { error: "La synchronisation planifiée n’a pas abouti." },
      { status: 500 },
    );
  }
}
