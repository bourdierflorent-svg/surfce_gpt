begin;

create table public.personas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null,
  version integer not null check (version > 0),
  status text not null default 'draft' check (status in ('draft', 'validated', 'superseded')),
  summary text not null check (char_length(trim(summary)) between 10 and 4000),
  company_type text,
  event_maturity text not null check (event_maturity in ('low', 'medium', 'high', 'unknown')),
  estimated_size jsonb not null check (jsonb_typeof(estimated_size) = 'object'),
  probable_needs jsonb not null default '[]'::jsonb check (jsonb_typeof(probable_needs) = 'array'),
  likely_contact_roles text[] not null default '{}',
  recommended_event_types text[] not null default '{}',
  estimated_guest_range jsonb not null check (jsonb_typeof(estimated_guest_range) = 'object'),
  estimated_budget_range jsonb not null check (jsonb_typeof(estimated_budget_range) = 'object'),
  fit_score integer not null check (fit_score between 0 and 100),
  confidence numeric(4, 3) not null check (confidence between 0 and 1),
  risks jsonb not null default '[]'::jsonb check (jsonb_typeof(risks) = 'array'),
  evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence) = 'array'),
  input_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(input_snapshot) = 'object'),
  model_provider text not null,
  model_name text not null,
  prompt_version text not null,
  validated_by uuid references public.profiles(id) on delete set null,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  constraint personas_organization_id_id_unique unique (organization_id, id),
  constraint personas_organization_company_id_unique unique (organization_id, company_id, id),
  constraint personas_company_fkey
    foreign key (organization_id, company_id)
    references public.companies(organization_id, id)
    on delete cascade,
  constraint personas_company_version_unique unique (organization_id, company_id, version),
  constraint personas_validation_consistency check (
    (status = 'draft' and validated_by is null and validated_at is null)
    or (status = 'validated' and validated_by is not null and validated_at is not null)
    or status = 'superseded'
  )
);

create table public.venue_matches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null,
  persona_id uuid,
  venue_id uuid not null,
  offer_id uuid,
  score integer not null check (score between 0 and 100),
  score_breakdown jsonb not null check (jsonb_typeof(score_breakdown) = 'object'),
  reasons jsonb not null default '[]'::jsonb check (jsonb_typeof(reasons) = 'array'),
  risks jsonb not null default '[]'::jsonb check (jsonb_typeof(risks) = 'array'),
  recommended_pitch text,
  model_version text not null,
  is_selected boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venue_matches_company_fkey
    foreign key (organization_id, company_id)
    references public.companies(organization_id, id)
    on delete cascade,
  constraint venue_matches_persona_fkey
    foreign key (organization_id, company_id, persona_id)
    references public.personas(organization_id, company_id, id)
    on delete cascade,
  constraint venue_matches_venue_fkey
    foreign key (organization_id, venue_id)
    references public.venues(organization_id, id)
    on delete cascade,
  constraint venue_matches_offer_fkey
    foreign key (organization_id, venue_id, offer_id)
    references public.venue_offers(organization_id, venue_id, id)
    on delete cascade,
  constraint venue_matches_persona_venue_offer_unique
    unique (organization_id, persona_id, venue_id, offer_id)
);

create table public.provider_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  idempotency_key text not null check (char_length(trim(idempotency_key)) between 8 and 240),
  job_type text not null check (char_length(trim(job_type)) between 2 and 80),
  provider text not null check (char_length(trim(provider)) between 2 and 80),
  entity_type text not null check (char_length(trim(entity_type)) between 2 and 80),
  entity_id uuid,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  input jsonb not null default '{}'::jsonb check (jsonb_typeof(input) = 'object'),
  output jsonb,
  error text,
  attempt_count integer not null default 0 check (attempt_count between 0 and 5),
  estimated_cost numeric(12, 4) not null default 0 check (estimated_cost >= 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  scheduled_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_jobs_idempotency_unique unique (organization_id, idempotency_key),
  constraint provider_jobs_status_consistency check (
    (status = 'failed' and error is not null and completed_at is not null)
    or (status = 'completed' and error is null and completed_at is not null)
    or (status in ('pending', 'processing') and completed_at is null)
  )
);

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_type text not null check (char_length(trim(run_type)) between 2 and 80),
  entity_type text not null check (char_length(trim(entity_type)) between 2 and 80),
  entity_id uuid,
  provider text not null,
  model text not null,
  prompt_version text not null,
  input_hash text not null check (input_hash ~ '^[a-f0-9]{64}$'),
  input_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(input_snapshot) = 'object'),
  output jsonb,
  status text not null check (status in ('processing', 'completed', 'failed')),
  error text,
  token_usage jsonb not null default '{}'::jsonb check (jsonb_typeof(token_usage) = 'object'),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint ai_runs_status_consistency check (
    (status = 'failed' and error is not null and completed_at is not null)
    or (status = 'completed' and error is null and completed_at is not null)
    or (status = 'processing' and completed_at is null)
  )
);

