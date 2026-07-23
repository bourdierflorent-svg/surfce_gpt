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
  created_at: string;
  updated_at: string;
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
  sync_cursor: string | null;
  watch_expires_at: string | null;
  status: "connected" | "disconnected" | "error";
  daily_send_limit: number;
  sent_today: number;
  last_sync_at: string | null;
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
  subject: string | null;
  classification: string | null;
  priority: "low" | "normal" | "high";
  summary: string | null;
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
  deduplication_key: string;
  direction: "outbound" | "inbound";
  sender: Json;
  recipients: Json;
  cc: Json;
  bcc: Json;
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
    | "sent_mock"
    | "failed"
    | "cancelled";
  approved_by: string | null;
  approved_at: string | null;
  error_code: string | null;
  error_message: string | null;
  classification: string | null;
  ai_summary: Json;
  headers: Json;
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

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
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
      audit_logs: {
        Row: AuditLogRow;
        Insert: Partial<AuditLogRow> &
          Pick<AuditLogRow, "organization_id" | "action" | "entity_type">;
        Update: Partial<AuditLogRow>;
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
      enroll_contact_in_campaign: {
        Args: { p_campaign_id: string; p_contact_id: string };
        Returns: Json;
      };
      import_discovered_company: {
        Args: { p_organization_id: string; p_company: Json };
        Returns: { company_id: string; was_created: boolean; match_reason: string }[];
      };
      process_mock_campaign_message: {
        Args: { p_message_id: string; p_provider_message_id: string };
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
