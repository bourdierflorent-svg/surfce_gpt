begin;

create table public.provider_quotas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider ~ '^[a-zA-Z0-9_*+.-]{1,80}$'),
  operation text not null check (operation ~ '^[a-zA-Z0-9_*+.-]{1,100}$'),
  window_seconds integer not null default 60 check (window_seconds between 1 and 86400),
  max_requests integer not null check (max_requests between 1 and 100000),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_quotas_scope_unique unique (organization_id, provider, operation)
);

create table public.provider_usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  provider text not null check (provider ~ '^[a-zA-Z0-9_*+.-]{1,80}$'),
  operation text not null check (operation ~ '^[a-zA-Z0-9_*+.-]{1,100}$'),
  request_id uuid not null,
  source_type text not null default 'direct'
    check (source_type in ('direct', 'provider_job')),
  source_id uuid,
  allowed boolean not null,
  status text not null
    check (status in ('processing', 'succeeded', 'failed', 'blocked')),
  duration_ms integer check (duration_ms is null or duration_ms between 0 and 86400000),
  error_code text check (error_code is null or char_length(error_code) between 1 and 120),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint provider_usage_events_status_consistency check (
    (status = 'processing' and allowed and completed_at is null)
    or (status in ('succeeded', 'failed') and allowed and completed_at is not null)
    or (status = 'blocked' and not allowed and completed_at is not null)
  )
);

alter table public.provider_jobs
  add column quota_event_id uuid references public.provider_usage_events(id) on delete set null;

create index provider_quota_events_window_idx
on public.provider_usage_events (organization_id, provider, operation, created_at desc)
where allowed;

create index provider_quota_events_actor_idx
on public.provider_usage_events (actor_id, created_at desc)
where actor_id is not null;

create index provider_quota_events_source_idx
on public.provider_usage_events (source_type, source_id, created_at desc)
where source_id is not null;

create index provider_jobs_quota_event_fk_idx
on public.provider_jobs (quota_event_id)
where quota_event_id is not null;

create trigger provider_quotas_set_updated_at
before update on public.provider_quotas
for each row execute function private.set_updated_at();

alter table public.provider_quotas enable row level security;
alter table public.provider_usage_events enable row level security;

create policy provider_quotas_select_members
on public.provider_quotas
for select
to authenticated
using (private.is_org_member(organization_id));

create policy provider_quotas_manage_admin
on public.provider_quotas
for all
to authenticated
using (
  private.has_org_role(organization_id, array['admin']::public.app_role[])
)
with check (
  private.has_org_role(organization_id, array['admin']::public.app_role[])
);

create policy provider_usage_events_select_members
on public.provider_usage_events
for select
to authenticated
using (private.is_org_member(organization_id));

create policy provider_usage_events_insert_actor
on public.provider_usage_events
for insert
to authenticated
with check (
  private.is_org_member(organization_id)
  and actor_id = (select auth.uid())
);

create policy provider_usage_events_update_actor
on public.provider_usage_events
for update
to authenticated
using (
  private.is_org_member(organization_id)
  and actor_id = (select auth.uid())
)
with check (
  private.is_org_member(organization_id)
  and actor_id = (select auth.uid())
);

grant select, insert, update, delete on table public.provider_quotas to authenticated;
grant select, insert, update on table public.provider_usage_events to authenticated;
grant all on table public.provider_quotas, public.provider_usage_events to service_role;

create or replace function private.insert_default_provider_quotas(p_organization_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.provider_quotas (
    organization_id,
    provider,
    operation,
    window_seconds,
    max_requests
  )
  values
    (p_organization_id, '*', '*', 60, 60),
    (p_organization_id, 'mock_places', '*', 60, 600),
    (p_organization_id, 'mock_registry', '*', 60, 600),
    (p_organization_id, 'mock_website', '*', 60, 600),
    (p_organization_id, 'mock_email_verification', '*', 60, 600),
    (p_organization_id, 'mock_ai', '*', 60, 600),
    (p_organization_id, 'mock_mail', '*', 60, 600),
    (p_organization_id, 'google', '*', 60, 120),
    (p_organization_id, 'microsoft', '*', 60, 120)
  on conflict (organization_id, provider, operation) do nothing;
$$;

create or replace function private.seed_provider_quotas_on_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.insert_default_provider_quotas(new.id);
  return new;
end;
$$;

create trigger organizations_seed_provider_quotas
after insert on public.organizations
for each row execute function private.seed_provider_quotas_on_organization();

select private.insert_default_provider_quotas(id)
from public.organizations;

create or replace function public.consume_provider_quota(
  p_organization_id uuid,
  p_provider text,
  p_operation text,
  p_request_id uuid,
  p_source_type text default 'direct',
  p_source_id uuid default null
)
returns table (
  event_id uuid,
  allowed boolean,
  limit_value integer,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_role text := (select auth.role());
  v_limit integer;
  v_window integer;
  v_count integer;
  v_oldest timestamptz;
  v_allowed boolean;
  v_event_id uuid;
  v_retry integer := 0;
begin
  if p_organization_id is null
    or p_provider !~ '^[a-zA-Z0-9_*+.-]{1,80}$'
    or p_operation !~ '^[a-zA-Z0-9_*+.-]{1,100}$'
    or p_source_type not in ('direct', 'provider_job')
  then
    raise exception using errcode = '22023', message = 'invalid_provider_quota_request';
  end if;

  if v_role <> 'service_role' then
    if v_actor_id is null or not private.is_org_member(p_organization_id) then
      raise exception using errcode = '42501', message = 'provider_quota_forbidden';
    end if;
  end if;

  select quota.max_requests, quota.window_seconds
  into v_limit, v_window
  from public.provider_quotas quota
  where quota.organization_id = p_organization_id
    and quota.enabled
    and quota.provider in (p_provider, '*')
    and quota.operation in (p_operation, '*')
  order by
    (quota.provider = p_provider)::integer desc,
    (quota.operation = p_operation)::integer desc
  limit 1;

  v_limit := coalesce(v_limit, 30);
  v_window := coalesce(v_window, 60);

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_organization_id::text || ':' || p_provider || ':' || p_operation,
      0
    )
  );

  select count(*)::integer, min(usage.created_at)
  into v_count, v_oldest
  from public.provider_usage_events usage
  where usage.organization_id = p_organization_id
    and usage.provider = p_provider
    and usage.operation = p_operation
    and usage.allowed
    and usage.created_at >= pg_catalog.now() - pg_catalog.make_interval(secs => v_window);

  v_allowed := v_count < v_limit;
  if not v_allowed and v_oldest is not null then
    v_retry := greatest(
      1,
      ceil(
        extract(
          epoch from (
            v_oldest + pg_catalog.make_interval(secs => v_window) - pg_catalog.now()
          )
        )
      )::integer
    );
  end if;

  insert into public.provider_usage_events (
    organization_id,
    actor_id,
    provider,
    operation,
    request_id,
    source_type,
    source_id,
    allowed,
    status,
    completed_at
  )
  values (
    p_organization_id,
    v_actor_id,
    p_provider,
    p_operation,
    p_request_id,
    p_source_type,
    p_source_id,
    v_allowed,
    case when v_allowed then 'processing' else 'blocked' end,
    case when v_allowed then null else pg_catalog.now() end
  )
  returning id into v_event_id;

  return query
  select
    v_event_id,
    v_allowed,
    v_limit,
    greatest(v_limit - v_count - case when v_allowed then 1 else 0 end, 0),
    v_retry;
