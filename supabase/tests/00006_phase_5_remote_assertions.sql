begin;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000901', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-phase5@surfce.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Admin Phase 5"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000902', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'viewer-phase5@surfce.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Viewer Phase 5"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000903', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sales-phase5@surfce.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Sales Phase 5"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000911', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-other-phase5@surfce.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Other Phase 5"}'::jsonb, now(), now());

insert into public.organizations (id, name, slug)
values
  ('10000000-0000-0000-0000-000000000901', 'Phase 5 A', 'phase-5-a'),
  ('10000000-0000-0000-0000-000000000911', 'Phase 5 B', 'phase-5-b');

insert into public.memberships (organization_id, user_id, role)
values
  ('10000000-0000-0000-0000-000000000901', '00000000-0000-0000-0000-000000000901', 'admin'),
  ('10000000-0000-0000-0000-000000000901', '00000000-0000-0000-0000-000000000902', 'viewer'),
  ('10000000-0000-0000-0000-000000000901', '00000000-0000-0000-0000-000000000903', 'sales'),
  ('10000000-0000-0000-0000-000000000911', '00000000-0000-0000-0000-000000000911', 'admin');

insert into public.companies (
  id, organization_id, legal_name, normalized_name, domain, city, assigned_to
)
values
  ('50000000-0000-0000-0000-000000000901', '10000000-0000-0000-0000-000000000901', 'Phase 5 A fictive', 'phase 5 a fictive', 'phase5-a.example', 'Paris', '00000000-0000-0000-0000-000000000903'),
  ('50000000-0000-0000-0000-000000000902', '10000000-0000-0000-0000-000000000901', 'Phase 5 libre fictive', 'phase 5 libre fictive', 'phase5-libre.example', 'Paris', null),
  ('50000000-0000-0000-0000-000000000911', '10000000-0000-0000-0000-000000000911', 'Phase 5 B fictive', 'phase 5 b fictive', 'phase5-b.example', 'Paris', null);

insert into public.contacts (
  id, organization_id, company_id, first_name, last_name, full_name, email,
  email_status, contact_status, confidence, lawful_basis, assigned_to
)
values
  ('70000000-0000-0000-0000-000000000901', '10000000-0000-0000-0000-000000000901', '50000000-0000-0000-0000-000000000901', 'Contact', 'Autorisé', 'Contact Autorisé', 'allowed@phase5-a.example', 'valid', 'valid', 0.95, 'test', '00000000-0000-0000-0000-000000000903'),
  ('70000000-0000-0000-0000-000000000902', '10000000-0000-0000-0000-000000000901', '50000000-0000-0000-0000-000000000901', 'Contact', 'Opposition', 'Contact Opposition', 'suppressed@phase5-a.example', 'valid', 'valid', 0.95, 'test', '00000000-0000-0000-0000-000000000903'),
  ('70000000-0000-0000-0000-000000000911', '10000000-0000-0000-0000-000000000911', '50000000-0000-0000-0000-000000000911', 'Autre', 'Organisation', 'Autre Organisation', 'other@phase5-b.example', 'valid', 'valid', 0.95, 'test', null);

insert into public.mailboxes (
  id, organization_id, user_id, provider, provider_account_id, email_address,
  display_name, status, daily_send_limit
)
values
  ('71000000-0000-0000-0000-000000000901', '10000000-0000-0000-0000-000000000901', '00000000-0000-0000-0000-000000000901', 'mock', 'phase5-a', 'sender@phase5-a.example', 'Sender A', 'connected', 10),
  ('71000000-0000-0000-0000-000000000911', '10000000-0000-0000-0000-000000000911', '00000000-0000-0000-0000-000000000911', 'mock', 'phase5-b', 'sender@phase5-b.example', 'Sender B', 'connected', 10);

insert into public.campaigns (
  id, organization_id, name, status, mailbox_id, created_by, approved_by,
  approved_at, launched_at
)
values
  ('72000000-0000-0000-0000-000000000901', '10000000-0000-0000-0000-000000000901', 'Campagne A fictive', 'active', '71000000-0000-0000-0000-000000000901', '00000000-0000-0000-0000-000000000901', '00000000-0000-0000-0000-000000000901', now(), now()),
  ('72000000-0000-0000-0000-000000000902', '10000000-0000-0000-0000-000000000901', 'Campagne inscription fictive', 'draft', '71000000-0000-0000-0000-000000000901', '00000000-0000-0000-0000-000000000903', null, null, null),
  ('72000000-0000-0000-0000-000000000911', '10000000-0000-0000-0000-000000000911', 'Campagne B fictive', 'draft', '71000000-0000-0000-0000-000000000911', '00000000-0000-0000-0000-000000000911', null, null, null);

