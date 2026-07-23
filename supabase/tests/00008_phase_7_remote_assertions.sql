begin;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-phase7@surfce.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Admin Phase 7"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000b02', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'viewer-phase7@surfce.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Viewer Phase 7"}'::jsonb, now(), now());

insert into public.organizations (id, name, slug)
values
  ('10000000-0000-0000-0000-000000000b01', 'Phase 7 A', 'phase-7-a'),
  ('10000000-0000-0000-0000-000000000b02', 'Phase 7 B', 'phase-7-b');

insert into public.memberships (organization_id, user_id, role)
values
  ('10000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-000000000b01', 'admin'),
  ('10000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-000000000b02', 'viewer');

insert into public.companies (
  id, organization_id, legal_name, normalized_name, domain, city, assigned_to
)
values
  ('50000000-0000-0000-0000-000000000b01', '10000000-0000-0000-0000-000000000b01', 'Phase 7 société A', 'phase 7 societe a', 'phase7-a.example', 'Paris', '00000000-0000-0000-0000-000000000b01'),
  ('50000000-0000-0000-0000-000000000b02', '10000000-0000-0000-0000-000000000b02', 'Phase 7 société B', 'phase 7 societe b', 'phase7-b.example', 'Lyon', null);

insert into public.contacts (
  id, organization_id, company_id, first_name, last_name, full_name, email,
  email_status, contact_status, confidence, lawful_basis
)
values (
  '70000000-0000-0000-0000-000000000b01',
  '10000000-0000-0000-0000-000000000b01',
  '50000000-0000-0000-0000-000000000b01',
  'Contact',
  'Phase 7',
  'Contact Phase 7',
  'reply@phase7-a.example',
  'valid',
  'valid',
  0.95,
  'test'
);

insert into public.mailboxes (
  id, organization_id, user_id, provider, provider_account_id, email_address,
  display_name, status, daily_send_limit
)
values (
  '71000000-0000-0000-0000-000000000b01',
  '10000000-0000-0000-0000-000000000b01',
  '00000000-0000-0000-0000-000000000b01',
  'mock',
  'phase7-a',
  'sender@phase7-a.example',
  'Sender Phase 7',
  'connected',
  10
);

insert into public.mail_threads (
  id, organization_id, mailbox_id, provider_thread_id, company_id, contact_id,
  subject, classification, priority, last_message_at
)
values (
  '75000000-0000-0000-0000-000000000b01',
  '10000000-0000-0000-0000-000000000b01',
  '71000000-0000-0000-0000-000000000b01',
  'phase7-positive-thread',
  '50000000-0000-0000-0000-000000000b01',
  '70000000-0000-0000-0000-000000000b01',
  'Afterwork Phase 7',
  'interested',
  'normal',
  now()
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000b01', true);

do $$
declare
  first_result jsonb;
  duplicate_result jsonb;
  v_opportunity_id uuid;
  appointment_stage_id uuid;
  weighted_pipeline numeric;
begin
  select public.create_opportunity_from_thread(
    '75000000-0000-0000-0000-000000000b01',
    'Afterwork Phase 7 fictif',
    'Afterwork',
    42,
    current_date + 60,
    'Qualifier le budget',
    now() + interval '1 day'
  ) into first_result;

  if first_result->>'created' <> 'true' then
    raise exception 'Phase 7 positive reply did not create an opportunity: %', first_result;
  end if;

  v_opportunity_id := (first_result->>'opportunityId')::uuid;

  select public.create_opportunity_from_thread(
    '75000000-0000-0000-0000-000000000b01',
    'Afterwork Phase 7 fictif',
    'Afterwork',
    42,
    current_date + 60,
    'Qualifier le budget',
    now() + interval '1 day'
  ) into duplicate_result;

  if duplicate_result->>'duplicate' <> 'true'
    or (duplicate_result->>'opportunityId')::uuid <> v_opportunity_id then
    raise exception 'Phase 7 inbox automation is not idempotent: %', duplicate_result;
  end if;

  if not exists (
    select 1 from public.tasks t
    where t.opportunity_id = v_opportunity_id and t.title = 'Qualifier le budget'
  ) then
    raise exception 'Phase 7 inbox automation did not create its first task';
  end if;

  update public.opportunities
  set estimated_amount = 10000
  where id = v_opportunity_id;

  select id into appointment_stage_id
  from public.opportunity_stages
  where organization_id = '10000000-0000-0000-0000-000000000b01'
    and key = 'appointment';

  update public.opportunities
  set stage_id = appointment_stage_id
  where id = v_opportunity_id;

  select round(sum(estimated_amount * probability / 100.0), 2)
  into weighted_pipeline
  from public.opportunities o
  join public.opportunity_stages s
    on s.organization_id = o.organization_id and s.id = o.stage_id
  where o.organization_id = '10000000-0000-0000-0000-000000000b01'
    and s.category = 'open';

  if weighted_pipeline <> 6000 then
    raise exception 'Phase 7 weighted pipeline is incorrect: %', weighted_pipeline;
  end if;

  if not exists (
    select 1 from public.activities a
    where a.opportunity_id = v_opportunity_id and a.activity_type = 'stage_changed'
  ) then
    raise exception 'Phase 7 stage history is missing';
  end if;

  if not exists (
    select 1 from public.audit_logs al
    where al.entity_id = v_opportunity_id and al.entity_type = 'opportunities'
  ) then
    raise exception 'Phase 7 opportunity audit is missing';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000b02', true);

do $$
declare
  changed_rows bigint;
begin
  update public.opportunities
  set title = 'Viewer edit'
  where organization_id = '10000000-0000-0000-0000-000000000b01';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'Phase 7 viewer updated an opportunity';
  end if;
end;
$$;

reset role;

do $$
begin
  if has_function_privilege(
    'anon',
    'public.create_opportunity_from_thread(uuid,text,text,integer,date,text,timestamptz)',
    'execute'
  ) then
    raise exception 'Phase 7 anon can create an opportunity';
  end if;
end;
$$;

rollback;

select 'phase_7_opportunity_assertions_passed' as result;
