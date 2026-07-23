import type {
  AuditLogRow,
  CampaignRow,
  CompanyRow,
  ContactRow,
  Json,
  MailboxRow,
  MailThreadRow,
  MessageAttachmentRow,
  MessageEventRow,
  MessageRow,
} from "@/types/database";

export interface InboxThreadListItem extends MailThreadRow {
  mailboxAddress: string;
  mailboxProvider: MailboxRow["provider"];
  contactName: string | null;
  companyName: string | null;
  lastMessagePreview: string;
  lastDirection: MessageRow["direction"] | null;
  campaignStopped: boolean;
}

export interface InboxThreadDetail {
  thread: MailThreadRow;
  mailbox: MailboxRow;
  company: CompanyRow | null;
  contact: ContactRow | null;
  campaign: CampaignRow | null;
  messages: MessageRow[];
  events: MessageEventRow[];
  attachments: MessageAttachmentRow[];
  auditLogs: AuditLogRow[];
  associationOptions: {
    companies: Array<{ id: string; name: string }>;
    contacts: Array<{ id: string; company_id: string; name: string }>;
    campaigns: Array<{ id: string; name: string }>;
  };
}

export function asRecord(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
