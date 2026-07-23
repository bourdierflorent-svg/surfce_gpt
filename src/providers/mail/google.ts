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

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

const gmailHeaderSchema = z.object({ name: z.string(), value: z.string() });
interface GmailPart {
  mimeType?: string;
  filename?: string;
  headers?: Array<{ name: string; value: string }>;
  body?: { data?: string; size?: number; attachmentId?: string };
  parts?: GmailPart[];
}

const gmailPartSchema: z.ZodType<GmailPart> = z.lazy(() =>
  z.object({
    mimeType: z.string().optional(),
    filename: z.string().optional(),
    headers: z.array(gmailHeaderSchema).optional(),
    body: z
      .object({
        data: z.string().optional(),
        size: z.number().optional(),
        attachmentId: z.string().optional(),
      })
      .optional(),
    parts: z.array(gmailPartSchema).optional(),
  }),
);
const gmailMessageSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  internalDate: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
  payload: gmailPartSchema.optional(),
});

function decodeBase64Url(value?: string): string {
  return value ? Buffer.from(value, "base64url").toString("utf8") : "";
}

function headers(parts?: Array<{ name: string; value: string }>): Record<string, string> {
  return Object.fromEntries((parts ?? []).map((item) => [item.name.toLowerCase(), item.value]));
}

function parseAddress(value?: string): MailAddress {
  const match = value?.match(/^(?:"?([^"]*)"?\s)?<?([^<>\s]+@[^<>\s]+)>?$/);
  return {
    email: (match?.[2] ?? value ?? "").trim().toLowerCase(),
    name: match?.[1]?.trim() || undefined,
  };
}

function parseAddresses(value?: string): MailAddress[] {
  return (value ?? "")
    .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map((item) => parseAddress(item.trim()))
    .filter((item) => item.email.includes("@"));
}

function flattenParts(part?: z.infer<typeof gmailPartSchema>): z.infer<typeof gmailPartSchema>[] {
  if (!part) return [];
  return [part, ...(part.parts ?? []).flatMap((child) => flattenParts(child))];
}

function normalizeGmailMessage(raw: unknown, mailboxEmail: string): NormalizedMailMessage {
  const message = gmailMessageSchema.parse(raw);
  const allParts = flattenParts(message.payload);
  const messageHeaders = headers(message.payload?.headers);
  const sender = parseAddress(messageHeaders.from);
  const html = allParts.find((part) => part.mimeType === "text/html");
  const text = allParts.find((part) => part.mimeType === "text/plain");
  const attachmentParts = allParts.filter(
    (part) => Boolean(part.filename) && Boolean(part.body?.attachmentId),
  );
  const timestamp = message.internalDate
    ? new Date(Number(message.internalDate)).toISOString()
    : new Date().toISOString();
  const direction =
    sender.email.toLowerCase() === mailboxEmail.toLowerCase() ? "outbound" : "inbound";
  return {
    providerMessageId: message.id,
    providerThreadId: message.threadId,
    internetMessageId: messageHeaders["message-id"] ?? null,
    inReplyTo: messageHeaders["in-reply-to"] ?? null,
    direction,
    sender,
    recipients: parseAddresses(messageHeaders.to),
    cc: parseAddresses(messageHeaders.cc),
    bcc: parseAddresses(messageHeaders.bcc),
    replyTo: parseAddresses(messageHeaders["reply-to"]),
    subject: messageHeaders.subject || "(Sans objet)",
    bodyText: decodeBase64Url(text?.body?.data),
    bodyHtml: sanitizeEmailHtml(decodeBase64Url(html?.body?.data)),
    sentAt: direction === "outbound" ? timestamp : null,
    receivedAt: direction === "inbound" ? timestamp : null,
    hasAttachments: attachmentParts.length > 0,
    attachments: attachmentParts.map((part) => ({
      providerAttachmentId: part.body?.attachmentId ?? "",
      fileName: part.filename ?? "piece-jointe",
      contentType: part.mimeType ?? "application/octet-stream",
      size: part.body?.size ?? 0,
      isInline: headers(part.headers)["content-disposition"]?.includes("inline") ?? false,
      contentId: headers(part.headers)["content-id"] ?? null,
    })),
    headers: {
      "message-id": messageHeaders["message-id"] ?? "",
      "in-reply-to": messageHeaders["in-reply-to"] ?? "",
      references: messageHeaders.references ?? "",
    },
  };
}

function mimeSubject(value: string): string {
  return `=?UTF-8?B?${Buffer.from(value).toString("base64")}?=`;
}

function safeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function buildMimeMessage(input: SendMessageInput): string {
  const boundary = `surfce_${createHash("sha256").update(input.idempotencyKey).digest("hex").slice(0, 20)}`;
  const messageId = `<${createHash("sha256").update(input.idempotencyKey).digest("hex")}@surfce.local>`;
  const fromName = safeHeaderValue(input.from.name);
  const fromEmail = safeHeaderValue(input.from.email);
  const recipients = input.to
    .map((recipient) => {
      const email = safeHeaderValue(recipient.email);
      return recipient.name ? `${safeHeaderValue(recipient.name)} <${email}>` : email;
    })
    .join(", ");
  return [
    `From: ${fromName} <${fromEmail}>`,
    `To: ${recipients}`,
    `Subject: ${mimeSubject(input.subject)}`,
    `Message-ID: ${messageId}`,
    ...(input.inReplyTo ? [`In-Reply-To: ${safeHeaderValue(input.inReplyTo)}`] : []),
    ...(input.references?.length
      ? [`References: ${input.references.map(safeHeaderValue).join(" ")}`]
      : []),
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    input.bodyText,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "",
    input.bodyHtml,
    `--${boundary}--`,
  ].join("\r\n");
}

