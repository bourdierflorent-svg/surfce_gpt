import type {
  CampaignEnrollmentRow,
  CampaignRow,
  MailboxRow,
  MessageRow,
  SequenceStepRow,
} from "@/types/database";
import type { EmailGenerationOutput } from "@/features/messages/schemas";

export interface CampaignListItem extends CampaignRow {
  mailboxAddress: string;
  enrollmentCount: number;
  sentCount: number;
}

export interface CampaignEnrollmentDetail extends CampaignEnrollmentRow {
  contactName: string;
  contactEmail: string | null;
  companyName: string;
}

export interface CampaignMessageDetail extends MessageRow {
  contactName: string;
  stepPosition: number;
}

export interface CampaignDetail extends CampaignRow {
  mailbox: MailboxRow;
  venueName: string | null;
  offerName: string | null;
  steps: SequenceStepRow[];
  enrollments: CampaignEnrollmentDetail[];
  messages: CampaignMessageDetail[];
  latestGeneration: EmailGenerationOutput | null;
}