insert into public.sequence_steps (
  id, organization_id, campaign_id, position, delay_days, requires_approval
)
values
  ('73000000-0000-0000-0000-000000000901', '10000000-0000-0000-0000-000000000901', '72000000-0000-0000-0000-000000000901', 0, 0, true),
  ('73000000-0000-0000-0000-000000000902', '10000000-0000-0000-0000-000000000901', '72000000-0000-0000-0000-000000000902', 0, 0, true);

insert into public.campaign_enrollments (
  id, organization_id, campaign_id, company_id, contact_id, status, next_send_at
)
values
  ('74000000-0000-0000-0000-000000000901', '10000000-0000-0000-0000-000000000901', '72000000-0000-0000-0000-000000000901', '50000000-0000-0000-0000-000000000901', '70000000-0000-0000-0000-000000000901', 'scheduled', now() - interval '1 minute'),
  ('74000000-0000-0000-0000-000000000902', '10000000-0000-0000-0000-000000000901', '72000000-0000-0000-0000-000000000901', '50000000-0000-0000-0000-000000000901', '70000000-0000-0000-0000-000000000902', 'scheduled', now() - interval '1 minute');

insert into public.messages (
  id, organization_id, campaign_id, enrollment_id, sequence_step_id,
  deduplication_key, subject, body_text, body_html, scheduled_at, status,
  approved_by, approved_at
)
values
  ('76000000-0000-0000-0000-000000000901', '10000000-0000-0000-0000-000000000901', '72000000-0000-0000-0000-000000000901', '74000000-0000-0000-0000-000000000901', '73000000-0000-0000-0000-000000000901', 'phase5-allowed-once', 'Message autorisé', 'Corps test', '<p>Corps test</p>', now() - interval '1 minute', 'scheduled', '00000000-0000-0000-0000-000000000901', now()),
  ('76000000-0000-0000-0000-000000000902', '10000000-0000-0000-0000-000000000901', '72000000-0000-0000-0000-000000000901', '74000000-0000-0000-0000-000000000902', '73000000-0000-0000-0000-000000000901', 'phase5-suppressed', 'Message bloqué', 'Corps test', '<p>Corps test</p>', now() - interval '1 minute', 'scheduled', '00000000-0000-0000-0000-000000000901', now());

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);

do $$
declare
  result jsonb;
  sent_rows bigint;
begin
  select public.process_mock_campaign_message(
    '76000000-0000-0000-0000-000000000901',
    'mock-provider-message-once'
  ) into result;
  if result->>'sent' <> 'true' then
    raise exception 'Phase 5 send failed: %', result;
  end if;

  select public.process_mock_campaign_message(
    '76000000-0000-0000-0000-000000000901',
    'mock-provider-message-twice'
  ) into result;
  if result->>'reason' <> 'already_sent' then
    raise exception 'Phase 5 double mock send was not blocked: %', result;
  end if;

  select count(*) into sent_rows
  from public.messages
  where id = '76000000-0000-0000-0000-000000000901'
    and status = 'sent_mock'
    and provider_message_id = 'mock-provider-message-once';
  if sent_rows <> 1 then
    raise exception 'Phase 5 sent message was not unique';
  end if;
end;
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000901', true);

do $$
declare
  stopped_rows bigint;
begin
  perform public.suppress_contact(
    '70000000-0000-0000-0000-000000000902',
    'Opposition test',
    'remote_assertion'
  );

  select count(*) into stopped_rows
  from public.campaign_enrollments
  where id = '74000000-0000-0000-0000-000000000902'
    and status = 'stopped'
    and stop_reason like 'suppression:%';
  if stopped_rows <> 1 then
    raise exception 'Phase 5 suppression did not stop enrollment';
  end if;

  begin
    perform public.enroll_contact_in_campaign(
      '72000000-0000-0000-0000-000000000902',
      '70000000-0000-0000-0000-000000000902'
    );
    raise exception 'Phase 5 suppressed contact was enrolled again';
  exception when others then
    if sqlerrm = 'Phase 5 suppressed contact was enrolled again' then
      raise;
    end if;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000902', true);

do $$
declare
  visible_rows bigint;
  changed_rows bigint;
begin
  select count(*) into visible_rows from public.campaigns;
  if visible_rows <> 2 then
    raise exception 'Phase 5 tenant isolation failed: viewer sees % campaigns', visible_rows;
  end if;

  update public.campaigns
  set name = 'Viewer edit'
  where id = '72000000-0000-0000-0000-000000000901';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'Phase 5 viewer updated a campaign';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000903', true);

do $$
declare result jsonb;
begin
  select public.enroll_contact_in_campaign(
    '72000000-0000-0000-0000-000000000902',
    '70000000-0000-0000-0000-000000000901'
  ) into result;
  if result->>'enrollmentId' is null then
    raise exception 'Phase 5 assigned sales could not enroll its valid contact';
  end if;
end;
$$;

reset role;
rollback;

select 'phase_5_campaign_and_suppression_assertions_passed' as result;
