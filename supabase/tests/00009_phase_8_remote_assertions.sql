begin;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-phase8@surfce.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Admin Phase 8"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000c02', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'direction-phase8@surfce.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Direction Phase 8"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000c03', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'manager-phase8@surfce.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Manager Phase 8"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000c04', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'viewer-phase8@surfce.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Viewer Phase 8"}'::jsonb, now(), now());

insert into public.organizations (id, name, slug)
values
  ('10000000-0000-0000-0000-000000000c01', 'Phase 8 A', 'phase-8-a'),
  ('10000000-0000-0000-0000-000000000c02', 'Phase 8 B', 'phase-8-b');

insert into public.memberships (organization_id, user_id, role)
values
  ('10000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000c01', 'admin'),
  ('10000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000c02', 'direction'),
  ('10000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000c03', 'sales_manager'),
  ('10000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000c04', 'viewer');

insert into public.companies (
  id, organization_id, legal_name, normalized_name, domain, city, assigned_to
)
values (
  '50000000-0000-0000-0000-000000000c01',
  '10000000-0000-0000-0000-000000000c01',
  'Phase 8 société fictive',
  'phase 8 societe fictive',
  'phase8.example',
  'Paris',
  '00000000-0000-0000-0000-000000000c01'
);

insert into public.contacts (
  id, organization_id, company_id, first_name, last_name, full_name, email,
  email_status, contact_status, confidence, lawful_basis, updated_at
)
values (
  '70000000-0000-0000-0000-000000000c01',
  '10000000-0000-0000-0000-000000000c01',
  '50000000-0000-0000-0000-000000000c01',
  'Contact',
  'Phase 8',
  'Contact Phase 8',
  'privacy@phase8.example',
  'valid',
  'valid',
  0.95,
  'legitimate_interest',
  now() - interval '3 years'
);

insert into public.audit_logs (
  organization_id, actor_user_id, action, entity_type, entity_id, after
)
values
  ('10000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000c01', 'campaigns.UPDATE', 'campaigns', null, '{"status":"active"}'::jsonb),
  ('10000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000c01', 'compliance_settings.UPDATE', 'compliance_settings', '10000000-0000-0000-0000-000000000c01', '{"tracking_enabled":false}'::jsonb);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000c04', true);

do $$
begin
  if exists (select 1 from public.compliance_settings) then
    raise exception 'Phase 8 viewer can read compliance settings';
  end if;
  if exists (select 1 from public.audit_logs) then
    raise exception 'Phase 8 viewer can read audit logs';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000c02', true);

do $$
declare
  visible_settings integer;
  changed_rows bigint;
begin
  select count(*) into visible_settings from public.compliance_settings;
  if visible_settings <> 1 then
    raise exception 'Phase 8 direction isolation failed: %', visible_settings;
  end if;

  update public.compliance_settings
  set tracking_enabled = true, updated_by = '00000000-0000-0000-0000-000000000c02'
  where organization_id = '10000000-0000-0000-0000-000000000c01';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'Phase 8 direction changed compliance settings';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000c03', true);

do $$
declare
  visible_audit integer;
begin
  select count(*) into visible_audit from public.audit_logs;
  if visible_audit <> 1
    or not exists (select 1 from public.audit_logs where entity_type = 'campaigns') then
    raise exception 'Phase 8 sales manager audit limitation failed: %', visible_audit;
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000c01', true);

update public.compliance_settings
set
  contact_retention_days = 365,
  message_retention_days = 180,
  updated_by = '00000000-0000-0000-0000-000000000c01'
where organization_id = '10000000-0000-0000-0000-000000000c01';

do $$
begin
  begin
    update public.compliance_settings
    set retain_suppression_proof = false,
        updated_by = '00000000-0000-0000-0000-000000000c01'
    where organization_id = '10000000-0000-0000-0000-000000000c01';
    raise exception 'Phase 8 opposition proof invariant was not enforced';
  exception
    when check_violation then null;
  end;
end;
$$;

insert into public.analytics_exports (
  organization_id, requested_by, export_type, format, filters, columns, row_count, status
)
values (
  '10000000-0000-0000-0000-000000000c01',
  '00000000-0000-0000-0000-000000000c01',
  'analytics_overview',
  'csv',
  '{"start":"2026-01-01","end":"2026-07-23"}'::jsonb,
  array['indicateur', 'valeur', 'unite', 'definition', 'source'],
  17,
  'completed'
);

insert into public.retention_runs (
  organization_id, requested_by, mode, status, settings_snapshot, report,
  started_at, completed_at
)
values (
  '10000000-0000-0000-0000-000000000c01',
  '00000000-0000-0000-0000-000000000c01',
  'simulation',
  'completed',
  '{"contact_retention_days":365}'::jsonb,
  '{"contacts":1,"dry_run":true}'::jsonb,
  now(),
  now()
);

do $$
declare
  privacy_result jsonb;
begin
  select public.process_contact_privacy_request(
    '70000000-0000-0000-0000-000000000c01',
    'delete',
    'Demande vérifiée Phase 8'
  ) into privacy_result;

  if privacy_result->>'completed' <> 'true' then
    raise exception 'Phase 8 privacy request failed: %', privacy_result;
  end if;
  if exists (
    select 1 from public.contacts
    where id = '70000000-0000-0000-0000-000000000c01'
      and (email is not null or full_name <> 'Contact anonymisé' or deleted_at is null)
  ) then
    raise exception 'Phase 8 personal data was not anonymized';
  end if;
  if not exists (
    select 1 from public.suppression_list
    where organization_id = '10000000-0000-0000-0000-000000000c01'
      and normalized_email = 'privacy@phase8.example'
  ) then
    raise exception 'Phase 8 opposition proof is missing';
  end if;
  if not exists (
    select 1 from public.privacy_requests
    where contact_id = '70000000-0000-0000-0000-000000000c01'
      and status = 'completed'
  ) then
    raise exception 'Phase 8 privacy ledger is missing';
  end if;
end;
$$;

reset role;

do $$
begin
  if has_function_privilege(
    'anon',
    'public.process_contact_privacy_request(uuid,text,text)',
    'execute'
  ) then
    raise exception 'Phase 8 anon can process privacy requests';
  end if;
  if has_function_privilege(
    'authenticated',
    'public.run_retention(uuid,boolean)',
    'execute'
  ) then
    raise exception 'Phase 8 authenticated can execute retention';
  end if;
  if not has_function_privilege(
    'service_role',
    'public.run_retention(uuid,boolean)',
    'execute'
  ) then
    raise exception 'Phase 8 service role cannot execute retention';
  end if;
end;
$$;

set local role service_role;
do $$
declare
  result jsonb;
begin
  select public.run_retention(
    '10000000-0000-0000-0000-000000000c01',
    true
  ) into result;
  if result->>'mode' <> 'simulation'
    or result->'report'->>'dry_run' <> 'true' then
    raise exception 'Phase 8 retention simulation failed: %', result;
  end if;
end;
$$;
reset role;

rollback;

select 'phase_8_analytics_compliance_assertions_passed' as result;
