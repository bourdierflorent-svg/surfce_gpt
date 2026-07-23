import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { classifyInboundText } from "@/features/inbox/classification";
import { assertOrganizationPermission } from "@/features/organizations/server/authorization";
import { decryptSecret, encryptSecret, hasEncryptionKey } from "@/lib/crypto/oauth-tokens";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMailProvider } from "@/providers/mail";
import {
  isOAuthProviderConfigured,
  readOAuthProviderConfig,
  refreshOAuthToken,
} from "@/providers/mail/oauth";
import type {
  MailProvider,
  MailProviderName,
  NormalizedMailMessage,
  OAuthTokenSet,
} from "@/providers/mail/types";
import type { AppAuthContext } from "@/types/auth";
import type { Database, Json, MailboxRow } from "@/types/database";

import type { OAuthProvider } from "../oauth-state";

type DatabaseClient = SupabaseClient<Database>;

const ingestionResultSchema = z.object({
  messageId: z.string().uuid(),
  threadId: z.string().uuid(),
  ingested: z.boolean(),
  duplicate: z.boolean(),
});

export function getMailboxConfigurationStatus() {
  return {
    encryption: hasEncryptionKey(),
    google: isOAuthProviderConfigured("google"),
    microsoft: isOAuthProviderConfigured("microsoft"),
  };
}

async function refreshIfNeeded(
  client: DatabaseClient,
  mailbox: MailboxRow,
): Promise<{ mailbox: MailboxRow; accessToken: string | null }> {
  if (mailbox.provider === "mock") return { mailbox, accessToken: null };
  if (!mailbox.encrypted_access_token) {
    throw new Error("Le token d’accès chiffré de cette boîte est absent.");
  }
  let accessToken = decryptSecret(mailbox.encrypted_access_token);
  const expiresSoon =
    !mailbox.token_expires_at || Date.parse(mailbox.token_expires_at) <= Date.now() + 2 * 60 * 1000;
  if (!expiresSoon) return { mailbox, accessToken };
  if (!mailbox.encrypted_refresh_token) {
    throw new Error("Le token de renouvellement est absent. Reconnectez la boîte.");
  }
  const tokenSet = await refreshOAuthToken({
    config: readOAuthProviderConfig(mailbox.provider),
    refreshToken: decryptSecret(mailbox.encrypted_refresh_token),
  });
  accessToken = tokenSet.accessToken;
  const update = {
    encrypted_access_token: encryptSecret(tokenSet.accessToken),
    encrypted_refresh_token: tokenSet.refreshToken
      ? encryptSecret(tokenSet.refreshToken)
      : mailbox.encrypted_refresh_token,
    token_expires_at: tokenSet.expiresAt,
    oauth_scopes: tokenSet.scopes,
    status: "connected" as const,
    last_error_code: null,
    last_error_at: null,
  };
  const { data, error } = await client
    .from("mailboxes")
    .update(update)
    .eq("id", mailbox.id)
    .select("*")
    .single();
  if (error) throw new Error("Le token renouvelé n’a pas pu être enregistré.");
  return { mailbox: data, accessToken };
}

async function providerForMailbox(client: DatabaseClient, mailbox: MailboxRow) {
  const refreshed = await refreshIfNeeded(client, mailbox);
  return {
    mailbox: refreshed.mailbox,
    provider: getMailProvider(
      refreshed.mailbox.provider,
      refreshed.accessToken ?? undefined,
      refreshed.mailbox.email_address,
    ),
  };
}

