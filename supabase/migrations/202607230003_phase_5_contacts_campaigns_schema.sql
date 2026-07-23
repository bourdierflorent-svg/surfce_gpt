create type public.campaign_status as enum (
  'draft',
  'pending_approval',
  'approved',
  'scheduled',
  'active',
  'paused',
  'completed',
  'cancelled'
);
create type public.enrollment_status as enum (
  'draft',
  'pending_approval',
  'scheduled',
  'active',
  'replied',
  'interested',
  'not_interested',
  'unsubscribed',
  'bounced',
  'paused',
  'completed',
  'stopped'
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null,
  first_name text not null,
  last_name text not null,
  full_name text not null,
  job_title text,
  department text,
  email text,
  normalized_email text generated always as (lower(btrim(email))) stored,
  email_status text not null default 'unverified'
    check (email_status in ('unverified', 'valid', 'risky', 'invalid')),
  phone text,
  linkedin_url text,
  contact_status text not null default 'to_verify'
    check (
      contact_status in (
        'to_verify',
        'valid',
        'risky',
        'invalid',
        'left_company',
        'wrong_person',
        'do_not_contact'
      )
    ),
  confidence numeric(4, 3) not null default 0 check (confidence between 0 and 1),
  lawful_basis text,
  do_not_contact boolean not null default false,
  do_not_contact_reason text,
  assigned_to uuid references public.profiles(id) on delete set null,
  last_contacted_at timestamptz,
  last_replied_at timestamptz,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint contacts_organization_id_id_unique unique (organization_id, id),
  constraint contacts_company_fkey
    foreign key (organization_id, company_id)
    references public.companies (organization_id, id)
    on delete cascade,
  constraint contacts_opposition_consistency check (
    not do_not_contact
    or (contact_status = 'do_not_contact' and do_not_contact_reason is not null)
  )
);

create unique index contacts_normalized_email_unique
on public.contacts (organization_id, normalized_email)
where normalized_email is not null and deleted_at is null;

create table public.mailboxes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('mock', 'google', 'microsoft')),
  provider_account_id text not null,
  email_address text not null,
  display_name text not null,
  encrypted_access_token text,
  encrypted_refresh_token text,
  token_expires_at timestamptz,
  sync_cursor text,
  watch_expires_at timestamptz,
  status text not null default 'connected'
    check (status in ('connected', 'disconnected', 'error')),
  daily_send_limit integer not null default 20 check (daily_send_limit between 1 and 200),
  sent_today integer not null default 0 check (sent_today >= 0),
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mailboxes_organization_id_id_unique unique (organization_id, id),
  constraint mailboxes_provider_account_unique
    unique (organization_id, provider, provider_account_id),
  constraint mailboxes_daily_limit_consistency check (sent_today <= daily_send_limit)
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  status public.campaign_status not null default 'draft',
  venue_id uuid,
  offer_id uuid,
  mailbox_id uuid not null,
  segment_definition jsonb not null default '{}'::jsonb,
  language text not null default 'fr',
  tone text not null default 'directe et commerciale',
  daily_limit integer not null default 10 check (daily_limit between 1 and 100),
  send_window jsonb not null default
    '{"timezone":"Europe/Paris","weekdays":[1,2,3,4,5],"start":"09:00","end":"17:30"}'::jsonb,
  stop_rules jsonb not null default
    '{"human_reply":true,"unsubscribe":true,"bounce":true,"do_not_contact":true}'::jsonb,
  requires_first_message_approval boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  launched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_organization_id_id_unique unique (organization_id, id),
  constraint campaigns_mailbox_fkey
    foreign key (organization_id, mailbox_id)
    references public.mailboxes (organization_id, id)
    on delete restrict,
  constraint campaigns_venue_fkey
    foreign key (organization_id, venue_id)
    references public.venues (organization_id, id)
    on delete restrict,
  constraint campaigns_offer_fkey
    foreign key (organization_id, venue_id, offer_id)
    references public.venue_offers (organization_id, venue_id, id)
    on delete restrict,
  constraint campaigns_offer_requires_venue check (offer_id is null or venue_id is not null),
  constraint campaigns_approval_consistency check (
    (approved_at is null and approved_by is null)
    or (approved_at is not null and approved_by is not null)
  )
);

create table public.sequence_steps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid not null,
  position integer not null check (position between 0 and 20),
  delay_days integer not null default 0 check (delay_days between 0 and 90),
  delay_hours integer not null default 0 check (delay_hours between 0 and 23),
  step_type text not null default 'email' check (step_type = 'email'),
  subject_template text,
  body_template_text text,
  body_template_html text,
  ai_instructions text,
  requires_approval boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sequence_steps_organization_id_id_unique unique (organization_id, id),
  constraint sequence_steps_campaign_fkey
    foreign key (organization_id, campaign_id)
    references public.campaigns (organization_id, id)
    on delete cascade,
  constraint sequence_steps_campaign_position_unique unique (campaign_id, position)
);

