import { after, NextResponse } from "next/server";
import { z } from "zod";

import { syncMailbox } from "@/features/mailboxes/server/service";
import { safeSecretEqual } from "@/lib/http/secrets";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const googlePushSchema = z.object({
  message: z.object({
    messageId: z.string().min(1),
    data: z.string().min(1),
  }),
});
const gmailNotificationSchema = z.object({
  emailAddress: z.string().email(),
  historyId: z.string().min(1),
});

export async function POST(request: Request) {
  const url = new URL(request.url);
  const provided = url.searchParams.get("token") ?? request.headers.get("x-surfce-webhook-secret");
  if (!process.env.GOOGLE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook Google non configuré." }, { status: 503 });
  }
  if (!safeSecretEqual(provided, process.env.GOOGLE_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Webhook Google non autorisé." }, { status: 401 });
  }
  try {
    const payload = googlePushSchema.parse(await request.json());
    const notification = gmailNotificationSchema.parse(
      JSON.parse(Buffer.from(payload.message.data, "base64").toString("utf8")),
    );
    const admin = createSupabaseAdminClient();
    const { data: mailbox } = await admin
      .from("mailboxes")
      .select("id")
      .eq("provider", "google")
      .ilike("email_address", notification.emailAddress)
      .eq("status", "connected")
      .maybeSingle();
    if (mailbox) {
      after(async () => {
        await syncMailbox(mailbox.id).catch(() => undefined);
      });
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Notification Google invalide." }, { status: 400 });
  }
}