export class GmailMailProvider implements MailProvider {
  readonly name = "google";

  constructor(
    private readonly accessToken: string,
    private readonly mailboxEmail = "",
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  private async request(path: string, init?: RequestInit): Promise<Response> {
    const response = await this.fetcher(path.startsWith("http") ? path : `${GMAIL_API}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${this.accessToken}`,
        "content-type": "application/json",
        ...init?.headers,
      },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Gmail API a répondu avec le statut ${response.status}.`);
    return response;
  }

  async connect(): Promise<MailboxConnection> {
    const profile = z
      .object({ emailAddress: z.string().email(), historyId: z.string().optional() })
      .parse(await (await this.request("/profile")).json());
    return {
      provider: this.name,
      providerAccountId: profile.emailAddress.toLowerCase(),
      emailAddress: profile.emailAddress.toLowerCase(),
      status: "connected",
      mock: false,
    };
  }

  async refresh(): Promise<void> {}

  async send(input: SendMessageInput): Promise<SentMessage> {
    const payload = z.object({ id: z.string(), threadId: z.string() }).parse(
      await (
        await this.request("/messages/send", {
          method: "POST",
          body: JSON.stringify({
            raw: Buffer.from(buildMimeMessage(input)).toString("base64url"),
            ...(input.providerThreadId ? { threadId: input.providerThreadId } : {}),
          }),
        })
      ).json(),
    );
    return {
      provider: this.name,
      providerMessageId: payload.id,
      providerThreadId: payload.threadId,
      sentAt: new Date().toISOString(),
      mock: false,
      test: input.test ?? false,
    };
  }

  async getThread(threadId: string): Promise<MailThread> {
    const payload = z
      .object({ id: z.string(), messages: z.array(z.unknown()).default([]) })
      .parse(
        await (await this.request(`/threads/${encodeURIComponent(threadId)}?format=full`)).json(),
      );
    return {
      providerThreadId: payload.id,
      messages: payload.messages.map((message) =>
        normalizeGmailMessage(message, this.mailboxEmail),
      ),
    };
  }

  private async getMessage(messageId: string) {
    const response = await this.request(`/messages/${encodeURIComponent(messageId)}?format=full`);
    return normalizeGmailMessage(await response.json(), this.mailboxEmail);
  }

  async listChanges(cursor?: string): Promise<MailChangePage> {
    const ids = new Set<string>();
    let latestCursor = cursor ?? null;
    if (cursor) {
      const url = new URL(`${GMAIL_API}/history`);
      url.searchParams.set("startHistoryId", cursor);
      url.searchParams.set("historyTypes", "messageAdded");
      url.searchParams.set("labelId", "INBOX");
      const history = z
        .object({
          historyId: z.string().optional(),
          history: z
            .array(
              z.object({
                messagesAdded: z
                  .array(z.object({ message: z.object({ id: z.string() }) }))
                  .optional(),
              }),
            )
            .optional(),
        })
        .parse(await (await this.request(url.toString())).json());
      history.history?.forEach((entry) =>
        entry.messagesAdded?.forEach(({ message }) => ids.add(message.id)),
      );
      latestCursor = history.historyId ?? cursor;
    } else {
      const listed = z
        .object({ messages: z.array(z.object({ id: z.string() })).optional() })
        .parse(await (await this.request("/messages?labelIds=INBOX&maxResults=25")).json());
      listed.messages?.forEach((message) => ids.add(message.id));
      const profile = z
        .object({ historyId: z.string() })
        .parse(await (await this.request("/profile")).json());
      latestCursor = profile.historyId;
    }
    return {
      cursor: latestCursor,
      changes: await Promise.all(Array.from(ids).map((id) => this.getMessage(id))),
    };
  }

  async watch(): Promise<WatchResult> {
    const topicName = process.env.GOOGLE_PUBSUB_TOPIC?.trim();
    if (!topicName) return { active: false, expiresAt: null, resourceId: null, cursor: null };
    const payload = z.object({ historyId: z.string(), expiration: z.string() }).parse(
      await (
        await this.request("/watch", {
          method: "POST",
          body: JSON.stringify({
            topicName,
            labelIds: ["INBOX"],
            labelFilterBehavior: "INCLUDE",
          }),
        })
      ).json(),
    );
    return {
      active: true,
      expiresAt: new Date(Number(payload.expiration)).toISOString(),
      resourceId: null,
      cursor: payload.historyId,
    };
  }

  async stopWatch(): Promise<void> {
    await this.request("/stop", { method: "POST", body: "{}" });
  }
}