end;
$$;

create or replace function public.finalize_provider_operation(
  p_event_id uuid,
  p_status text,
  p_duration_ms integer,
  p_error_code text default null
)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  if p_status not in ('succeeded', 'failed')
    or p_duration_ms < 0
    or p_duration_ms > 86400000
  then
    raise exception using errcode = '22023', message = 'invalid_provider_operation_result';
  end if;

  update public.provider_usage_events
  set
    status = p_status,
    duration_ms = p_duration_ms,
    error_code = case
      when p_status = 'failed'
        then left(coalesce(nullif(trim(p_error_code), ''), 'provider_error'), 120)
      else null
    end,
    completed_at = pg_catalog.now()
  where id = p_event_id
    and allowed
    and status = 'processing';
end;
$$;

create or replace function private.enforce_provider_job_quota()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_decision record;
begin
  if tg_op = 'INSERT'
    or (new.status = 'processing' and old.status is distinct from 'processing')
  then
    select *
    into v_decision
    from public.consume_provider_quota(
      new.organization_id,
      new.provider,
      new.job_type,
      extensions.gen_random_uuid(),
      'provider_job',
      new.id
    );

    if not v_decision.allowed then
      raise exception using
        errcode = 'P0001',
        message = 'provider_quota_exceeded',
        hint = v_decision.retry_after_seconds::text;
    end if;
    new.quota_event_id := v_decision.event_id;
  end if;
  return new;
end;
$$;

create or replace function private.finalize_provider_job_quota()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.quota_event_id is not null
    and old.status = 'processing'
    and new.status in ('completed', 'failed')
  then
    perform public.finalize_provider_operation(
      new.quota_event_id,
      case when new.status = 'completed' then 'succeeded' else 'failed' end,
      greatest(
        0,
        floor(
          extract(epoch from (
            coalesce(new.completed_at, pg_catalog.now())
            - coalesce(new.started_at, new.created_at)
          )) * 1000
        )::integer
      ),
      case when new.status = 'failed' then 'provider_job_failed' else null end
    );
  end if;
  return new;
end;
$$;

create trigger provider_jobs_enforce_quota
before insert or update of status on public.provider_jobs
for each row execute function private.enforce_provider_job_quota();

create trigger provider_jobs_finalize_quota
after update of status on public.provider_jobs
for each row execute function private.finalize_provider_job_quota();

revoke all on function private.insert_default_provider_quotas(uuid)
  from public, anon, authenticated;
revoke all on function private.seed_provider_quotas_on_organization()
  from public, anon, authenticated;
revoke all on function private.enforce_provider_job_quota()
  from public, anon, authenticated;
revoke all on function private.finalize_provider_job_quota()
  from public, anon, authenticated;

revoke all on function public.consume_provider_quota(uuid, text, text, uuid, text, uuid)
  from public, anon;
revoke all on function public.finalize_provider_operation(uuid, text, integer, text)
  from public, anon;
grant execute on function public.consume_provider_quota(uuid, text, text, uuid, text, uuid)
  to authenticated, service_role;
grant execute on function public.finalize_provider_operation(uuid, text, integer, text)
  to authenticated, service_role;

comment on table public.provider_quotas is
  'Organization-scoped distributed provider quotas. Wildcard policies are explicit and overridable.';
comment on table public.provider_usage_events is
  'Metadata-only provider operation ledger for quota enforcement, duration, outcome and error-rate metrics.';
comment on function public.consume_provider_quota(uuid, text, text, uuid, text, uuid) is
  'Atomically reserves an organization provider quota slot without logging request payloads or secrets.';

commit;
