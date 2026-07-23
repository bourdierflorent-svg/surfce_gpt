begin;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000a01', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-phase6@surfce.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Admin Phase 6"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000a02', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'viewer-phase6@surfce.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Viewer Phase 6"}'::jsonb, now(), now());

insert into public.organizations (id, name, slug)
values ('10000000-0000-0000-0000-000000000a01', 'Phase 6 A', 'phase-6-a');

insert into public.memberships (organization_id, user_id, role)
values
  ('10000000-0000-0000-0000-000000000a01', '00000000-0000-0000-0000-000000000a01', 'admin'),
  ('10000000-0000-0000-0000-000000000a01', '00000000-0000-0000-0000-000000000a02', 'viewer');

insert into public.companies (
  id, organization_id, legal_name, normalized_name, domain, city
)
values (
  '50000000-0000-0000-0000-000000000a01',
  '10000000-0000-0000-0000-000000000a01',
  'Phase 6 fictive',
  'phase 6 fictive',
  'phase6.example',
  'Paris'
);

insert into public.contacts (
  id, organization_id, company_id, first_name, last_name, full_name, email,
  email_status, contact_status, confidence, lawful_basis
)
values (
  '70000000-0000-0000-0000-000000000a01',
  '10000000-0000-0000-0000-000000000a01',
  '50000000-0000-0000-0000-000000000a01',
  'Contact',
  'Phase 6',
  'Contact Phase 6',
  'reply@phase6.example',
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
  '71000000-0000-0000-0000-000000000a01',
  '10000000-0000-0000-0000-000000000a01',
  '00000000-0000-0000-0000-000000000a01',
  'mock',
  'phase6-a',
  'sender@phase6.example',
  'Sender Phase 6',
  'connected',
  10
);

insert into public.campaigns (
  id, organization_id, name, status, mailbox_id, created_by, approved_by,
  approved_at, launched_at
)
values (
  '72000000-0000-0000-0000-000000000a01',
  '10000000-0000-0000-0000-000000000a01',
  'Campagne Phase 6 fictive',
  'active',
  '71000000-0000-0000-0000-000000000a01',
  '00000000-0000-0000-0000-000000000a01',
  '00000000-0000-0000-0000-000000000a01',
  now(),
  now()
);

insert into public.sequence_steps (
  id, organization_id, campaign_id, position, delay_days, requires_approval
)
values (
  '73000000-0000-0000-0000-000000000a01',
  '10000000-0000-0000-0000-000000000a01',
  '72000000-0000-0000-0000-000000000a01',
  0,
  0,
  true
);

insert into public.campaign_enrollments (
  id, organization_id, campaign_id, company_id, contact_id, status, next_send_at
)
values (
  '74000000-0000-0000-0000-000000000a01',
  '10000000-0000-0000-0000-000000000a01',
  '72000000-0000-0000-0000-000000000a01',
  '50000000-0000-0000-0000-000000000a01',
  '70000000-0000-0000-0000-000000000a01',
  'scheduled',
  now() + interval '1 day'
);

insert into public.mail_threads (
  id, organization_id, mailbox_id, provider_thread_id, company_id, contact_id,
  campaign_id, subject, last_message_at
)
values (
  '75000000-0000-0000-0000-000000000a01',
  '10000000-0000-0000-0000-000000000a01',
  '71000000-0000-0000-0000-000000000a01',
  'phase6-provider-thread',
  '50000000-0000-0000-0000-000000000a01',
  '70000000-0000-0000-0000-000000000a01',
  '72000000-0000-0000-0000-000000000a01',
  'Phase 6 test',
  now()
);

insert into public.messages (
  id, organization_id, thread_id, campaign_id, enrollment_id, sequence_step_id,
  deduplication_key, direction, subject, body_text, body_html, scheduled_at, status,
  approved_by, approved_at
)
values (
  '76000000-0000-0000-0000-000000000a01',
  '10000000-0000-0000-0000-000000000a01',
  '75000000-0000-0000-0000-000000000a01',
  '72000000-0000-0000-0000-000000000a01',
  '74000000-0000-0000-0000-000000000a01',
  '73000000-0000-0000-0000-000000000a01',
  'phase6-future-followup',
  'outbound',
  'Relance Phase 6',
  'Relance à annuler',
  '<p>Relance à annuler</p>',
  now() + interval '1 day',
  'scheduled',
  '00000000-0000-0000-0000-000000000a01',
  now()
);

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);

