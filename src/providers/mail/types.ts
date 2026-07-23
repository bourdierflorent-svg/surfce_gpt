export interface ConnectMailboxInput {
  userId: string;
  emailAddress: string;
  displayName: string;
}

export interface MailboxConnection {
  provider: string;
  providerAccountId: string;
  emailAddress: string;
  status: "connected";
  mock: boolean;
}

export type MailProviderName = "mock" | "google" | "microsoft";

export interface OAuthTokenSet {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
  scopes: string[];
}

export interface MailAddress {
  email: string;
  name?: string;
}

export interface ProviderAttachment {
  providerAttachmentId: string;
  fileName: string;
  contentType: string;
  size: number;
  isInline: boolean;
  contentId: string | null;
}

export interface NormalizedMailMessage {
  providerMessageId: string;
  providerThreadId: string;
  internetMessageId: string | null;
  inReplyTo: string | null;
  direction: "inbound" | "outbound";
  sender: MailAddress;
  recipients: MailAddress[];
  cc: MailAddress[];
  bcc: MailAddress[];
  replyTo: MailAddress[];
  subject: string;
  bodyText: string;
  bodyHtml: string;
  sentAt: string | null;
  receivedAt: string | null;
  hasAttachments: boolean;
  attachments: ProviderAttachment[];
  headers: Record<string, string>;
}

export interface SendMessageInput {
  messageId: string;
  from: { email: string; name: string };
  to: Array<{ email: string; name?: string }>;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  idempotencyKey: string;
  providerThreadId?: string;
  replyToProviderMessageId?: string;
  inReplyTo?: string;
  references?: string[];
  test?: boolean;
}

export interface SentMessage {
  provider: string;
  providerMessageId: string;
  providerThreadId: string;
  sentAt: string;
  mock: boolean;
  test: boolean;
}

export interface MailThread {
  providerThreadId: string;
  messages: NormalizedMailMessage[];
}

export interface MailChangePage {
  cursor: string | null;
  changes: NormalizedMailMessage[];
}

export interface WatchMailboxInput {
  connectionId: string;
}

export interface WatchResult {
  active: boolean;
  expiresAt: string | null;
  resourceId: string | null;
  cursor: string | null;
}

export interface MailProvider {
  readonly name: string;
  connect(input: ConnectMailboxInput): Promise<MailboxConnection>;
  refresh(connectionId: string): Promise<void>;
  send(input: SendMessageInput): Promise<SentMessage>;
  getThread(threadId: string): Promise<MailThread>;
  listChanges(cursor?: string): Promise<MailChangePage>;
  watch(input: WatchMailboxInput): Promise<WatchResult>;
  stopWatch(connectionId: string): Promise<void>;
}
