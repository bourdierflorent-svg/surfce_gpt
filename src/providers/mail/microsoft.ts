import { createHash } from "node:crypto";

import { z } from "zod";

import { sanitizeEmailHtml } from "@/lib/mail/sanitize-html";

import type {
  MailAddress,
  MailChangePage,
  MailProvider,
  MailThread,
  MailboxConnection,
  NormalizedMailMessage,
  SendMessageInput,
  SentMessage,
  WatchResult,
} from "./types";

const GRAPH_API = "https://graph.microsoft.com/v1.0";
const graphAddressSchema = z.object({
  emailAddress: z.object({ address: z.string(), name: z.string().optional() }),
});
const graphMessageSchema = z.object({
  id: z.string(),
  conversationId: z.string().nullable().optional(),
  internetMessageId: z.string().nullable().optional(),
  internetMessageHeaders: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
  from: graphAddressSchema.nullable().optional(),
  toRecipients: z.array(graphAddressSchema).default([]),
  ccRecipients: z.array(graphAddressSchema).default([]),
  bccRecipients: z.array(graphAddressSchema).default([]),
  replyTo: z.array(graphAddressSchema).default([]),
  subject: z.string().nullable().optional(),
  body: z.object({ contentType: z.string(), content: z.string() }),
  bodyPreview: z.string().nullable().optional(),
  sentDateTime: z.string().nullable().optional(),
  receivedDateTime: z.string().nullable().optional(),
  hasAttachments: z.boolean().default(false),
  isRead: z.boolean().default(true),
});

function address(value: z.infer<typeof graphAddressSchema>): MailAddress {
  return {
    email: value.emailAddress.address.toLowerCase(),
    name: value.emailAddress.name || undefined,
  };
}

function normalizeGraphMessage(raw: unknown, mailboxEmail: string): NormalizedMailMessage {
  const message = graphMessageSchema.parse(raw);
  const sender = message.from ? address(message.from) : { email: "" };
  const headerMap = Object.fromEntries(
    (message.internetMessageHeaders ?? []).map((header) => [
      header.name.toLowerCase(),
      header.value,
    ]),
  );
  const direction =
    sender.email.toLowerCase() === mailboxEmail.toLowerCase() ? "outbound" : "inbound";
  const isHtml = message.body.contentType.toLowerCase() === "html";
  return {
    providerMessageId: message.id,
    providerThreadId: message.conversationId ?? message.id,
    internetMessageId: message.internetMessageId ?? null,
    inReplyTo: headerMap["in-reply-to"] ?? null,
    direction,
    sender,
    recipients: message.toRecipients.map(address),
    cc: message.ccRecipients.map(address),
    bcc: message.bccRecipients.map(address),
    replyTo: message.replyTo.map(address),
    subject: message.subject || "(Sans objet)",
    bodyText: isHtml ? (message.bodyPreview ?? "") : message.body.content,
    bodyHtml: isHtml ? sanitizeEmailHtml(message.body.content) : "",
    sentAt: direction === "outbound" ? (message.sentDateTime ?? null) : null,
    receivedAt: direction === "inbound" ? (message.receivedDateTime ?? null) : null,
    hasAttachments: message.hasAttachments,
    attachments: [],
    headers: {
      "message-id": message.internetMessageId ?? "",
      "in-reply-to": headerMap["in-reply-to"] ?? "",
      references: headerMap.references ?? "",
      isRead: String(message.isRead),
    },
  };
}

function selectFields() {
  return [
    "id",
    "conversationId",
    "internetMessageId",
    "internetMessageHeaders",
    "from",
    "toRecipients",
    "ccRecipients",
    "bccRecipients",
    "replyTo",
    "subject",
    "body",
    "bodyPreview",
    "sentDateTime",
    "receivedDateTime",
    "hasAttachments",
    "isRead",
  ].join(",");
}

export class MicrosoftMailProvider implements MailProvider {
  readonly name = "microsoft";