do $$
declare
  first_result jsonb;
  duplicate_result jsonb;
  inbound_id uuid;
  stopped_rows bigint;
  cancelled_rows bigint;
begin
  select public.ingest_provider_message(
    '71000000-0000-0000-0000-000000000a01',
    'phase6-provider-thread',
    'phase6-provider-reply-1',
    '<phase6-provider-reply-1@phase6.example>',
    '<phase6-outbound@phase6.example>',
    'inbound',
    '{"email":"reply@phase6.example","name":"Contact Phase 6"}'::jsonb,
    '[{"email":"sender@phase6.example","name":"Sender Phase 6"}]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    'Re: Phase 6 test',
    'Oui, nous sommes intéressés.',
    '<p>Oui, nous sommes intéressés.</p>',
    null,
    now(),
    'interested',
    false,
    '{"message-id":"<phase6-provider-reply-1@phase6.example>"}'::jsonb
  ) into first_result;

  if first_result->>'ingested' <> 'true' or first_result->>'campaignStopped' <> 'true' then
    raise exception 'Phase 6 provider ingestion failed: %', first_result;
  end if;

  select public.ingest_provider_message(
    '71000000-0000-0000-0000-000000000a01',
    'phase6-provider-thread',
    'phase6-provider-reply-1',
    '<phase6-provider-reply-1@phase6.example>',
    '<phase6-outbound@phase6.example>',
    'inbound',
    '{"email":"reply@phase6.example","name":"Contact Phase 6"}'::jsonb,
    '[{"email":"sender@phase6.example","name":"Sender Phase 6"}]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    'Re: Phase 6 test',
    'Oui, nous sommes intéressés.',
    '<p>Oui, nous sommes intéressés.</p>',
    null,
    now(),
    'interested',
    false,
    '{}'::jsonb
  ) into duplicate_result;

  if duplicate_result->>'duplicate' <> 'true' then
    raise exception 'Phase 6 duplicate provider ingestion was not blocked: %', duplicate_result;
  end if;

  inbound_id := (first_result->>'messageId')::uuid;

  select count(*) into stopped_rows
  from public.campaign_enrollments
  where id = '74000000-0000-0000-0000-000000000a01'
    and status = 'interested'
    and next_send_at is null;
  if stopped_rows <> 1 then
    raise exception 'Phase 6 enrollment was not stopped';
  end if;

  select count(*) into cancelled_rows
  from public.messages
  where id = '76000000-0000-0000-0000-000000000a01'
    and status = 'cancelled'
    and error_code = 'reply_received';
  if cancelled_rows <> 1 then
    raise exception 'Phase 6 future message was not cancelled';
  end if;

  if not exists (
    select 1 from public.message_events
    where message_id = inbound_id and event_type = 'campaign_stopped'
  ) then
    raise exception 'Phase 6 campaign stop event is missing';
  end if;
end;
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000a01', true);

do $$
declare
  result jsonb;
  inbound_id uuid;
begin
  select id into inbound_id
  from public.messages
  where provider_message_id = 'phase6-provider-reply-1';

  select public.classify_inbound_message(
    inbound_id,
    'asks_price',
    'high'
  ) into result;

  if result->>'classification' <> 'asks_price' or result->>'priority' <> 'high' then
    raise exception 'Phase 6 manual classification failed: %', result;
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000a02', true);

do $$
declare
  changed_rows bigint;
begin
  update public.mail_threads
  set priority = 'low'
  where id = '75000000-0000-0000-0000-000000000a01';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'Phase 6 viewer updated a thread';
  end if;
end;
$$;

reset role;

do $$
begin
  if has_function_privilege(
    'anon',
    'public.ingest_provider_message(uuid,text,text,text,text,text,jsonb,jsonb,jsonb,jsonb,jsonb,text,text,text,timestamptz,timestamptz,text,boolean,jsonb)',
    'execute'
  ) then
    raise exception 'Phase 6 anon can execute provider ingestion';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.process_mock_campaign_message(uuid,text)',
    'execute'
  ) then
    raise exception 'Phase 6 authenticated can execute legacy mock delivery';
  end if;
end;
$$;

rollback;

select 'phase_6_inbox_assertions_passed' as result;
