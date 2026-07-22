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
      companies: {
        Row: CompanyRow;
        Insert: Partial<CompanyRow> &
          Pick<CompanyRow, "organization_id" | "legal_name" | "normalized_name">;
        Update: Partial<CompanyRow>;
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
      import_discovered_company: {
        Args: { p_organization_id: string; p_company: Json };
        Returns: { company_id: string; was_created: boolean; match_reason: string }[];
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
    };
    CompositeTypes: Record<never, never>;
  };
}