  constructor(
    private readonly accessToken: string,
    private readonly mailboxEmail = "",
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  private async request(path: string, init?: RequestInit): Promise<Response> {
    const target = path.startsWith("http") ? new URL(path) : new URL(`${GRAPH_API}${path}`);
    if (target.origin !== "https://graph.microsoft.com") {
      throw new Error("Le curseur Microsoft Graph pointe vers un domaine non autorisé.");
    }
    const response = await this.fetcher(target, {
      ...init,
      headers: {
        authorization: `Bearer ${this.accessToken}`,
        "content-type": "application/json",
        Prefer: 'outlook.body-content-type="html", odata.maxpagesize=25',
        ...init?.headers,
      },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Microsoft Graph a répondu avec le statut ${response.status}.`);
    }
    return response;
  }

  async connect(): Promise<MailboxConnection> {
    const profile = z
      .object({
        id: z.string(),
        mail: z.string().email().nullable().optional(),
        userPrincipalName: z.string().email(),
        displayName: z.string(),
      })
      .parse(
        await (await this.request("/me?$select=id,mail,userPrincipalName,displayName")).json(),
      );
    return {
      provider: this.name,
      providerAccountId: profile.id,
      emailAddress: (profile.mail ?? profile.userPrincipalName).toLowerCase(),
      status: "connected",
      mock: false,
    };
  }

  async refresh(): Promise<void> {}

  async send(input: SendMessageInput): Promise<SentMessage> {
    if (input.replyToProviderMessageId) {
      await this.request(
        `/me/messages/${encodeURIComponent(input.replyToProviderMessageId)}/reply`,
        {
          method: "POST",
          body: JSON.stringify({
            message: {
              body: { contentType: "HTML", content: input.bodyHtml },
            },
          }),
        },
      );
    } else {
      await this.request("/me/sendMail", {
        method: "POST",
        body: JSON.stringify({
          message: {
            subject: input.subject,
            body: { contentType: "HTML", content: input.bodyHtml },
            toRecipients: input.to.map((recipient) => ({
              emailAddress: { address: recipient.email, name: recipient.name },
            })),
            internetMessageHeaders: [
              { name: "X-SURFCE-Idempotency-Key", value: input.idempotencyKey },
            ],
          },
          saveToSentItems: true,
        }),
      });
    }
    const stable = createHash("sha256").update(input.idempotencyKey).digest("hex").slice(0, 28);
    return {
      provider: this.name,
      providerMessageId: `graph_pending_${stable}`,
      providerThreadId: input.providerThreadId ?? `graph_thread_pending_${stable}`,
      sentAt: new Date().toISOString(),
      mock: false,
      test: input.test ?? false,
    };
  }

  async getThread(threadId: string): Promise<MailThread> {
    const url = new URL(`${GRAPH_API}/me/messages`);
    url.searchParams.set("$filter", `conversationId eq '${threadId.replaceAll("'", "''")}'`);
    url.searchParams.set("$select", selectFields());
    url.searchParams.set("$top", "50");
    const payload = z
      .object({ value: z.array(z.unknown()).default([]) })
      .parse(await (await this.request(url.toString())).json());
    return {
      providerThreadId: threadId,
      messages: payload.value.map((message) => normalizeGraphMessage(message, this.mailboxEmail)),
    };
  }

  async listChanges(cursor?: string): Promise<MailChangePage> {
    const initial = new URL(`${GRAPH_API}/me/mailFolders/inbox/messages/delta`);
    initial.searchParams.set("$select", selectFields());
    initial.searchParams.set("$top", "25");
    const response = await this.request(cursor || initial.toString());
    const payload = z
      .object({
        value: z.array(z.unknown()).default([]),
        "@odata.nextLink": z.string().url().optional(),
        "@odata.deltaLink": z.string().url().optional(),
      })
      .parse(await response.json());
    return {
      cursor: payload["@odata.deltaLink"] ?? payload["@odata.nextLink"] ?? cursor ?? null,
      changes: payload.value.map((message) => normalizeGraphMessage(message, this.mailboxEmail)),
    };
  }

  async watch(): Promise<WatchResult> {
    const clientState = process.env.MICROSOFT_WEBHOOK_CLIENT_STATE?.trim();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
    if (!clientState || !appUrl) {
      return { active: false, expiresAt: null, resourceId: null, cursor: null };
    }
    const expiresAt = new Date(Date.now() + 2.5 * 24 * 60 * 60 * 1000).toISOString();
    const payload = z.object({ id: z.string(), expirationDateTime: z.string() }).parse(
      await (
        await this.request("/subscriptions", {
          method: "POST",
          body: JSON.stringify({
            changeType: "created,updated",
            notificationUrl: `${appUrl}/api/webhooks/microsoft/mail`,
            lifecycleNotificationUrl: `${appUrl}/api/webhooks/microsoft/mail`,
            resource: "/me/mailFolders('inbox')/messages",
            expirationDateTime: expiresAt,
            clientState,
          }),
        })
      ).json(),
    );
    return {
      active: true,
      expiresAt: payload.expirationDateTime,
      resourceId: payload.id,
      cursor: null,
    };
  }

  async stopWatch(connectionId: string): Promise<void> {
    if (!connectionId) return;
    await this.request(`/subscriptions/${encodeURIComponent(connectionId)}`, { method: "DELETE" });
  }
}
