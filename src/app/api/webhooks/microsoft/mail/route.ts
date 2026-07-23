import { after, NextResponse } from "next/server";
import { z } from "zod";

import { syncMailbox } from "@/features/mailboxes/server/service";
import { safeSecretEqual } from "@/lib/http/secrets";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const graphNotificationSchema = z.object({
  value: z.array(
    z.object({
      subscriptionId: z.string().min(1),
      clientState: z.string().min(1).nullable().optional(),
      changeType: z.string().optional(),
    }),
  ),
});

export async function POST(request: Request) {
  const validationToken = new URL(request.url).searchParams.get("validationToken");
  if (validationToken) {
    return new NextResponse(validationToken, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  const clientState = process.env.MICROSOFT_WEBHOOK_CLIENT_STATE;
  if (!clientState) {
    return NextResponse.json({ error: "Webhook Microsoft non configuré." }, { status: 503 });
  }
  try {
    const payload = graphNotificationSchema.parse(await request.json());
    if (
      !payload.value.length ||
      payload.value.some((item) => !safeSecretEqual(item.clientState, clientState))
    ) {
      return NextResponse.json({ error: "Notification Microsoft non autorisée." }, { status: 401 });
    }
    const admin = createSupabaseAdminClient();
    const subscriptionIds = Array.from(new Set(payload.value.map((item) => item.subscriptionId)));
    const { data: mailboxes } = await admin
      .from("mailboxes")
      .select("id")
      .eq("provider", "microsoft")
      .in("watch_resource_id", subscriptionIds)
      .eq("status", "connected");
    for (const mailbox of mailboxes ?? []) {
      after(async () => {
        await syncMailbox(mailbox.id).catch(() => undefined);
      });
    }
    return new NextResponse(null, { status: 202 });
  } catch {
    return NextResponse.json({ error: "Notification Microsoft invalide." }, { status: 400 });
  }
}
