import { createHash } from "node:crypto";

import type {
  ConnectMailboxInput,
  MailboxConnection,
  MailChangePage,
  MailProvider,
  MailThread,
  SendMessageInput,
  SentMessage,
  WatchResult,
} from "./types";

function stableId(prefix: string, value: string): string {
  return `${prefix}_${createHash("sha256").update(value).digest("hex").slice(0, 24)}`;
}

export class MockMailProvider implements MailProvider {
  readonly name = "mock_mail";

  async connect(input: ConnectMailboxInput): Promise<MailboxConnection> {
    return {
      provider: this.name,
      providerAccountId: stableId("mock_account", `${input.userId}:${input.emailAddress}`),
      emailAddress: input.emailAddress,
      status: "connected",
      mock: true,
    };
  }

  async refresh(): Promise<void> {}

  async send(input: SendMessageInput): Promise<SentMessage> {
    return {
      provider: this.name,
      providerMessageId: stableId("mock_message", input.idempotencyKey),
      providerThreadId: stableId("mock_thread", `${input.to[0]?.email}:${input.subject}`),
      sentAt: new Date().toISOString(),
      mock: true,
      test: input.test ?? false,
    };
  }

  async getThread(threadId: string): Promise<MailThread> {
    return { providerThreadId: threadId, messages: [] };
  }

  async listChanges(cursor?: string): Promise<MailChangePage> {
    return { cursor: cursor ?? null, changes: [] };
  }

  async watch(): Promise<WatchResult> {
    return { active: false, expiresAt: null };
  }

  async stopWatch(): Promise<void> {}
}
