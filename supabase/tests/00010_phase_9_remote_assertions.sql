begin;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000d01', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-phase9@surfce.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Admin Phase 9"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000d02', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'viewer-phase9@surfce.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Viewer Phase 9"}'::jsonb, now(), now());

insert into public.organizations (id, name, slug)
values
  ('10000000-0000-0000-0000-000000000d01', 'Phase 9 A', 'phase-9-a'),
  ('10000000-0000-0000-0000-000000000d02', 'Phase 9 B', 'phase-9-b');

insert into public.memberships (organization_id, user_id, role)
values
  ('10000000-0000-0000-0000-000000000d01', '00000000-0000-0000-0000-000000000d01', 'admin'),
  ('10000000-0000-0000-0000-000000000d01', '00000000-0000-0000-0000-000000000d02', 'viewer');

do $$
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('provider_quotas', 'provider_usage_events')
      and c.relrowsecurity
    group by n.nspname
    having count(*) = 2
  ) then
    raise exception 'Phase 9 provider tables do not both enforce RLS';
  end if;

  if (
    select count(*)
    from public.provider_quotas
    where organization_id = '10000000-0000-0000-0000-000000000d01'
  ) <> 9 then
    raise exception 'Phase 9 default provider quotas were not seeded';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000d01', true);

update public.provider_quotas
set max_requests = 2
where organization_id = '10000000-0000-0000-0000-000000000d01'
  and provider = 'mock_ai'
  and operation = '*';

do $$
declare
  first_decision record;
  second_decision record;
  blocked_decision record;
begin
  select *
  into first_decision
  from public.consume_provider_quota(
    '10000000-0000-0000-0000-000000000d01',
    'mock_ai',
    'generate',
    '90000000-0000-0000-0000-000000000d01'
  );
  perform public.finalize_provider_operation(first_decision.event_id, 'succeeded', 42);

  select *
  into second_decision
  from public.consume_provider_quota(
    '10000000-0000-0000-0000-000000000d01',
    'mock_ai',
    'generate',
    '90000000-0000-0000-0000-000000000d02'
  );
  perform public.finalize_provider_operation(
    second_decision.event_id,
    'failed',
    73,
    'phase_9_mock_failure'
  );

  select *
  into blocked_decision
  from public.consume_provider_quota(
    '10000000-0000-0000-0000-000000000d01',
    'mock_ai',
    'generate',
    '90000000-0000-0000-0000-000000000d03'
  );

  if not first_decision.allowed
    or first_decision.remaining <> 1
    or not second_decision.allowed
    or second_decision.remaining <> 0
    or blocked_decision.allowed
    or blocked_decision.retry_after_seconds < 1
  then
    raise exception 'Phase 9 quota decisions are inconsistent';
  end if;

  if (
    select count(*)
    from public.provider_usage_events
    where organization_id = '10000000-0000-0000-0000-000000000d01'
      and provider = 'mock_ai'
      and operation = 'generate'
  ) <> 3 then
    raise exception 'Phase 9 provider usage ledger is incomplete';
  end if;

  if not exists (
    select 1
    from public.provider_usage_events
    where id = second_decision.event_id
      and status = 'failed'
      and duration_ms = 73
      and error_code = 'phase_9_mock_failure'
  ) then
    raise exception 'Phase 9 failed provider operation was not finalized';
  end if;
end;
$$;

update public.provider_quotas
set max_requests = 1
where organization_id = '10000000-0000-0000-0000-000000000d01'
  and provider = 'mock_registry'
  and operation = '*';

do $$
declare
  first_job_id uuid := '91000000-0000-0000-0000-000000000d01';
  first_event_id uuid;
  was_blocked boolean := false;
begin
  insert into public.provider_jobs (
    id, organization_id, idempotency_key, job_type, provider, entity_type,
    status, input, attempt_count, started_at
  )
  values (
    first_job_id,
    '10000000-0000-0000-0000-000000000d01',
    'phase-9-provider-job-first',
    'registry_lookup',
    'mock_registry',
    'company',
    'processing',
    '{}'::jsonb,
    1,
    now()
  )
  returning quota_event_id into first_event_id;

  if first_event_id is null then
    raise exception 'Phase 9 provider job did not reserve quota';
  end if;

  update public.provider_jobs
  set status = 'completed', output = '{"ok":true}'::jsonb, completed_at = now()
  where id = first_job_id;

  if not exists (
    select 1
    from public.provider_usage_events
    where id = first_event_id
      and source_type = 'provider_job'
      and source_id = first_job_id
      and status = 'succeeded'
      and duration_ms is not null
  ) then
    raise exception 'Phase 9 provider job quota event was not finalized';
  end if;

  begin
    insert into public.provider_jobs (
      id, organization_id, idempotency_key, job_type, provider, entity_type,
      status, input, attempt_count, started_at
    )
    values (
      '91000000-0000-0000-0000-000000000d02',
      '10000000-0000-0000-0000-000000000d01',
      'phase-9-provider-job-blocked',
      'registry_lookup',
      'mock_registry',
      'company',
      'processing',
      '{}'::jsonb,
      1,
      now()
    );
  exception
    when raise_exception then
      if sqlerrm = 'provider_quota_exceeded' then
        was_blocked := true;
      else
        raise;
      end if;
  end;

  if not was_blocked then
    raise exception 'Phase 9 provider job quota was not enforced';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000d02', true);

do $$
declare
  changed_rows bigint;
  cross_org_rejected boolean := false;
begin
  update public.provider_quotas
  set max_requests = 999
  where organization_id = '10000000-0000-0000-0000-000000000d01';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'Phase 9 viewer changed provider quotas';
  end if;

  if exists (
    select 1
    from public.provider_quotas
    where organization_id = '10000000-0000-0000-0000-000000000d02'
  ) then
    raise exception 'Phase 9 viewer can see another organization quotas';
  end if;

  begin
    perform public.consume_provider_quota(
      '10000000-0000-0000-0000-000000000d02',
      'mock_ai',
      'generate',
      '90000000-0000-0000-0000-000000000d04'
    );
  exception
    when insufficient_privilege then cross_org_rejected := true;
  end;

  if not cross_org_rejected then
    raise exception 'Phase 9 cross-organization quota reservation was accepted';
  end if;
end;
$$;

reset role;

do $$
begin
  if has_function_privilege(
    'anon',
    'public.consume_provider_quota(uuid,text,text,uuid,text,uuid)',
    'execute'
  ) then
    raise exception 'Phase 9 anon can consume provider quota';
  end if;
  if has_function_privilege(
    'anon',
    'public.finalize_provider_operation(uuid,text,integer,text)',
    'execute'
  ) then
    raise exception 'Phase 9 anon can finalize provider operations';
  end if;
  if has_function_privilege(
    'authenticated',
    'private.enforce_provider_job_quota()',
    'execute'
  ) then
    raise exception 'Phase 9 authenticated can execute private quota trigger';
  end if;
end;
$$;

rollback;

select 'phase_9_hardening_assertions_passed' as result;