export async function saveOAuthMailbox(
  context: AppAuthContext,
  providerName: OAuthProvider,
  tokenSet: OAuthTokenSet,
) {
  assertOrganizationPermission(context.membership.role, "mailboxes:write");
  if (context.isPreview) throw new Error("OAuth est désactivé en mode aperçu.");
  const supabase = await createSupabaseServerClient();
  const provider = getMailProvider(providerName, tokenSet.accessToken);
  const connection = await provider.connect({
    userId: context.user.id,
    emailAddress: context.user.email,
    displayName: context.user.fullName ?? context.user.email,
  });
  const { data: existing } = await supabase
    .from("mailboxes")
    .select("*")
    .eq("organization_id", context.organization.id)
    .eq("provider", providerName)
    .eq("provider_account_id", connection.providerAccountId)
    .maybeSingle();
  const encryptedRefreshToken = tokenSet.refreshToken
    ? encryptSecret(tokenSet.refreshToken)
    : (existing?.encrypted_refresh_token ?? null);
  if (!encryptedRefreshToken) {
    throw new Error(
      "Le provider n’a pas fourni de token hors ligne. Recommencez avec consentement.",
    );
  }
  const values = {
    organization_id: context.organization.id,
    user_id: context.user.id,
    provider: providerName,
    provider_account_id: connection.providerAccountId,
    email_address: connection.emailAddress,
    display_name: context.user.fullName ?? connection.emailAddress,
    encrypted_access_token: encryptSecret(tokenSet.accessToken),
    encrypted_refresh_token: encryptedRefreshToken,
    token_expires_at: tokenSet.expiresAt,
    oauth_scopes: tokenSet.scopes,
    status: "connected" as const,
    last_error_code: null,
    last_error_at: null,
    sync_failure_count: 0,
  };
  const operation = existing
    ? supabase.from("mailboxes").update(values).eq("id", existing.id)
    : supabase.from("mailboxes").insert(values);
  const { data: mailbox, error } = await operation.select("*").single();
  if (error) throw new Error("La boîte OAuth n’a pas pu être enregistrée.");

  const watch = await provider.watch({ connectionId: mailbox.id }).catch(() => ({
    active: false,
    expiresAt: null,
    resourceId: null,
    cursor: null,
  }));
  const { data: saved, error: watchError } = await supabase
    .from("mailboxes")
    .update({
      watch_expires_at: watch.expiresAt,
      watch_resource_id: watch.resourceId,
      sync_cursor: watch.cursor ?? mailbox.sync_cursor,
    })
    .eq("id", mailbox.id)
    .select("*")
    .single();
  if (watchError) throw new Error("La boîte est connectée, mais son watch n’a pas été conservé.");
  return saved;
}

function rpcPayload(mailbox: MailboxRow, message: NormalizedMailMessage) {
  return {
    p_mailbox_id: mailbox.id,
    p_provider_thread_id: message.providerThreadId,
    p_provider_message_id: message.providerMessageId,
    p_internet_message_id: message.internetMessageId,
    p_in_reply_to: message.inReplyTo,
    p_direction: message.direction,
    p_sender: message.sender as unknown as Json,
    p_recipients: message.recipients as unknown as Json,
    p_cc: message.cc as unknown as Json,
    p_bcc: message.bcc as unknown as Json,
    p_reply_to: message.replyTo as unknown as Json,
    p_subject: message.subject,
    p_body_text: message.bodyText,
    p_body_html: message.bodyHtml,
    p_sent_at: message.sentAt,
    p_received_at: message.receivedAt,
    p_classification:
      message.direction === "inbound" ? classifyInboundText(message.bodyText) : "unknown",
    p_has_attachments: message.hasAttachments,
    p_headers: message.headers as unknown as Json,
  };
}

async function persistAttachments(
  client: DatabaseClient,
  organizationId: string,
  messageId: string,
  message: NormalizedMailMessage,
) {
  if (!message.attachments.length) return;
  const { error } = await client.from("message_attachments").upsert(
    message.attachments.map((attachment) => ({
      organization_id: organizationId,
      message_id: messageId,
      provider_attachment_id: attachment.providerAttachmentId,
      file_name: attachment.fileName,
      content_type: attachment.contentType,
      size_bytes: attachment.size,
      is_inline: attachment.isInline,
      content_id: attachment.contentId,
    })),
    { onConflict: "message_id,provider_attachment_id" },
  );
  if (error) throw new Error("Les métadonnées de pièces jointes n’ont pas pu être enregistrées.");
}

export async function syncMailbox(mailboxId: string) {
  const admin = createSupabaseAdminClient();
  const { data: original, error } = await admin
    .from("mailboxes")
    .select("*")
    .eq("id", mailboxId)
    .maybeSingle();
  if (error || !original) throw new Error("Boîte introuvable.");
  if (original.status !== "connected") throw new Error("Cette boîte n’est pas connectée.");

  try {
    const { mailbox, provider } = await providerForMailbox(admin, original);
    const changes = await provider.listChanges(mailbox.sync_cursor ?? undefined);
    let ingested = 0;
    let duplicates = 0;
    let inbound = 0;
    for (const message of changes.changes) {
      const { data, error: ingestionError } = await admin.rpc(
        "ingest_provider_message",
        rpcPayload(mailbox, message),
      );
      if (ingestionError) throw new Error(ingestionError.message);
      const result = ingestionResultSchema.parse(data);
      if (result.ingested) ingested += 1;
      if (result.duplicate) duplicates += 1;
      if (message.direction === "inbound" && result.ingested) inbound += 1;
      await persistAttachments(admin, mailbox.organization_id, result.messageId, message);
    }
    await admin
      .from("mailboxes")
      .update({
        sync_cursor: changes.cursor ?? mailbox.sync_cursor,
        last_sync_at: new Date().toISOString(),
        sync_failure_count: 0,
        last_error_code: null,
        last_error_at: null,
        status: "connected",
      })
      .eq("id", mailbox.id);
    return {
      mailboxId: mailbox.id,
      provider: provider.name,
      received: changes.changes.length,
      ingested,
      duplicates,
      inbound,
    };
  } catch (syncError) {
    await admin
      .from("mailboxes")
      .update({
        sync_failure_count: Math.min(original.sync_failure_count + 1, 20),
        last_error_code: "sync_failed",
        last_error_at: new Date().toISOString(),
        status: original.sync_failure_count >= 2 ? "error" : original.status,
      })
      .eq("id", original.id);
    throw syncError;
  }
}

