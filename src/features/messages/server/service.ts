import type { SupabaseClient } from "@supabase/supabase-js";

import { loadMessageForSending } from "@/features/campaigns/server/service";
import { getProviderForOutboundMailbox } from "@/features/mailboxes/server/service";
import { assertOrganizationPermission } from "@/features/organizations/server/authorization";
import { runProviderOperation } from "@/lib/providers/quota";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppAuthContext } from "@/types/auth";
import type { ContactRow, Database, Json, MailboxRow, MessageRow } from "@/types/database";

type DatabaseClient = SupabaseClient<Database>;

function asObject(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

async function deliverClaimedMessage(
  client: DatabaseClient,
  message: MessageRow,
  contact: ContactRow,
  mailbox: MailboxRow,
) {
  if (!contact.email) throw new Error("Le destinataire ne possède plus d’adresse e-mail.");
  const provider = await getProviderForOutboundMailbox(client, mailbox);
  const delivery = await runProviderOperation({
    client,
    organizationId: mailbox.organization_id,
    provider: provider.name,
    operation: "send_campaign_message",
    sourceId: message.id,
    task: () =>
      provider.send({
        messageId: message.id,
        from: { email: mailbox.email_address, name: mailbox.display_name },
        to: [{ email: contact.email!, name: contact.full_name }],
        subject: message.subject,
        bodyText: message.body_text,
        bodyHtml: message.body_html,
        idempotencyKey: message.deduplication_key,
      }),
  });
  const { data, error } = await client.rpc("finalize_campaign_message", {
    p_message_id: message.id,
    p_provider_message_id: delivery.providerMessageId,
    p_provider_thread_id: delivery.providerThreadId,
    p_sent_at: delivery.sentAt,
    p_mock: delivery.mock,
  });
  if (error) throw new Error(error.message);
  return {
    ...asObject(data),
    sent: asObject(data).sent === true,
    provider: provider.name,
    mock: delivery.mock,
    estimatedCost: 0,
  };
}

async function failClaimedMessage(client: DatabaseClient, messageId: string) {
  await client.rpc("fail_campaign_message", {
    p_message_id: messageId,
    p_error_code: "provider_error",
    p_error_message: "Le provider mail n’a pas confirmé la livraison.",
  });
}

export async function sendTestMessage(
  context: AppAuthContext,
  messageId: string,
  recipient?: string,
) {
  const { message, contact, mailbox } = await loadMessageForSending(context, messageId);
  const supabase = await createSupabaseServerClient();
  const provider = await getProviderForOutboundMailbox(supabase, mailbox);
  const result = await runProviderOperation({
    client: supabase,
    organizationId: context.organization.id,
    provider: provider.name,
    operation: "send_test_message",
    sourceId: message.id,
    task: () =>
      provider.send({
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
      }),
  });
  return {
    ...result,
    originalRecipient: contact.email,
    persisted: false,
    estimatedCost: 0,
  };
}

export async function processCampaignMessage(context: AppAuthContext, messageId: string) {
  assertOrganizationPermission(context.membership.role, "messages:send");
  if (context.isPreview) throw new Error("L’envoi est désactivé en mode aperçu.");
  const loaded = await loadMessageForSending(context, messageId);
  const admin = createSupabaseAdminClient();
  const { data: claimData, error: claimError } = await admin.rpc("claim_campaign_message", {
    p_message_id: messageId,
  });
  if (claimError) throw new Error(claimError.message);
  const claim = asObject(claimData);
  if (claim.claimed !== true) {
    return {
      ...claim,
      sent: false,
      provider: null,
      mock: false,
      estimatedCost: 0,
    };
  }

  try {
    return await deliverClaimedMessage(admin, loaded.message, loaded.contact, loaded.mailbox);
  } catch (error) {
    await failClaimedMessage(admin, messageId);
    throw error;
  }
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
  };
}

async function loadServiceMessage(client: DatabaseClient, messageId: string) {
  const { data: message, error } = await client
    .from("messages")
    .select("*")
    .eq("id", messageId)
    .maybeSingle();
  if (error || !message?.campaign_id || !message.enrollment_id) {
    throw new Error("Message de campagne introuvable.");
  }
  const [campaignResult, enrollmentResult] = await Promise.all([
    client.from("campaigns").select("mailbox_id").eq("id", message.campaign_id).single(),
    client
      .from("campaign_enrollments")
      .select("contact_id")
      .eq("id", message.enrollment_id)
      .single(),
  ]);
  if (campaignResult.error || enrollmentResult.error) {
    throw new Error("Contexte d’envoi incomplet.");
  }
  const [contactResult, mailboxResult] = await Promise.all([
    client.from("contacts").select("*").eq("id", enrollmentResult.data.contact_id).single(),
    client.from("mailboxes").select("*").eq("id", campaignResult.data.mailbox_id).single(),
  ]);
  if (contactResult.error || mailboxResult.error) {
    throw new Error("Destinataire ou boîte indisponible.");
  }
  return {
    message,
    contact: contactResult.data,
    mailbox: mailboxResult.data,
  };
}

async function processCampaignMessageAsService(client: DatabaseClient, messageId: string) {
  const { data, error } = await client.rpc("claim_campaign_message", {
    p_message_id: messageId,
  });
  if (error) throw new Error(error.message);
  const claim = asObject(data);
  if (claim.claimed !== true) return { ...claim, sent: false };
  try {
    const { message, contact, mailbox } = await loadServiceMessage(client, messageId);
    return await deliverClaimedMessage(client, message, contact, mailbox);
  } catch {
    await failClaimedMessage(client, messageId);
    return { messageId, sent: false, reason: "provider_error" };
  }
}

export async function processDueCampaignMessagesAsService(limit = 20) {
  const admin = createSupabaseAdminClient();
  const { data: messages, error } = await admin
    .from("messages")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at")
    .limit(Math.min(Math.max(limit, 1), 50));
  if (error) throw new Error("La file globale des messages est indisponible.");
  const outcomes = [];
  for (const message of messages ?? []) {
    outcomes.push(await processCampaignMessageAsService(admin, message.id));
  }
  return {
    processed: outcomes.length,
    sent: outcomes.filter((outcome) => outcome.sent === true).length,
    blocked: outcomes.filter((outcome) => outcome.sent !== true).length,
    outcomes,
  };
}