create index personas_company_latest_idx
on public.personas (organization_id, company_id, version desc);

create index personas_validated_by_fk_idx
on public.personas (validated_by)
where validated_by is not null;

create index venue_matches_company_score_idx
on public.venue_matches (organization_id, company_id, score desc, created_at desc);

create index venue_matches_persona_fk_idx
on public.venue_matches (persona_id)
where persona_id is not null;

create index venue_matches_venue_fk_idx
on public.venue_matches (venue_id);

create index venue_matches_offer_fk_idx
on public.venue_matches (offer_id)
where offer_id is not null;

create index provider_jobs_queue_idx
on public.provider_jobs (organization_id, status, scheduled_at, created_at);

create index provider_jobs_entity_idx
on public.provider_jobs (organization_id, entity_type, entity_id, created_at desc);

create index ai_runs_entity_idx
on public.ai_runs (organization_id, entity_type, entity_id, created_at desc);

create index ai_runs_created_by_fk_idx
on public.ai_runs (created_by)
where created_by is not null;

create trigger venue_matches_set_updated_at
before update on public.venue_matches
for each row execute function private.set_updated_at();

create trigger provider_jobs_set_updated_at
before update on public.provider_jobs
for each row execute function private.set_updated_at();

alter table public.personas enable row level security;
alter table public.venue_matches enable row level security;
alter table public.provider_jobs enable row level security;
alter table public.ai_runs enable row level security;

create policy personas_select_members
on public.personas
for select
to authenticated
using (private.is_org_member(organization_id));

create policy personas_insert_sales
on public.personas
for insert
to authenticated
with check (
  private.has_org_role(organization_id, array['admin', 'sales_manager']::public.app_role[])
  or (
    private.has_org_role(organization_id, array['sales']::public.app_role[])
    and exists (
      select 1 from public.companies c
      where c.organization_id = personas.organization_id
        and c.id = personas.company_id
        and c.assigned_to = (select auth.uid())
    )
  )
);

create policy personas_update_sales
on public.personas
for update
to authenticated
using (
  private.has_org_role(organization_id, array['admin', 'sales_manager']::public.app_role[])
  or exists (
    select 1 from public.companies c
    where c.organization_id = personas.organization_id
      and c.id = personas.company_id
      and c.assigned_to = (select auth.uid())
      and private.has_org_role(personas.organization_id, array['sales']::public.app_role[])
  )
)
with check (
  private.has_org_role(organization_id, array['admin', 'sales_manager']::public.app_role[])
  or exists (
    select 1 from public.companies c
    where c.organization_id = personas.organization_id
      and c.id = personas.company_id
      and c.assigned_to = (select auth.uid())
      and private.has_org_role(personas.organization_id, array['sales']::public.app_role[])
  )
);

create policy personas_delete_sales
on public.personas
for delete
to authenticated
using (
  private.has_org_role(organization_id, array['admin', 'sales_manager']::public.app_role[])
  or exists (
    select 1 from public.companies c
    where c.organization_id = personas.organization_id
      and c.id = personas.company_id
      and c.assigned_to = (select auth.uid())
      and private.has_org_role(personas.organization_id, array['sales']::public.app_role[])
  )
);

create policy venue_matches_select_members
on public.venue_matches
for select
to authenticated
using (private.is_org_member(organization_id));

create policy venue_matches_insert_sales
on public.venue_matches
for insert
to authenticated
with check (
  private.has_org_role(organization_id, array['admin', 'sales_manager']::public.app_role[])
  or exists (
    select 1 from public.companies c
    where c.organization_id = venue_matches.organization_id
      and c.id = venue_matches.company_id
      and c.assigned_to = (select auth.uid())
      and private.has_org_role(venue_matches.organization_id, array['sales']::public.app_role[])
  )
);

create policy venue_matches_update_sales
on public.venue_matches
for update
to authenticated
using (
  private.has_org_role(organization_id, array['admin', 'sales_manager']::public.app_role[])
  or exists (
    select 1 from public.companies c
    where c.organization_id = venue_matches.organization_id
      and c.id = venue_matches.company_id
      and c.assigned_to = (select auth.uid())
      and private.has_org_role(venue_matches.organization_id, array['sales']::public.app_role[])
  )
)
with check (
  private.has_org_role(organization_id, array['admin', 'sales_manager']::public.app_role[])
  or exists (
    select 1 from public.companies c
    where c.organization_id = venue_matches.organization_id
      and c.id = venue_matches.company_id
      and c.assigned_to = (select auth.uid())
      and private.has_org_role(venue_matches.organization_id, array['sales']::public.app_role[])
  )
);

