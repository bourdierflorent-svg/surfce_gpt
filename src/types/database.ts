export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type CompanyStatus =
  | "discovered"
  | "qualified"
  | "contacted"
  | "engaged"
  | "opportunity"
  | "customer"
  | "disqualified";

export interface CompanyRow extends Record<string, unknown> {
  id: string;
  organization_id: string;
  legal_name: string;
  trade_name: string | null;
  normalized_name: string;
  siren: string | null;
  primary_siret: string | null;
  legal_form: string | null;
  sector: string | null;
  subsector: string | null;
  activity_code: string | null;
  description: string | null;
  website_url: string | null;
  domain: string | null;
  phone: string | null;
  generic_email: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  employee_range: string | null;
  revenue_range: string | null;
  address_line1: string | null;
  address_line2: string | null;
  postal_code: string | null;
  city: string;
  country_code: string;
  location: unknown;
  district: string | null;
  status: CompanyStatus;
  qualification_score: number | null;
  data_quality_score: number | null;
  assigned_to: string | null;
  do_not_contact: boolean;
  do_not_contact_reason: string | null;
  last_verified_at: string | null;
  last_contacted_at: string | null;
  next_action_at: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CompanyLocationRow extends Record<string, unknown> {
  id: string;
  organization_id: string;
  company_id: string;
  label: string;
  siret: string | null;
  address_line1: string | null;
  postal_code: string | null;
  city: string;
  country_code: string;
  location: unknown;
  is_headquarters: boolean;
  source_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DataSourceRow extends Record<string, unknown> {
  id: string;
  organization_id: string;
  entity_type: string;
  entity_id: string;
  field_name: string;
  provider: string;
  external_reference: string | null;
  source_url: string | null;
  raw_value: Json;
  normalized_value: Json;
  collected_at: string;
  last_verified_at: string | null;
  confidence: number;
  is_inferred: boolean;
  metadata: Json;
  created_at: string;
}

export interface SavedSearchRow extends Record<string, unknown> {
  id: string;
  organization_id: string;
  created_by: string;
  name: string;
  query: string | null;
  category: string | null;
  center: unknown;
  radius_meters: number | null;
  area: unknown;
  filters: Json;
  result_count: number;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersonaRow extends Record<string, unknown> {
  id: string;
  organization_id: string;
  company_id: string;
  version: number;
  status: "draft" | "validated" | "superseded";
  summary: string;
  company_type: string | null;
  event_maturity: "low" | "medium" | "high" | "unknown";
  estimated_size: Json;
  probable_needs: Json;
  likely_contact_roles: string[];
  recommended_event_types: string[];
  estimated_guest_range: Json;
  estimated_budget_range: Json;
  fit_score: number;
  confidence: number;
  risks: Json;
  evidence: Json;
  input_snapshot: Json;
  model_provider: string;
  model_name: string;
  prompt_version: string;
  validated_by: string | null;
  validated_at: string | null;
  created_at: string;
}

export interface VenueMatchRow extends Record<string, unknown> {
  id: string;
  organization_id: string;
  company_id: string;
  persona_id: string | null;
  venue_id: string;
  offer_id: string | null;
  score: number;
  score_breakdown: Json;
  reasons: Json;
  risks: Json;
  recommended_pitch: string | null;
  model_version: string;
  is_selected: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderJobRow extends Record<string, unknown> {
  id: string;
  organization_id: string;
  idempotency_key: string;
  job_type: string;
  provider: string;
  entity_type: string;
  entity_id: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  input: Json;
  output: Json;
  error: string | null;
  attempt_count: number;
  estimated_cost: number;
  currency: string;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  quota_event_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProviderQuotaRow extends Record<string, unknown> {
  id: string;
  organization_id: string;
  provider: string;
  operation: string;
  window_seconds: number;
  max_requests: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderUsageEventRow extends Record<string, unknown> {
  id: string;
  organization_id: string;
  actor_id: string | null;
  provider: string;
  operation: string;
  request_id: string;
  source_type: "direct" | "provider_job";
  source_id: string | null;
  allowed: boolean;
  status: "processing" | "succeeded" | "failed" | "blocked";
  duration_ms: number | null;
  error_code: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface AiRunRow extends Record<string, unknown> {
  id: string;
  organization_id: string;
  run_type: string;
  entity_type: string;
  entity_id: string | null;
  provider: string;
  model: string;
  prompt_version: string;
  input_hash: string;
  input_snapshot: Json;
  output: Json;
  status: "processing" | "completed" | "failed";
  error: string | null;
  token_usage: Json;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
}

export type ContactStatus =
  "to_verify" | "valid" | "risky" | "invalid" | "left_company" | "wrong_person" | "do_not_contact";

export interface ContactRow extends Record<string, unknown> {
  id: string;
  organization_id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  job_title: string | null;
  department: string | null;
  email: string | null;
  normalized_email: string | null;
  email_status: "unverified" | "valid" | "risky" | "invalid";
  phone: string | null;
  linkedin_url: string | null;
  contact_status: ContactStatus;
  confidence: number;
  lawful_basis: string | null;
  do_not_contact: boolean;
  do_not_contact_reason: string | null;
  assigned_to: string | null;
  last_contacted_at: string | null;
  last_replied_at: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MailboxRow extends Record<string, unknown> {
  id: string;
  organization_id: string;
  user_id: string;
  provider: "mock" | "google" | "microsoft";
  provider_account_id: string;
  email_address: string;
  display_name: string;
  encrypted_access_token: string | null;
  encrypted_refresh_token: string | null;
  token_expires_at: string | null;
  oauth_scopes: string[];
  provider_metadata: Json;
  sync_cursor: string | null;
  watch_expires_at: string | null;
  watch_resource_id: string | null;
  status: "connected" | "disconnected" | "error";
  daily_send_limit: number;
  sent_today: number;
  last_sync_at: string | null;
  last_error_code: string | null;
  last_error_at: string | null;
  sync_failure_count: number;
  created_at: string;
  updated_at: string;
}

export type CampaignStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "scheduled"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

export type EnrollmentStatus =
  | "draft"
  | "pending_approval"
  | "scheduled"
  | "active"
  | "replied"
  | "interested"
  | "not_interested"
  | "unsubscribed"
  | "bounced"
  | "paused"
  | "completed"
  | "stopped";

export interface CampaignRow extends Record<string, unknown> {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  venue_id: string | null;
  offer_id: string | null;
  mailbox_id: string;
  segment_definition: Json;
  language: string;
  tone: string;
  daily_limit: number;
  send_window: Json;
  stop_rules: Json;
  requires_first_message_approval: boolean;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  launched_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SequenceStepRow extends Record<string, unknown> {
  id: string;
  organization_id: string;
  campaign_id: string;
  position: number;
  delay_days: number;
  delay_hours: number;
  step_type: "email";
  subject_template: string | null;
  body_template_text: string | null;
  body_template_html: string | null;
  ai_instructions: string | null;
  requires_approval: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CampaignEnrollmentRow extends Record<string, unknown> {
  id: string;
  organization_id: string;
  campaign_id: string;
  company_id: string;
  contact_id: string;
  status: EnrollmentStatus;
  current_step: number;
  next_send_at: string | null;
  last_sent_at: string | null;
  stopped_at: string | null;
  stop_reason: string | null;
  personalization_snapshot: Json;
  created_at: string;
  updated_at: string;
}

export interface MailThreadRow extends Record<string, unknown> {
  id: string;
  organization_id: string;
  mailbox_id: string;
  provider_thread_id: string;
  company_id: string | null;
  contact_id: string | null;
  campaign_id: string | null;
  opportunity_id: string | null;
  subject: string | null;
  classification: string | null;
  priority: "low" | "normal" | "high";
  summary: string | null;
  summary_data: Json;
  summary_generated_at: string | null;
  summary_prompt_version: string | null;
  suggested_reply: Json;
  suggested_reply_generated_at: string | null;
  last_message_at: string | null;
  last_inbound_at: string | null;
  is_unread: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageRow extends Record<string, unknown> {
  id: string;
  organization_id: string;
  thread_id: string | null;
  campaign_id: string | null;
  enrollment_id: string | null;
  sequence_step_id: string | null;
  provider_message_id: string | null;
  internet_message_id: string | null;
  in_reply_to: string | null;
  deduplication_key: string;
  direction: "outbound" | "inbound";
  sender: Json;
  recipients: Json;
  cc: Json;
  bcc: Json;
  reply_to: Json;
  subject: string;
  body_text: string;
  body_html: string;
  variant_label: string | null;
  personalization_facts: Json;
  risk_flags: Json;
  scheduled_at: string | null;
  sent_at: string | null;
  received_at: string | null;
  status:
    | "draft"
    | "pending_approval"
    | "approved"
    | "scheduled"
    | "processing"
    | "sent"
    | "sent_mock"
    | "received"
    | "delivered"
    | "bounced"
    | "failed"
    | "cancelled";
  approved_by: string | null;
  approved_at: string | null;
  error_code: string | null;
  error_message: string | null;
  classification: string | null;
  ai_summary: Json;
  headers: Json;
  has_attachments: boolean;
  provider_metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface MessageEventRow extends Record<string, unknown> {
  id: string;
  organization_id: string;
  message_id: string;
  event_type: string;
  occurred_at: string;
  provider_event_id: string | null;
  metadata: Json;
  created_at: string;
}

export interface MessageAttachmentRow extends Record<string, unknown> {
  id: string;
  organization_id: string;
  message_id: string;
  provider_attachment_id: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  content_id: string | null;
  is_inline: boolean;
  storage_path: string | null;
  created_at: string;
}

export interface OpportunityStageRow extends Record<string, unknown> {
  id: string;
  organization_id: string;
  key: string;
  label: string;
  position: number;
  default_probability: number;
  category: "open" | "won" | "lost";
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OpportunityRow extends Record<string, unknown> {
  id: string;
  organization_id: string;
  company_id: string;
  primary_contact_id: string | null;
  venue_id: string | null;
  offer_id: string | null;
  campaign_id: string | null;
  owner_id: string;
  stage_id: string;
  title: string;
  probability: number;
  estimated_amount: number | null;
  proposed_amount: number | null;
  signed_amount: number | null;
  currency: string;
  estimated_guests: number | null;
  event_type: string | null;
  desired_event_date: string | null;
  expected_close_date: string | null;
  source: string;
  objections: Json;
  next_action: string | null;
  next_action_at: string | null;
  loss_reason: string | null;
  notes: string | null;
  last_activity_at: string;
  won_at: string | null;
  lost_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityRow extends Record<string, unknown> {
  id: string;
  organization_id: string;
  company_id: string | null;
  contact_id: string | null;
  opportunity_id: string | null;
  user_id: string | null;
  activity_type:
    | "opportunity_created"
    | "stage_changed"
    | "note"
    | "task_created"
    | "task_completed"
    | "appointment_created"
    | "proposal_created"
    | "proposal_status_changed";
  title: string;
  description: string | null;
  occurred_at: string;
  metadata: Json;
  created_at: string;
}

export interface TaskRow extends Record<string, unknown> {
  id: string;
  organization_id: string;
  company_id: string | null;
  contact_id: string | null;
  opportunity_id: string | null;
  assigned_to: string;
  created_by: string;
  title: string;
  description: string | null;
  priority: "low" | "normal" | "high";
  status: "todo" | "in_progress" | "completed" | "cancelled";
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentRow extends Record<string, unknown> {
  id: string;
  organization_id: string;
  company_id: string | null;
  contact_id: string | null;
  opportunity_id: string | null;
  owner_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  location: string | null;
  external_calendar_id: string | null;
  status: "planned" | "completed" | "cancelled" | "no_show";
  created_at: string;
  updated_at: string;
}

export interface ProposalRow extends Record<string, unknown> {
  id: string;
  organization_id: string;
  opportunity_id: string;
  venue_id: string | null;
  offer_id: string | null;
  version: number;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  amount: number;
  currency: string;
  guest_count: number | null;
  event_date: string | null;
  content: Json;
  storage_path: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SuppressionRow extends Record<string, unknown> {
  id: string;
  organization_id: string;
  email: string;
  normalized_email: string;
  domain: string | null;
  company_id: string | null;
  contact_id: string | null;
  reason: string;
  source: string;
  suppressed_at: string;
  expires_at: string | null;
  metadata: Json;
  created_at: string;
}

export interface AuditLogRow extends Record<string, unknown> {
  id: string;
  organization_id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before: Json;
  after: Json;
  ip_hash: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface ComplianceSettingsRow extends Record<string, unknown> {
  organization_id: string;
  default_lawful_basis: string;
  contact_retention_days: number;
  message_retention_days: number;
  provider_log_retention_days: number;
  audit_retention_days: number;
  anonymize_inactive_contacts: boolean;
  retain_suppression_proof: boolean;
  tracking_enabled: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsExportRow extends Record<string, unknown> {
  id: string;
  organization_id: string;
  requested_by: string;
  export_type: "analytics_overview" | "analytics_breakdown" | "contact_subject";
  format: "csv" | "json";
  filters: Json;
  columns: string[];
  row_count: number;
  status: "completed" | "failed";
  checksum: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface RetentionRunRow extends Record<string, unknown> {
  id: string;
  organization_id: string;
  requested_by: string | null;
  mode: "simulation" | "execution";
  status: "processing" | "completed" | "failed";
  settings_snapshot: Json;
  report: Json;
  error: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface PrivacyRequestRow extends Record<string, unknown> {
  id: string;
  organization_id: string;
  contact_id: string | null;
  requested_by: string;
  request_type: "access" | "anonymize" | "delete";
  status: "processing" | "completed" | "rejected";
  reason: string;
  result: Json;
  completed_at: string | null;
  created_at: string;
}

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      activities: {
        Row: ActivityRow;
        Insert: Partial<ActivityRow> &
          Pick<ActivityRow, "organization_id" | "activity_type" | "title">;
        Update: Partial<ActivityRow>;
        Relationships: [];
      };
      ai_runs: {
        Row: AiRunRow;
        Insert: Partial<AiRunRow> &
          Pick<
            AiRunRow,
            | "organization_id"
            | "run_type"
            | "entity_type"
            | "provider"
            | "model"
            | "prompt_version"
            | "input_hash"
            | "status"
          >;
        Update: Partial<AiRunRow>;
        Relationships: [];
      };
      appointments: {
        Row: AppointmentRow;
        Insert: Partial<AppointmentRow> &
          Pick<AppointmentRow, "organization_id" | "owner_id" | "title" | "starts_at" | "ends_at">;
        Update: Partial<AppointmentRow>;
        Relationships: [];
      };
      audit_logs: {
        Row: AuditLogRow;
        Insert: Partial<AuditLogRow> &
          Pick<AuditLogRow, "organization_id" | "action" | "entity_type">;
        Update: Partial<AuditLogRow>;
        Relationships: [];
      };
      analytics_exports: {
        Row: AnalyticsExportRow;
        Insert: Partial<AnalyticsExportRow> &
          Pick<
            AnalyticsExportRow,
            "organization_id" | "requested_by" | "export_type" | "format" | "columns"
          >;
        Update: Partial<AnalyticsExportRow>;
        Relationships: [];
      };
      campaign_enrollments: {
        Row: CampaignEnrollmentRow;
        Insert: Partial<CampaignEnrollmentRow> &
          Pick<
            CampaignEnrollmentRow,
            "organization_id" | "campaign_id" | "company_id" | "contact_id"
          >;
        Update: Partial<CampaignEnrollmentRow>;
        Relationships: [];
      };
      campaigns: {
        Row: CampaignRow;
        Insert: Partial<CampaignRow> &
          Pick<CampaignRow, "organization_id" | "name" | "mailbox_id" | "created_by">;
        Update: Partial<CampaignRow>;
        Relationships: [];
      };
      companies: {
        Row: CompanyRow;
        Insert: Partial<CompanyRow> &
          Pick<CompanyRow, "organization_id" | "legal_name" | "normalized_name">;
        Update: Partial<CompanyRow>;
        Relationships: [];
      };
      compliance_settings: {
        Row: ComplianceSettingsRow;
        Insert: Partial<ComplianceSettingsRow> & Pick<ComplianceSettingsRow, "organization_id">;
        Update: Partial<ComplianceSettingsRow>;
        Relationships: [];
      };
      contacts: {
        Row: ContactRow;
        Insert: Partial<ContactRow> &
          Pick<
            ContactRow,
            "organization_id" | "company_id" | "first_name" | "last_name" | "full_name"
          >;
        Update: Partial<ContactRow>;
        Relationships: [];
      };
      privacy_requests: {
        Row: PrivacyRequestRow;
        Insert: Partial<PrivacyRequestRow> &
          Pick<PrivacyRequestRow, "organization_id" | "requested_by" | "request_type" | "reason">;
        Update: Partial<PrivacyRequestRow>;
        Relationships: [];
      };
      retention_runs: {
        Row: RetentionRunRow;
        Insert: Partial<RetentionRunRow> &
          Pick<RetentionRunRow, "organization_id" | "mode" | "status">;
        Update: Partial<RetentionRunRow>;
        Relationships: [];
      };
      company_locations: {
        Row: CompanyLocationRow;
        Insert: Partial<CompanyLocationRow> &
          Pick<CompanyLocationRow, "organization_id" | "company_id" | "label" | "city">;
        Update: Partial<CompanyLocationRow>;
        Relationships: [];
      };
      data_sources: {
        Row: DataSourceRow;
        Insert: Partial<DataSourceRow> &
          Pick<
            DataSourceRow,
            "organization_id" | "entity_type" | "entity_id" | "field_name" | "provider"
          >;
        Update: Partial<DataSourceRow>;
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          timezone: string;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          timezone?: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          slug?: string;
          timezone?: string;
          settings?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      opportunities: {
        Row: OpportunityRow;
        Insert: Partial<OpportunityRow> &
          Pick<
            OpportunityRow,
            "organization_id" | "company_id" | "owner_id" | "stage_id" | "title" | "probability"
          >;
        Update: Partial<OpportunityRow>;
        Relationships: [];
      };
      opportunity_stages: {
        Row: OpportunityStageRow;
        Insert: Partial<OpportunityStageRow> &
          Pick<
            OpportunityStageRow,
            "organization_id" | "key" | "label" | "position" | "default_probability"
          >;
        Update: Partial<OpportunityStageRow>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      saved_searches: {
        Row: SavedSearchRow;
        Insert: Partial<SavedSearchRow> &
          Pick<SavedSearchRow, "organization_id" | "created_by" | "name">;
        Update: Partial<SavedSearchRow>;
        Relationships: [];
      };
      mail_threads: {
        Row: MailThreadRow;
        Insert: Partial<MailThreadRow> &
          Pick<MailThreadRow, "organization_id" | "mailbox_id" | "provider_thread_id">;
        Update: Partial<MailThreadRow>;
        Relationships: [];
      };
      mailboxes: {
        Row: MailboxRow;
        Insert: Partial<MailboxRow> &
          Pick<
            MailboxRow,
            | "organization_id"
            | "user_id"
            | "provider"
            | "provider_account_id"
            | "email_address"
            | "display_name"
          >;
        Update: Partial<MailboxRow>;
        Relationships: [];
      };
      message_attachments: {
        Row: MessageAttachmentRow;
        Insert: Partial<MessageAttachmentRow> &
          Pick<
            MessageAttachmentRow,
            | "organization_id"
            | "message_id"
            | "provider_attachment_id"
            | "file_name"
            | "content_type"
          >;
        Update: Partial<MessageAttachmentRow>;
        Relationships: [];
      };
      message_events: {
        Row: MessageEventRow;
        Insert: Partial<MessageEventRow> &
          Pick<MessageEventRow, "organization_id" | "message_id" | "event_type">;
        Update: Partial<MessageEventRow>;
        Relationships: [];
      };
      messages: {
        Row: MessageRow;
        Insert: Partial<MessageRow> &
          Pick<
            MessageRow,
            "organization_id" | "deduplication_key" | "subject" | "body_text" | "body_html"
          >;
        Update: Partial<MessageRow>;
        Relationships: [];
      };
      memberships: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["app_role"];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: Database["public"]["Enums"]["app_role"];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          organization_id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      personas: {
        Row: PersonaRow;
        Insert: Partial<PersonaRow> &
          Pick<
            PersonaRow,
            | "organization_id"
            | "company_id"
            | "version"
            | "summary"
            | "event_maturity"
            | "estimated_size"
            | "estimated_guest_range"
            | "estimated_budget_range"
            | "fit_score"
            | "confidence"
            | "model_provider"
            | "model_name"
            | "prompt_version"
          >;
        Update: Partial<PersonaRow>;
        Relationships: [];
      };
      provider_jobs: {
        Row: ProviderJobRow;
        Insert: Partial<ProviderJobRow> &
          Pick<
            ProviderJobRow,
            "organization_id" | "idempotency_key" | "job_type" | "provider" | "entity_type"
          >;
        Update: Partial<ProviderJobRow>;
        Relationships: [];
      };
      provider_quotas: {
        Row: ProviderQuotaRow;
        Insert: Partial<ProviderQuotaRow> &
          Pick<ProviderQuotaRow, "organization_id" | "provider" | "operation" | "max_requests">;
        Update: Partial<ProviderQuotaRow>;
        Relationships: [];
      };
      provider_usage_events: {
        Row: ProviderUsageEventRow;
        Insert: Partial<ProviderUsageEventRow> &
          Pick<
            ProviderUsageEventRow,
            "organization_id" | "provider" | "operation" | "request_id" | "allowed" | "status"
          >;
        Update: Partial<ProviderUsageEventRow>;
        Relationships: [];
      };
      proposals: {
        Row: ProposalRow;
        Insert: Partial<ProposalRow> &
          Pick<
            ProposalRow,
            "organization_id" | "opportunity_id" | "version" | "amount" | "created_by"
          >;
        Update: Partial<ProposalRow>;
        Relationships: [];
      };
      sequence_steps: {
        Row: SequenceStepRow;
        Insert: Partial<SequenceStepRow> &
          Pick<SequenceStepRow, "organization_id" | "campaign_id" | "position">;
        Update: Partial<SequenceStepRow>;
        Relationships: [];
      };
      suppression_list: {
        Row: SuppressionRow;
        Insert: Partial<SuppressionRow> &
          Pick<
            SuppressionRow,
            "organization_id" | "email" | "normalized_email" | "reason" | "source"
          >;
        Update: Partial<SuppressionRow>;
        Relationships: [];
      };
      tasks: {
        Row: TaskRow;
        Insert: Partial<TaskRow> &
          Pick<TaskRow, "organization_id" | "assigned_to" | "created_by" | "title">;
        Update: Partial<TaskRow>;
        Relationships: [];
      };
      venue_assets: {
        Row: {
          asset_type: string;
          created_at: string;
          id: string;
          is_public: boolean;
          offer_id: string | null;
          organization_id: string;
          sort_order: number;
          storage_path: string;
          title: string;
          updated_at: string;
          venue_id: string;
        };
        Insert: {
          asset_type: string;
          created_at?: string;
          id?: string;
          is_public?: boolean;
          offer_id?: string | null;
          organization_id: string;
          sort_order?: number;
          storage_path: string;
          title: string;
          updated_at?: string;
          venue_id: string;
        };
        Update: {
          asset_type?: string;
          created_at?: string;
          id?: string;
          is_public?: boolean;
          offer_id?: string | null;
          organization_id?: string;
          sort_order?: number;
          storage_path?: string;
          title?: string;
          updated_at?: string;
          venue_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "venue_assets_offer_fkey";
            columns: ["organization_id", "venue_id", "offer_id"];
            isOneToOne: false;
            referencedRelation: "venue_offers";
            referencedColumns: ["organization_id", "venue_id", "id"];
          },
          {
            foreignKeyName: "venue_assets_venue_fkey";
            columns: ["organization_id", "venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      venue_matches: {
        Row: VenueMatchRow;
        Insert: Partial<VenueMatchRow> &
          Pick<
            VenueMatchRow,
            | "organization_id"
            | "company_id"
            | "venue_id"
            | "score"
            | "score_breakdown"
            | "model_version"
          >;
        Update: Partial<VenueMatchRow>;
        Relationships: [];
      };
      venue_offers: {
        Row: {
          available_days: number[];
          available_time_end: string | null;
          available_time_start: string | null;
          commission_rate: number | null;
          created_at: string;
          currency: string;
          description: string | null;
          duration_minutes: number | null;
          event_type: string;
          id: string;
          inclusions: Json;
          indicative_price: number | null;
          is_active: boolean;
          max_guests: number | null;
          min_guests: number | null;
          minimum_budget: number | null;
          name: string;
          options: Json;
          organization_id: string;
          short_description: string | null;
          slug: string;
          terms: string | null;
          updated_at: string;
          valid_from: string | null;
          valid_until: string | null;
          venue_id: string;
        };
        Insert: {
          available_days?: number[];
          available_time_end?: string | null;
          available_time_start?: string | null;
          commission_rate?: number | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          duration_minutes?: number | null;
          event_type: string;
          id?: string;
          inclusions?: Json;
          indicative_price?: number | null;
          is_active?: boolean;
          max_guests?: number | null;
          min_guests?: number | null;
          minimum_budget?: number | null;
          name: string;
          options?: Json;
          organization_id: string;
          short_description?: string | null;
          slug: string;
          terms?: string | null;
          updated_at?: string;
          valid_from?: string | null;
          valid_until?: string | null;
          venue_id: string;
        };
        Update: {
          available_days?: number[];
          available_time_end?: string | null;
          available_time_start?: string | null;
          commission_rate?: number | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          duration_minutes?: number | null;
          event_type?: string;
          id?: string;
          inclusions?: Json;
          indicative_price?: number | null;
          is_active?: boolean;
          max_guests?: number | null;
          min_guests?: number | null;
          minimum_budget?: number | null;
          name?: string;
          options?: Json;
          organization_id?: string;
          short_description?: string | null;
          slug?: string;
          terms?: string | null;
          updated_at?: string;
          valid_from?: string | null;
          valid_until?: string | null;
          venue_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "venue_offers_venue_fkey";
            columns: ["organization_id", "venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["organization_id", "id"];
          },
        ];
      };
      venues: {
        Row: {
          address_line1: string | null;
          address_line2: string | null;
          atmosphere: string | null;
          capacity_seated: number | null;
          capacity_standing: number | null;
          city: string;
          commercial_terms: string | null;
          country_code: string;
          created_at: string;
          currency: string;
          description: string | null;
          district: string | null;
          event_types: string[];
          features: Json;
          id: string;
          internal_contact: string | null;
          is_active: boolean;
          latitude: number | null;
          location: unknown;
          longitude: number | null;
          minimum_guests: number | null;
          minimum_spend: number | null;
          name: string;
          opening_rules: Json;
          organization_id: string;
          postal_code: string | null;
          slug: string;
          standing: string | null;
          target_sectors: string[];
          updated_at: string;
          venue_type: string;
        };
        Insert: {
          address_line1?: string | null;
          address_line2?: string | null;
          atmosphere?: string | null;
          capacity_seated?: number | null;
          capacity_standing?: number | null;
          city?: string;
          commercial_terms?: string | null;
          country_code?: string;
          created_at?: string;
          currency?: string;
          description?: string | null;
          district?: string | null;
          event_types?: string[];
          features?: Json;
          id?: string;
          internal_contact?: string | null;
          is_active?: boolean;
          latitude?: number | null;
          location?: unknown;
          longitude?: number | null;
          minimum_guests?: number | null;
          minimum_spend?: number | null;
          name: string;
          opening_rules?: Json;
          organization_id: string;
          postal_code?: string | null;
          slug: string;
          standing?: string | null;
          target_sectors?: string[];
          updated_at?: string;
          venue_type: string;
        };
        Update: {
          address_line1?: string | null;
          address_line2?: string | null;
          atmosphere?: string | null;
          capacity_seated?: number | null;
          capacity_standing?: number | null;
          city?: string;
          commercial_terms?: string | null;
          country_code?: string;
          created_at?: string;
          currency?: string;
          description?: string | null;
          district?: string | null;
          event_types?: string[];
          features?: Json;
          id?: string;
          internal_contact?: string | null;
          is_active?: boolean;
          latitude?: number | null;
          location?: unknown;
          longitude?: number | null;
          minimum_guests?: number | null;
          minimum_spend?: number | null;
          name?: string;
          opening_rules?: Json;
          organization_id?: string;
          postal_code?: string | null;
          slug?: string;
          standing?: string | null;
          target_sectors?: string[];
          updated_at?: string;
          venue_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "venues_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: {
      create_organization: {
        Args: { p_name: string; p_slug: string };
        Returns: string;
      };
      create_opportunity_from_thread: {
        Args: {
          p_thread_id: string;
          p_title: string;
          p_event_type?: string | null;
          p_estimated_guests?: number | null;
          p_desired_event_date?: string | null;
          p_next_action?: string | null;
          p_next_action_at?: string | null;
        };
        Returns: Json;
      };
      enroll_contact_in_campaign: {
        Args: { p_campaign_id: string; p_contact_id: string };
        Returns: Json;
      };
      associate_mail_thread: {
        Args: {
          p_thread_id: string;
          p_company_id?: string | null;
          p_contact_id?: string | null;
          p_campaign_id?: string | null;
        };
        Returns: Json;
      };
      claim_campaign_message: {
        Args: { p_message_id: string };
        Returns: Json;
      };
      classify_inbound_message: {
        Args: {
          p_message_id: string;
          p_classification: string;
          p_priority?: string;
        };
        Returns: Json;
      };
      import_discovered_company: {
        Args: { p_organization_id: string; p_company: Json };
        Returns: { company_id: string; was_created: boolean; match_reason: string }[];
      };
      fail_campaign_message: {
        Args: {
          p_message_id: string;
          p_error_code: string;
          p_error_message: string;
        };
        Returns: Json;
      };
      finalize_campaign_message: {
        Args: {
          p_message_id: string;
          p_provider_message_id: string;
          p_provider_thread_id: string;
          p_sent_at: string;
          p_mock?: boolean;
        };
        Returns: Json;
      };
      consume_provider_quota: {
        Args: {
          p_organization_id: string;
          p_provider: string;
          p_operation: string;
          p_request_id: string;
          p_source_type?: "direct" | "provider_job";
          p_source_id?: string | null;
        };
        Returns: {
          event_id: string;
          allowed: boolean;
          limit_value: number;
          remaining: number;
          retry_after_seconds: number;
        }[];
      };
      finalize_provider_operation: {
        Args: {
          p_event_id: string;
          p_status: "succeeded" | "failed";
          p_duration_ms: number;
          p_error_code?: string | null;
        };
        Returns: undefined;
      };
      ingest_provider_message: {
        Args: {
          p_mailbox_id: string;
          p_provider_thread_id: string;
          p_provider_message_id: string;
          p_internet_message_id?: string | null;
          p_in_reply_to?: string | null;
          p_direction: string;
          p_sender: Json;
          p_recipients?: Json;
          p_cc?: Json;
          p_bcc?: Json;
          p_reply_to?: Json;
          p_subject?: string;
          p_body_text?: string;
          p_body_html?: string;
          p_sent_at?: string | null;
          p_received_at?: string | null;
          p_headers?: Json;
          p_classification?: string;
          p_has_attachments?: boolean;
        };
        Returns: Json;
      };
      process_mock_campaign_message: {
        Args: { p_message_id: string; p_provider_message_id: string };
        Returns: Json;
      };
      process_contact_privacy_request: {
        Args: {
          p_contact_id: string;
          p_request_type: "anonymize" | "delete";
          p_reason: string;
        };
        Returns: Json;
      };
      run_retention: {
        Args: { p_organization_id: string; p_dry_run?: boolean };
        Returns: Json;
      };
      search_companies_in_polygon: {
        Args: { p_organization_id: string; p_geojson: Json };
        Returns: CompanyRow[];
      };
      search_companies_in_radius: {
        Args: {
          p_organization_id: string;
          p_lat: number;
          p_lng: number;
          p_radius_meters: number;
        };
        Returns: CompanyRow[];
      };
      suppress_contact: {
        Args: { p_contact_id: string; p_reason: string; p_source?: string };
        Returns: Json;
      };
    };
    Enums: {
      app_role:
        | "admin"
        | "direction"
        | "sales_manager"
        | "sales"
        | "venue_manager"
        | "marketing"
        | "viewer";
      company_status: CompanyStatus;
      campaign_status: CampaignStatus;
      enrollment_status: EnrollmentStatus;
    };
    CompositeTypes: Record<never, never>;
  };
}
