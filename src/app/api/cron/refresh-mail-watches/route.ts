import { NextResponse } from "next/server";

import { refreshExpiringMailboxWatches } from "@/features/mailboxes/server/service";
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
    return NextResponse.json(await refreshExpiringMailboxWatches());
  } catch {
    return NextResponse.json(
      { error: "Le renouvellement des watches n’a pas abouti." },
      { status: 500 },
    );
  }
}
