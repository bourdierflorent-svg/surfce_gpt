import { NextResponse } from "next/server";
import { z } from "zod";

import { inboundClassificationSchema } from "@/features/inbox/classification";
import { safeSecretEqual } from "@/lib/http/secrets";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const mockInboundSchema = z.object({
  mailboxId: z.string().uuid(),
  providerThreadId: z.string().min(1).max(300),
  providerMessageId: z.string().min(1).max(300),
  sender: z.object({ email: z.string().email(), name: z.string().max(200).optional() }),
  recipients: z.array(z.object({ email: z.string().email(), name: z.string().optional() })).min(1),
  subject: z.string().trim().min(1).max(300),
  bodyText: z.string().trim().min(1).max(12000),
  receivedAt: z.string().datetime().optional(),
  classification: inboundClassificationSchema.optional(),
});

interface ProviderWebhookProps {
  params: Promise<{ provider: string }>;
}

export async function POST(request: Request, { params }: ProviderWebhookProps) {
  if ((await params).provider !== "mock") {
    return NextResponse.json({ error: "Provider webhook inconnu." }, { status: 404 });
  }
  const provided = request.headers.get("x-surfce-webhook-secret");
  if (!process.env.MAIL_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook mock non configuré." }, { status: 503 });
  }
  if (!safeSecretEqual(provided, process.env.MAIL_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Webhook mock non autorisé." }, { status: 401 });
  }
  try {
    const input = mockInboundSchema.parse(await request.json());
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc("ingest_provider_message", {
      p_mailbox_id: input.mailboxId,
      p_provider_thread_id: input.providerThreadId,
      p_provider_message_id: input.providerMessageId,
      p_internet_message_id: null,
      p_in_reply_to: null,
      p_direction: "inbound",
      p_sender: input.sender,
      p_recipients: input.recipients,
      p_cc: [],
      p_bcc: [],
      p_reply_to: [],
      p_subject: input.subject,
      p_body_text: input.bodyText,
      p_body_html: "",
      p_sent_at: null,
      p_received_at: input.receivedAt ?? new Date().toISOString(),
      p_classification: input.classification ?? "unknown",
      p_has_attachments: false,
      p_headers: { mock: true },
    });
    if (error) throw new Error(error.message);
    return NextResponse.json(data, { status: 202 });
  } catch {
    return NextResponse.json({ error: "Notification mock invalide." }, { status: 400 });
  }
}
