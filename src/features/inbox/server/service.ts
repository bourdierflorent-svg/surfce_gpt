import { createHash } from "node:crypto";

import { assertOrganizationPermission } from "@/features/organizations/server/authorization";
import { getProviderForOutboundMailbox } from "@/features/mailboxes/server/service";
import { hashJson } from "@/lib/ai/hash";
import { THREAD_REPLY_PROMPT_VERSION } from "@/lib/ai/prompts/thread-reply.v1";
import { THREAD_SUMMARY_PROMPT_VERSION } from "@/lib/ai/prompts/thread-summary.v1";
import { runProviderOperation } from "@/lib/providers/quota";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAiProvider } from "@/providers/ai";
import type { ThreadIntelligenceInput } from "@/providers/ai/types";
import type { AppAuthContext } from "@/types/auth";
import type { Json } from "@/types/database";

import {
  associateThreadRequestSchema,
  classifyMessageRequestSchema,
  suggestedReplyOutputSchema,
  threadReplyRequestSchema,
  threadSummaryOutputSchema,
  type SuggestedReplyOutput,
  type ThreadSummaryOutput,
} from "../schemas";
import { getInboxThread } from "./queries";

function record(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function getWritableThread(context: AppAuthContext, threadId: string) {
  assertOrganizationPermission(context.membership.role, "inbox:write");
  if (context.isPreview) throw new Error("L’inbox est désactivée en mode aperçu.");
  const detail = await getInboxThread(context, threadId);
  if (!detail) throw new Error("Conversation introuvable.");
  return detail;
}

function buildIntelligenceInput(
  threadId: string,
  detail: NonNullable<Awaited<ReturnType<typeof getInboxThread>>>,
): ThreadIntelligenceInput {
  return {
    threadId,
    subject: detail.thread.subject ?? "(Sans objet)",
    contactName: detail.contact?.full_name ?? null,
    companyName: detail.company?.trade_name ?? detail.company?.legal_name ?? null,
    messages: detail.messages.slice(-12).map((message) => ({
      direction: message.direction,
      bodyText: message.body_text.slice(0, 4000),
      occurredAt: message.received_at ?? message.sent_at ?? message.created_at,
    })),
  };
}

async function recordAiRun(
  context: AppAuthContext,
  threadId: string,
  runType: string,
  promptVersion: string,
  input: ThreadIntelligenceInput,
  output: Json,
) {
  const supabase = await createSupabaseServerClient();
  const provider = getAiProvider();
  const { error } = await supabase.from("ai_runs").insert({
    organization_id: context.organization.id,
    run_type: runType,
    entity_type: "mail_thread",
    entity_id: threadId,
    provider: provider.name,
    model: provider.model,
    prompt_version: promptVersion,
    input_hash: hashJson({
      threadId,
      messageCount: input.messages.length,
      lastOccurredAt: input.messages.at(-1)?.occurredAt ?? null,
    }),
    input_snapshot: {
      threadId,
      messageCount: input.messages.length,
      directions: input.messages.map((message) => message.direction),
    },
    output,
    status: "completed",
    token_usage: { mode: provider.name === "mock_ai" ? "mock" : "provider" },
    created_by: context.user.id,
    completed_at: new Date().toISOString(),
  });
  if (error) throw new Error("Le résultat est prêt mais son audit IA a échoué.");
}

export async function classifyInboundMessage(
  context: AppAuthContext,
  messageId: string,
  input: unknown,
) {
  assertOrganizationPermission(context.membership.role, "inbox:write");
  if (context.isPreview) throw new Error("La classification est désactivée en mode aperçu.");
  const parsed = classifyMessageRequestSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("classify_inbound_message", {
    p_message_id: messageId,
    p_classification: parsed.classification,
    p_priority: parsed.priority,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function summarizeThread(
  context: AppAuthContext,
  threadId: string,
): Promise<ThreadSummaryOutput> {
  const detail = await getWritableThread(context, threadId);
  const input = buildIntelligenceInput(threadId, detail);
  const provider = getAiProvider();
  const supabase = await createSupabaseServerClient();
  const output = threadSummaryOutputSchema.parse(
    await runProviderOperation({
      client: supabase,
      organizationId: context.organization.id,
      provider: provider.name,
      operation: "thread_summary",
      sourceId: threadId,
      task: () => provider.summarizeThread(input),
    }),
  );
  await recordAiRun(
    context,
    threadId,
    "thread_summary",
    THREAD_SUMMARY_PROMPT_VERSION,
    input,
    output as unknown as Json,
  );
  const { error } = await supabase
    .from("mail_threads")
    .update({
      summary: output.summary,
      summary_data: output as unknown as Json,
      summary_generated_at: new Date().toISOString(),
      summary_prompt_version: THREAD_SUMMARY_PROMPT_VERSION,
    })
    .eq("organization_id", context.organization.id)
    .eq("id", threadId);
  if (error) throw new Error("Le résumé n’a pas pu être enregistré.");
  return output;
}

export async function draftThreadReply(
  context: AppAuthContext,
  threadId: string,
): Promise<SuggestedReplyOutput> {
  const detail = await getWritableThread(context, threadId);
  const input = buildIntelligenceInput(threadId, detail);
  const provider = getAiProvider();
  const supabase = await createSupabaseServerClient();
  const output = suggestedReplyOutputSchema.parse(
    await runProviderOperation({
      client: supabase,
      organizationId: context.organization.id,
      provider: provider.name,
      operation: "thread_reply_draft",
      sourceId: threadId,
      task: () => provider.draftThreadReply(input),
    }),
  );
  await recordAiRun(
    context,
    threadId,
    "thread_reply_draft",
    THREAD_REPLY_PROMPT_VERSION,
    input,
    output as unknown as Json,
  );
  const { error } = await supabase
    .from("mail_threads")
    .update({
      suggested_reply: output as unknown as Json,
      suggested_reply_generated_at: new Date().toISOString(),
    })
    .eq("organization_id", context.organization.id)
    .eq("id", threadId);
  if (error) throw new Error("La suggestion n’a pas pu être enregistrée.");
  return output;
}

export async function associateThread(context: AppAuthContext, threadId: string, input: unknown) {
  assertOrganizationPermission(context.membership.role, "inbox:write");
  if (context.isPreview) throw new Error("L’association est désactivée en mode aperçu.");
  const parsed = associateThreadRequestSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("associate_mail_thread", {
    p_thread_id: threadId,
    p_company_id: parsed.companyId ?? null,
    p_contact_id: parsed.contactId ?? null,
    p_campaign_id: parsed.campaignId ?? null,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function markThreadRead(context: AppAuthContext, threadId: string) {
  assertOrganizationPermission(context.membership.role, "inbox:write");
  if (context.isPreview) return { threadId, read: false };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("mail_threads")
    .update({ is_unread: false })
    .eq("organization_id", context.organization.id)
    .eq("id", threadId)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("La conversation ne peut pas être marquée comme lue.");
  return { threadId, read: true };
}

export async function replyToThread(context: AppAuthContext, threadId: string, input: unknown) {
  const detail = await getWritableThread(context, threadId);
  const parsed = threadReplyRequestSchema.parse(input);
  const latestInbound = detail.messages.findLast((message) => message.direction === "inbound");
  if (!latestInbound?.provider_message_id) {
    throw new Error("Aucun message entrant du provider ne permet de répondre dans ce fil.");
  }
  const sender = record(latestInbound.sender);
  if (typeof sender.email !== "string" || !sender.email.includes("@")) {
    throw new Error("L’adresse de réponse du contact est absente.");
  }
  const recipientEmail = sender.email;
  const replyToProviderMessageId = latestInbound.provider_message_id;

  const supabase = await createSupabaseServerClient();
  const fingerprint = createHash("sha256")
    .update(
      [detail.thread.id, latestInbound.provider_message_id, parsed.subject, parsed.bodyText].join(
        "\n",
      ),
    )
    .digest("hex");
  const deduplicationKey = `thread-reply:${fingerprint}`;
  const { data: existing } = await supabase
    .from("messages")
    .select("id, status, provider_message_id")
    .eq("organization_id", context.organization.id)
    .eq("deduplication_key", deduplicationKey)
    .maybeSingle();
  if (existing) {
    return {
      messageId: existing.id,
      sent: ["sent", "sent_mock", "delivered"].includes(existing.status),
      duplicate: true,
      providerMessageId: existing.provider_message_id,
    };
  }

  const bodyHtml = `<p>${escapeHtml(parsed.bodyText).replaceAll("\n", "<br>")}</p>`;
  const { data: pending, error: pendingError } = await supabase
    .from("messages")
    .insert({
      organization_id: context.organization.id,
      thread_id: detail.thread.id,
      campaign_id: detail.thread.campaign_id,
      provider_message_id: null,
      internet_message_id: null,
      in_reply_to: latestInbound.internet_message_id,
      deduplication_key: deduplicationKey,
      direction: "outbound",
      sender: {
        email: detail.mailbox.email_address,
        name: detail.mailbox.display_name,
      },
      recipients: [{ email: sender.email, name: sender.name ?? null }],
      cc: [],
      bcc: [],
      reply_to: [],
      subject: parsed.subject,
      body_text: parsed.bodyText,
      body_html: bodyHtml,
      status: "processing",
      classification: null,
      has_attachments: false,
      provider_metadata: {
        reply_to_provider_message_id: latestInbound.provider_message_id,
      },
      sent_at: null,
      received_at: null,
      headers: {
        "in-reply-to": latestInbound.internet_message_id,
      },
    })
    .select("*")
    .single();
  if (pendingError) throw new Error("La réponse n’a pas pu être réservée.");

  try {
    const provider = await getProviderForOutboundMailbox(supabase, detail.mailbox);
    const references = record(latestInbound.headers).references;
    const delivery = await runProviderOperation({
      client: supabase,
      organizationId: context.organization.id,
      provider: provider.name,
      operation: "send_reply",
      sourceId: pending.id,
      task: () =>
        provider.send({
          messageId: pending.id,
          from: { email: detail.mailbox.email_address, name: detail.mailbox.display_name },
          to: [
            {
              email: recipientEmail,
              name: typeof sender.name === "string" ? sender.name : undefined,
            },
          ],
          subject: parsed.subject,
          bodyText: parsed.bodyText,
          bodyHtml,
          idempotencyKey: deduplicationKey,
          providerThreadId: detail.thread.provider_thread_id,
          replyToProviderMessageId,
          inReplyTo: latestInbound.internet_message_id ?? undefined,
          references:
            typeof references === "string"
              ? references.split(/\s+/).filter(Boolean)
              : latestInbound.internet_message_id
                ? [latestInbound.internet_message_id]
                : [],
        }),
    });
    const status = delivery.mock ? "sent_mock" : "sent";
    const { error: updateError } = await supabase
      .from("messages")
      .update({
        provider_message_id: delivery.providerMessageId,
        sent_at: delivery.sentAt,
        status,
        provider_metadata: {
          provider: provider.name,
          mock: delivery.mock,
          reply: true,
        },
      })
      .eq("organization_id", context.organization.id)
      .eq("id", pending.id);
    if (updateError) throw new Error("Le provider a répondu, mais l’envoi n’a pas été finalisé.");
    await Promise.all([
      supabase.from("message_events").insert({
        organization_id: context.organization.id,
        message_id: pending.id,
        event_type: "sent",
        occurred_at: delivery.sentAt,
        provider_event_id: `reply:${delivery.providerMessageId}`,
        metadata: { provider: provider.name, mock: delivery.mock },
      }),
      supabase
        .from("mail_threads")
        .update({
          provider_thread_id: delivery.providerThreadId,
          last_message_at: delivery.sentAt,
          is_unread: false,
        })
        .eq("organization_id", context.organization.id)
        .eq("id", detail.thread.id),
      supabase.from("audit_logs").insert({
        organization_id: context.organization.id,
        actor_user_id: context.user.id,
        action: delivery.mock ? "thread.reply_sent_mock" : "thread.reply_sent",
        entity_type: "mail_thread",
        entity_id: detail.thread.id,
        after: {
          message_id: pending.id,
          provider_message_id: delivery.providerMessageId,
        },
      }),
    ]);
    return {
      messageId: pending.id,
      sent: true,
      duplicate: false,
      provider: provider.name,
      mock: delivery.mock,
    };
  } catch (error) {
    await supabase
      .from("messages")
      .update({
        status: "failed",
        error_code: "provider_reply_failed",
        error_message: "Le provider mail n’a pas confirmé la réponse.",
      })
      .eq("organization_id", context.organization.id)
      .eq("id", pending.id);
    throw error;
  }
}