create policy venue_matches_delete_sales
on public.venue_matches
for delete
to authenticated
using (
  private.has_org_role(organization_id, array['admin', 'sales_manager']::public.app_role[])
  or exists (
    select 1 from public.companies c
    where c.organization_id = venue_matches.organization_id
      and c.id = venue_matches.company_id
      and c.assigned_to = (select auth.uid())
      and private.has_org_role(venue_matches.organization_id, array['sales']::public.app_role[])
  )
);

create policy provider_jobs_select_members
on public.provider_jobs
for select
to authenticated
using (private.is_org_member(organization_id));

create policy provider_jobs_insert_sales
on public.provider_jobs
for insert
to authenticated
with check (
  private.has_org_role(organization_id, array['admin', 'sales_manager']::public.app_role[])
  or (
    entity_type = 'company'
    and private.has_org_role(organization_id, array['sales']::public.app_role[])
    and exists (
      select 1 from public.companies c
      where c.organization_id = provider_jobs.organization_id
        and c.id = provider_jobs.entity_id
        and c.assigned_to = (select auth.uid())
    )
  )
);

create policy provider_jobs_update_sales
on public.provider_jobs
for update
to authenticated
using (
  private.has_org_role(organization_id, array['admin', 'sales_manager']::public.app_role[])
  or (
    entity_type = 'company'
    and private.has_org_role(organization_id, array['sales']::public.app_role[])
    and exists (
      select 1 from public.companies c
      where c.organization_id = provider_jobs.organization_id
        and c.id = provider_jobs.entity_id
        and c.assigned_to = (select auth.uid())
    )
  )
)
with check (
  private.has_org_role(organization_id, array['admin', 'sales_manager']::public.app_role[])
  or (
    entity_type = 'company'
    and private.has_org_role(organization_id, array['sales']::public.app_role[])
    and exists (
      select 1 from public.companies c
      where c.organization_id = provider_jobs.organization_id
        and c.id = provider_jobs.entity_id
        and c.assigned_to = (select auth.uid())
    )
  )
);

create policy provider_jobs_delete_sales
on public.provider_jobs
for delete
to authenticated
using (
  private.has_org_role(organization_id, array['admin', 'sales_manager']::public.app_role[])
  or (
    entity_type = 'company'
    and private.has_org_role(organization_id, array['sales']::public.app_role[])
    and exists (
      select 1 from public.companies c
      where c.organization_id = provider_jobs.organization_id
        and c.id = provider_jobs.entity_id
        and c.assigned_to = (select auth.uid())
    )
  )
);

create policy ai_runs_select_members
on public.ai_runs
for select
to authenticated
using (private.is_org_member(organization_id));

create policy ai_runs_insert_sales
on public.ai_runs
for insert
to authenticated
with check (
  private.has_org_role(organization_id, array['admin', 'sales_manager']::public.app_role[])
  or (
    entity_type = 'company'
    and private.has_org_role(organization_id, array['sales']::public.app_role[])
    and exists (
      select 1 from public.companies c
      where c.organization_id = ai_runs.organization_id
        and c.id = ai_runs.entity_id
        and c.assigned_to = (select auth.uid())
    )
  )
);

create policy ai_runs_update_sales
on public.ai_runs
for update
to authenticated
using (
  private.has_org_role(organization_id, array['admin', 'sales_manager']::public.app_role[])
  or (
    entity_type = 'company'
    and private.has_org_role(organization_id, array['sales']::public.app_role[])
    and exists (
      select 1 from public.companies c
      where c.organization_id = ai_runs.organization_id
        and c.id = ai_runs.entity_id
        and c.assigned_to = (select auth.uid())
    )
  )
)
with check (
  private.has_org_role(organization_id, array['admin', 'sales_manager']::public.app_role[])
  or (
    entity_type = 'company'
    and private.has_org_role(organization_id, array['sales']::public.app_role[])
    and exists (
      select 1 from public.companies c
      where c.organization_id = ai_runs.organization_id
        and c.id = ai_runs.entity_id
        and c.assigned_to = (select auth.uid())
    )
  )
);

create policy ai_runs_delete_sales
on public.ai_runs
for delete
to authenticated
using (
  private.has_org_role(organization_id, array['admin', 'sales_manager']::public.app_role[])
  or (
    entity_type = 'company'
    and private.has_org_role(organization_id, array['sales']::public.app_role[])
    and exists (
      select 1 from public.companies c
      where c.organization_id = ai_runs.organization_id
        and c.id = ai_runs.entity_id
        and c.assigned_to = (select auth.uid())
    )
  )
);

comment on table public.personas is
'Versioned, evidence-backed event sales personas. AI hypotheses remain drafts until human validation.';

comment on table public.venue_matches is
'Explainable deterministic venue and offer recommendations attached to a company persona.';

comment on table public.provider_jobs is
'Idempotent provider work ledger with status, retry count and estimated cost.';

comment on table public.ai_runs is
'Minimal, organization-scoped audit trail for versioned AI or mock-AI executions.';

commit;
