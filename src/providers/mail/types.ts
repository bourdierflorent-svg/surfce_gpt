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

export interface SendMessageInput {
  messageId: string;
  from: { email: string; name: string };
  to: Array<{ email: string; name?: string }>;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  idempotencyKey: string;
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
  messages: SentMessage[];
}

export interface MailChangePage {
  cursor: string | null;
  changes: [];
}

export interface WatchMailboxInput {
  connectionId: string;
}

export interface WatchResult {
  active: boolean;
  expiresAt: string | null;
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