export async function syncAllConnectedMailboxes(limit = 25) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("mailboxes")
    .select("id")
    .eq("status", "connected")
    .neq("provider", "mock")
    .order("last_sync_at", { ascending: true, nullsFirst: true })
    .limit(Math.min(Math.max(limit, 1), 50));
  if (error) throw new Error("La file de synchronisation est indisponible.");
  const outcomes = [];
  for (const mailbox of data ?? []) {
    try {
      outcomes.push({ ok: true, ...(await syncMailbox(mailbox.id)) });
    } catch {
      outcomes.push({ ok: false, mailboxId: mailbox.id });
    }
  }
  return {
    processed: outcomes.length,
    succeeded: outcomes.filter((outcome) => outcome.ok).length,
    failed: outcomes.filter((outcome) => !outcome.ok).length,
    outcomes,
  };
}

export async function refreshMailboxWatch(mailboxId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("mailboxes").select("*").eq("id", mailboxId).single();
  if (error || data.provider === "mock") return { active: false, mailboxId };
  const { mailbox, provider } = await providerForMailbox(admin, data);
  const watch = await provider.watch({ connectionId: mailbox.watch_resource_id ?? mailbox.id });
  await admin
    .from("mailboxes")
    .update({
      watch_expires_at: watch.expiresAt,
      watch_resource_id: watch.resourceId ?? mailbox.watch_resource_id,
      sync_cursor: watch.cursor ?? mailbox.sync_cursor,
    })
    .eq("id", mailbox.id);
  return { ...watch, mailboxId: mailbox.id };
}

export async function refreshExpiringMailboxWatches() {
  const admin = createSupabaseAdminClient();
  const threshold = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("mailboxes")
    .select("id")
    .eq("status", "connected")
    .neq("provider", "mock")
    .or(`watch_expires_at.is.null,watch_expires_at.lt.${threshold}`)
    .limit(50);
  if (error) throw new Error("Les watches à renouveler sont indisponibles.");
  const outcomes = [];
  for (const mailbox of data ?? []) {
    try {
      outcomes.push({ ok: true, ...(await refreshMailboxWatch(mailbox.id)) });
    } catch {
      outcomes.push({ ok: false, mailboxId: mailbox.id });
    }
  }
  return outcomes;
}

export async function disconnectMailbox(context: AppAuthContext, mailboxId: string) {
  assertOrganizationPermission(context.membership.role, "mailboxes:write");
  if (context.isPreview) throw new Error("La déconnexion est désactivée en mode aperçu.");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("mailboxes")
    .select("*")
    .eq("organization_id", context.organization.id)
    .eq("id", mailboxId)
    .maybeSingle();
  if (error || !data) throw new Error("Boîte introuvable.");
  if (
    context.membership.role !== "admin" &&
    context.membership.role !== "sales_manager" &&
    data.user_id !== context.user.id
  ) {
    throw new Error("Vous ne pouvez déconnecter que votre propre boîte.");
  }
  if (data.provider !== "mock" && data.encrypted_access_token) {
    const { provider } = await providerForMailbox(supabase, data);
    await provider.stopWatch(data.watch_resource_id ?? "").catch(() => undefined);
  }
  const { error: updateError } = await supabase
    .from("mailboxes")
    .update({
      encrypted_access_token: null,
      encrypted_refresh_token: null,
      token_expires_at: null,
      sync_cursor: null,
      watch_expires_at: null,
      watch_resource_id: null,
      status: "disconnected",
    })
    .eq("id", data.id);
  if (updateError) throw new Error("La boîte n’a pas pu être déconnectée.");
  return { mailboxId: data.id, disconnected: true };
}

export async function getProviderForOutboundMailbox(
  client: DatabaseClient,
  mailbox: MailboxRow,
): Promise<MailProvider> {
  return (await providerForMailbox(client, mailbox)).provider;
}

export function providerLabel(provider: MailProviderName) {
  return provider === "google"
    ? "Google Workspace"
    : provider === "microsoft"
      ? "Microsoft 365"
      : "Mock";
}
