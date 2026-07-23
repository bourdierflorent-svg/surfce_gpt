create table public.compliance_settings (
  organization_id uuid primary key
    references public.organizations(id) on delete cascade,
  default_lawful_basis text not null default 'legitimate_interest'
    check (default_lawful_basis in ('legitimate_interest', 'consent', 'contract', 'legal_obligation')),
  contact_retention_days integer not null default 730
    check (contact_retention_days between 30 and 3650),
  message_retention_days integer not null default 365
    check (message_retention_days between 30 and 3650),
  provider_log_retention_days integer not null default 180
    check (provider_log_retention_days between 30 and 1825),
  audit_retention_days integer not null default 2190
    check (audit_retention_days between 365 and 3650),
  anonymize_inactive_contacts boolean not null default true,
  retain_suppression_proof boolean not null default true,
  tracking_enabled boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function private.insert_default_compliance_settings(p_organization_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.compliance_settings (organization_id)
  values (p_organization_id)
  on conflict (organization_id) do nothing;
$$;

select private.insert_default_compliance_settings(id)
from public.organizations;

create or replace function private.seed_compliance_settings_on_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.insert_default_compliance_settings(new.id);
  return new;
end;
$$;

create trigger organizations_seed_compliance_settings
after insert on public.organizations
for each row execute function private.seed_compliance_settings_on_organization();

create table public.analytics_exports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  export_type text not null
    check (export_type in ('analytics_overview', 'analytics_breakdown', 'contact_subject')),
  format text not null default 'csv' check (format in ('csv', 'json')),
  filters jsonb not null default '{}'::jsonb check (jsonb_typeof(filters) = 'object'),
  columns text[] not null check (cardinality(columns) between 1 and 30),
  row_count integer not null default 0 check (row_count >= 0),
  status text not null default 'completed' check (status in ('completed', 'failed')),
  checksum text check (checksum is null or checksum ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.retention_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid references public.profiles(id) on delete set null,
  mode text not null default 'simulation' check (mode in ('simulation', 'execution')),
  status text not null default 'completed' check (status in ('processing', 'completed', 'failed')),
  settings_snapshot jsonb not null check (jsonb_typeof(settings_snapshot) = 'object'),
  report jsonb not null default '{}'::jsonb check (jsonb_typeof(report) = 'object'),
  error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint retention_runs_status_consistency check (
    (status = 'processing' and completed_at is null and error is null)
    or (status = 'completed' and completed_at is not null and error is null)
    or (status = 'failed' and completed_at is not null and error is not null)
  )
);

create table public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  request_type text not null check (request_type in ('access', 'anonymize', 'delete')),
  status text not null default 'completed' check (status in ('processing', 'completed', 'rejected')),
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  result jsonb not null default '{}'::jsonb check (jsonb_typeof(result) = 'object'),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint privacy_requests_contact_fkey
    foreign key (organization_id, contact_id)
    references public.contacts (organization_id, id)
    on delete restrict,
  constraint privacy_requests_status_consistency check (
    (status = 'processing' and completed_at is null)
    or (status in ('completed', 'rejected') and completed_at is not null)
  )
);

create trigger compliance_settings_set_updated_at
before update on public.compliance_settings
for each row execute function private.set_updated_at();

comment on table public.compliance_settings is
'Organization-scoped privacy and retention defaults. Tracking stays disabled unless explicitly enabled.';

comment on table public.analytics_exports is
'Metadata-only export ledger. Export files are streamed and never persisted in this table.';

comment on table public.retention_runs is
'Retention reports for simulation or controlled service-role execution.';

comment on table public.privacy_requests is
'Minimal audit trail for access, anonymization and deletion requests without copied personal data.';

revoke all on function private.insert_default_compliance_settings(uuid)
  from public, anon, authenticated;
revoke all on function private.seed_compliance_settings_on_organization()
  from public, anon, authenticated;
