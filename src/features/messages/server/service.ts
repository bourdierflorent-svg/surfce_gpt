import { loadMessageForSending } from "@/features/campaigns/server/service";
import { assertOrganizationPermission } from "@/features/organizations/server/authorization";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMailProvider } from "@/providers/mail";
import type { AppAuthContext } from "@/types/auth";
import type { Json } from "@/types/database";

function asObject(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export async function sendTestMessage(
  context: AppAuthContext,
  messageId: string,
  recipient?: string,
) {
  const { message, contact, mailbox } = await loadMessageForSending(context, messageId);
  const provider = getMailProvider();
  const result = await provider.send({
    messageId: message.id,
    from: { email: mailbox.email_address, name: mailbox.display_name },
    to: [
      {
        email: recipient ?? context.user.email,
        name: recipient ? undefined : (context.user.fullName ?? undefined),
      },
    ],
    subject: `[TEST] ${message.subject}`,
    bodyText: message.body_text,
    bodyHtml: message.body_html,
    idempotencyKey: `test:${message.deduplication_key}:${recipient ?? context.user.email}`,
    test: true,
  });
  return {
    ...result,
    originalRecipient: contact.email,
    persisted: false,
    estimatedCost: 0,
  };
}

export async function processCampaignMessage(context: AppAuthContext, messageId: string) {
  const { message, contact, mailbox } = await loadMessageForSending(context, messageId);
  if (!contact.email) throw new Error("Le destinataire ne possède plus d’adresse e-mail.");
  const provider = getMailProvider();
  const mockDelivery = await provider.send({
    messageId: message.id,
    from: { email: mailbox.email_address, name: mailbox.display_name },
    to: [{ email: contact.email, name: contact.full_name }],
    subject: message.subject,
    bodyText: message.body_text,
    bodyHtml: message.body_html,
    idempotencyKey: message.deduplication_key,
  });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("process_mock_campaign_message", {
    p_message_id: message.id,
    p_provider_message_id: mockDelivery.providerMessageId,
  });
  if (error) throw new Error(error.message);
  const outcome = asObject(data);
  if (outcome.sent === true && message.thread_id) {
    await supabase
      .from("mail_threads")
      .update({
        provider_thread_id: mockDelivery.providerThreadId,
        subject: message.subject,
        last_message_at: mockDelivery.sentAt,
      })
      .eq("organization_id", context.organization.id)
      .eq("id", message.thread_id);
  }
  return {
    ...outcome,
    sent: outcome.sent === true,
    provider: provider.name,
    mock: true,
    estimatedCost: 0,
  };
}

export async function processDueCampaignMessages(context: AppAuthContext, limit = 20) {
  assertOrganizationPermission(context.membership.role, "messages:send");
  if (context.isPreview) throw new Error("Le moteur est désactivé en mode aperçu.");
  const supabase = await createSupabaseServerClient();
  const { data: messages, error } = await supabase
    .from("messages")
    .select("id")
    .eq("organization_id", context.organization.id)
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at")
    .limit(Math.min(Math.max(limit, 1), 50));
  if (error) throw new Error("La file des messages planifiés est indisponible.");

  const outcomes = [];
  for (const message of messages ?? []) {
    outcomes.push(await processCampaignMessage(context, message.id));
  }
  return {
    processed: outcomes.length,
    sent: outcomes.filter((outcome) => outcome.sent === true).length,
    blocked: outcomes.filter((outcome) => outcome.sent !== true).length,
    outcomes,
    provider: "mock_mail",
  };
}
