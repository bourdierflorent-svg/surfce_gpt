import type {
  ActivityRow,
  AppointmentRow,
  OpportunityRow,
  OpportunityStageRow,
  ProposalRow,
  TaskRow,
} from "@/types/database";

export interface OpportunityListItem extends OpportunityRow {
  stage: OpportunityStageRow;
  companyName: string;
  contactName: string | null;
  venueName: string | null;
  ownerName: string;
  openTaskCount: number;
  overdueTaskCount: number;
}

export interface OpportunityDetail extends OpportunityListItem {
  activities: ActivityRow[];
  tasks: TaskRow[];
  appointments: AppointmentRow[];
  proposals: ProposalRow[];
  campaignName: string | null;
  offerName: string | null;
  sourceThreadId: string | null;
}

export interface OpportunityFormOptions {
  stages: OpportunityStageRow[];
  companies: Array<{ id: string; name: string; assigned_to: string | null }>;
  contacts: Array<{ id: string; company_id: string; full_name: string }>;
  venues: Array<{ id: string; name: string }>;
  offers: Array<{ id: string; venue_id: string; name: string }>;
  campaigns: Array<{ id: string; name: string }>;
  owners: Array<{ id: string; name: string }>;
}

export interface PipelineSummary {
  openAmount: number;
  weightedAmount: number;
  wonAmount: number;
  overdueActions: number;
}