create table public.campaign_enrollments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid not null,
  company_id uuid not null,
  contact_id uuid not null,
  status public.enrollment_status not null default 'draft',
  current_step integer not null default 0 check (current_step between 0 and 20),
  next_send_at timestamptz,
  last_sent_at timestamptz,
  stopped_at timestamptz,
  stop_reason text,
  personalization_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaign_enrollments_organization_id_id_unique unique (organization_id, id),
  constraint campaign_enrollments_campaign_fkey
    foreign key (organization_id, campaign_id)
    references public.campaigns (organization_id, id)
    on delete cascade,
  constraint campaign_enrollments_company_fkey
    foreign key (organization_id, company_id)
    references public.companies (organization_id, id)
    on delete cascade,
  constraint campaign_enrollments_contact_fkey
    foreign key (organization_id, contact_id)
    references public.contacts (organization_id, id)
    on delete cascade,
  constraint campaign_enrollments_campaign_contact_unique unique (campaign_id, contact_id),
  constraint campaign_enrollments_stop_consistency check (
    (status in ('stopped', 'unsubscribed', 'bounced') and stopped_at is not null)
    or (status not in ('stopped', 'unsubscribed', 'bounced'))
  )
);

create table public.mail_threads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mailbox_id uuid not null,
  provider_thread_id text not null,
  company_id uuid,
  contact_id uuid,
  campaign_id uuid,
  subject text,
  classification text,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  summary text,
  last_message_at timestamptz,
  last_inbound_at timestamptz,
  is_unread boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mail_threads_organization_id_id_unique unique (organization_id, id),
  constraint mail_threads_mailbox_fkey
    foreign key (organization_id, mailbox_id)
    references public.mailboxes (organization_id, id)
    on delete cascade,
  constraint mail_threads_company_fkey
    foreign key (organization_id, company_id)
    references public.companies (organization_id, id)
    on delete set null,
  constraint mail_threads_contact_fkey
    foreign key (organization_id, contact_id)
    references public.contacts (organization_id, id)
    on delete set null,
  constraint mail_threads_campaign_fkey
    foreign key (organization_id, campaign_id)
    references public.campaigns (organization_id, id)
    on delete set null,
  constraint mail_threads_provider_unique unique (mailbox_id, provider_thread_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  thread_id uuid,
  campaign_id uuid,
  enrollment_id uuid,
  sequence_step_id uuid,
  provider_message_id text,
  deduplication_key text not null,
  direction text not null default 'outbound'
    check (direction in ('outbound', 'inbound')),
  sender jsonb not null default '{}'::jsonb,
  recipients jsonb not null default '[]'::jsonb,
  cc jsonb not null default '[]'::jsonb,
  bcc jsonb not null default '[]'::jsonb,
  subject text not null,
  body_text text not null,
  body_html text not null,
  variant_label text,
  personalization_facts jsonb not null default '[]'::jsonb,
  risk_flags jsonb not null default '[]'::jsonb,
  scheduled_at timestamptz,
  sent_at timestamptz,
  received_at timestamptz,
  status text not null default 'draft'
    check (
      status in (
        'draft',
        'pending_approval',
        'approved',
        'scheduled',
        'processing',
        'sent_mock',
        'failed',
        'cancelled'
      )
    ),
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  error_code text,
  error_message text,
  classification text,
  ai_summary jsonb,
  headers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint messages_organization_id_id_unique unique (organization_id, id),
  constraint messages_thread_fkey
    foreign key (organization_id, thread_id)
    references public.mail_threads (organization_id, id)
    on delete set null,
  constraint messages_campaign_fkey
    foreign key (organization_id, campaign_id)
    references public.campaigns (organization_id, id)
    on delete cascade,
  constraint messages_enrollment_fkey
    foreign key (organization_id, enrollment_id)
    references public.campaign_enrollments (organization_id, id)
    on delete cascade,
  constraint messages_sequence_step_fkey
    foreign key (organization_id, sequence_step_id)
    references public.sequence_steps (organization_id, id)
    on delete cascade,
  constraint messages_deduplication_unique unique (organization_id, deduplication_key),
  constraint messages_approval_consistency check (
    (approved_at is null and approved_by is null)
    or (approved_at is not null and approved_by is not null)
  )
);

create unique index messages_provider_message_unique
on public.messages (thread_id, provider_message_id)
where thread_id is not null and provider_message_id is not null;

create table public.suppression_list (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  normalized_email text not null,
  domain text,
  company_id uuid,
  contact_id uuid,
  reason text not null,
  source text not null,
  suppressed_at timestamptz not null default now(),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint suppression_list_organization_id_id_unique unique (organization_id, id),
  constraint suppression_list_company_fkey
    foreign key (organization_id, company_id)
    references public.companies (organization_id, id)
    on delete set null,
  constraint suppression_list_contact_fkey
    foreign key (organization_id, contact_id)
    references public.contacts (organization_id, id)
    on delete set null,
  constraint suppression_list_email_normalized check (normalized_email = lower(btrim(email))),
  constraint suppression_list_organization_email_unique unique (organization_id, normalized_email)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

