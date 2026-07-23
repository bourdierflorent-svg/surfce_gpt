create or replace function public.claim_campaign_message(p_message_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  item record;
  is_suppressed boolean;
begin
  select
    m.*,
    ce.contact_id,
    ce.company_id,
    ce.status as enrollment_status,
    c.normalized_email,
    c.do_not_contact as contact_do_not_contact,
    co.domain as company_domain,
    co.do_not_contact as company_do_not_contact,
    ca.status as campaign_status,
    ca.daily_limit as campaign_daily_limit,
    ca.requires_first_message_approval,
    ca.mailbox_id,
    ss.position,
    mb.status as mailbox_status,
    mb.daily_send_limit,
    mb.sent_today
  into item
  from public.messages m
  join public.campaign_enrollments ce
    on ce.organization_id = m.organization_id
   and ce.id = m.enrollment_id
  join public.contacts c
    on c.organization_id = ce.organization_id
   and c.id = ce.contact_id
  join public.companies co
    on co.organization_id = ce.organization_id
   and co.id = ce.company_id
  join public.campaigns ca
    on ca.organization_id = m.organization_id
   and ca.id = m.campaign_id
  join public.sequence_steps ss
    on ss.organization_id = m.organization_id
   and ss.id = m.sequence_step_id
  join public.mailboxes mb
    on mb.organization_id = ca.organization_id
   and mb.id = ca.mailbox_id
  where m.id = p_message_id
  for update of m, ce, mb;

  if item.id is null then
    raise exception 'Message introuvable.';
  end if;

  if not (
    (select auth.role()) = 'service_role'
    or private.can_manage_campaign(item.organization_id, item.campaign_id)
  ) then
    raise exception 'Action non autorisée.' using errcode = '42501';
  end if;

  if item.status in ('sent', 'sent_mock', 'delivered')
    or item.provider_message_id is not null then
    return jsonb_build_object(
      'claimed', false,
      'reason', 'already_sent',
      'messageId', item.id
    );
  end if;

  if item.status = 'processing' then
    return jsonb_build_object(
      'claimed', false,
      'reason', 'already_processing',
      'messageId', item.id
    );
  end if;

  select exists (
    select 1
    from public.suppression_list sl
    where sl.organization_id = item.organization_id
      and (sl.expires_at is null or sl.expires_at > now())
      and (
        sl.normalized_email = item.normalized_email
        or sl.contact_id = item.contact_id
        or (
          sl.company_id = item.company_id
          and sl.metadata->>'scope' = 'company'
        )
        or (
          sl.domain is not null
          and sl.domain = item.company_domain
          and sl.metadata->>'scope' = 'domain'
        )
      )
  )
  into is_suppressed;

  if is_suppressed or item.contact_do_not_contact or item.company_do_not_contact then
    update public.messages
    set
      status = 'cancelled',
      error_code = 'suppressed',
      error_message = 'Envoi bloqué par une opposition active.'
    where id = item.id;

    update public.campaign_enrollments
    set
      status = 'stopped',
      stopped_at = now(),
      stop_reason = 'suppression',
      next_send_at = null
    where id = item.enrollment_id;

    return jsonb_build_object(
      'claimed', false,
      'reason', 'suppressed',
      'messageId', item.id
    );
  end if;

  if item.status <> 'scheduled'
    or item.scheduled_at is null
    or item.scheduled_at > now() then
    return jsonb_build_object(
      'claimed', false,
      'reason', 'not_due',
      'messageId', item.id
    );
  end if;

  if item.campaign_status <> 'active' then
    return jsonb_build_object(
      'claimed', false,
      'reason', 'campaign_inactive',
      'messageId', item.id
    );
  end if;

  if item.enrollment_status not in ('scheduled', 'active') then
    return jsonb_build_object(
      'claimed', false,
      'reason', 'enrollment_inactive',
      'messageId', item.id
    );
  end if;

  if item.mailbox_status <> 'connected' then
    return jsonb_build_object(
      'claimed', false,
      'reason', 'mailbox_disconnected',
      'messageId', item.id
    );
  end if;

  if item.sent_today >= least(item.daily_send_limit, item.campaign_daily_limit) then
    return jsonb_build_object(
      'claimed', false,
      'reason', 'daily_limit',
      'messageId', item.id
    );
  end if;

  if item.position = 0
    and item.requires_first_message_approval
    and item.approved_at is null then
    return jsonb_build_object(
      'claimed', false,
      'reason', 'approval_required',
      'messageId', item.id
    );
  end if;

  update public.messages
  set
    status = 'processing',
    error_code = null,
    error_message = null
  where id = item.id;

  return jsonb_build_object(
    'claimed', true,
    'reason', 'ready',
    'messageId', item.id
  );
end;
$$;

create or replace function public.finalize_campaign_message(
  p_message_id uuid,
  p_provider_message_id text,
  p_provider_thread_id text,
  p_sent_at timestamptz,
  p_mock boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  item record;
  next_date timestamptz;
begin
  select
    m.*,
    ce.id as target_enrollment_id,
    ss.position,
    ca.mailbox_id
  into item
  from public.messages m
  join public.campaign_enrollments ce
    on ce.organization_id = m.organization_id
   and ce.id = m.enrollment_id
  join public.sequence_steps ss
    on ss.organization_id = m.organization_id
   and ss.id = m.sequence_step_id
  join public.campaigns ca
    on ca.organization_id = m.organization_id
   and ca.id = m.campaign_id
  where m.id = p_message_id
  for update of m, ce;

  if item.id is null then
    raise exception 'Message introuvable.';
  end if;

  if not (
    (select auth.role()) = 'service_role'
    or private.can_manage_campaign(item.organization_id, item.campaign_id)
  ) then
    raise exception 'Action non autorisée.' using errcode = '42501';
  end if;

  if item.status in ('sent', 'sent_mock', 'delivered') then
    return jsonb_build_object(
      'sent', false,
      'reason', 'already_sent',
      'messageId', item.id
    );
  end if;

  if item.status <> 'processing' then
    raise exception 'Le message n’est pas réservé pour un envoi.';
  end if;

  update public.messages
  set
    status = case when p_mock then 'sent_mock' else 'sent' end,
    provider_message_id = p_provider_message_id,
    sent_at = coalesce(p_sent_at, now()),
    error_code = null,
    error_message = null,
    provider_metadata = provider_metadata || jsonb_build_object(
      'mock', p_mock,
      'finalized_at', now()
    )
  where id = item.id;

  if item.thread_id is not null and p_provider_thread_id is not null then
    update public.mail_threads
    set
      provider_thread_id = p_provider_thread_id,
      last_message_at = coalesce(p_sent_at, now())
    where id = item.thread_id;
  end if;

  update public.mailboxes
  set sent_today = sent_today + 1
  where id = item.mailbox_id;

  select min(scheduled_at)
  into next_date
  from public.messages
  where enrollment_id = item.target_enrollment_id
    and status = 'scheduled'
    and id <> item.id;

  update public.campaign_enrollments
  set
    current_step = item.position,
    last_sent_at = coalesce(p_sent_at, now()),
    next_send_at = next_date,
    status = case
      when next_date is null then 'completed'::public.enrollment_status
      else 'active'::public.enrollment_status
    end
  where id = item.target_enrollment_id;

  insert into public.message_events (
    organization_id,
    message_id,
    event_type,
    provider_event_id,
    metadata,
    occurred_at
  )
  values (
    item.organization_id,
    item.id,
    'sent',
    'send:' || p_provider_message_id,
    jsonb_build_object('mock', p_mock),
    coalesce(p_sent_at, now())
  )
  on conflict do nothing;

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    after
  )
  values (
    item.organization_id,
    (select auth.uid()),
    case when p_mock then 'message.sent_mock' else 'message.sent_provider' end,
    'message',
    item.id,
    jsonb_build_object(
      'provider_message_id', p_provider_message_id,
      'provider_thread_id', p_provider_thread_id,
      'mock', p_mock
    )
  );

  return jsonb_build_object(
    'sent', true,
    'reason', case when p_mock then 'mock_sent' else 'provider_sent' end,
    'messageId', item.id,
    'providerMessageId', p_provider_message_id
  );
end;
$$;

create or replace function public.fail_campaign_message(
  p_message_id uuid,
  p_error_code text,
  p_error_message text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  item record;
begin
  select organization_id, campaign_id, status
  into item
  from public.messages
  where id = p_message_id
  for update;

  if item.organization_id is null then
    raise exception 'Message introuvable.';
  end if;

  if not (
    (select auth.role()) = 'service_role'
    or private.can_manage_campaign(item.organization_id, item.campaign_id)
  ) then
    raise exception 'Action non autorisée.' using errcode = '42501';
  end if;

  update public.messages
  set
    status = 'failed',
    error_code = left(coalesce(p_error_code, 'provider_error'), 120),
    error_message = left(coalesce(p_error_message, 'Échec du provider mail.'), 500)
  where id = p_message_id
    and status = 'processing';
end;
$$;

revoke all on function public.claim_campaign_message(uuid) from public, anon;
grant execute on function public.claim_campaign_message(uuid) to authenticated, service_role;

revoke all on function public.finalize_campaign_message(uuid, text, text, timestamptz, boolean)
  from public, anon;
grant execute on function public.finalize_campaign_message(uuid, text, text, timestamptz, boolean)
  to authenticated, service_role;

revoke all on function public.fail_campaign_message(uuid, text, text) from public, anon;
grant execute on function public.fail_campaign_message(uuid, text, text)
  to authenticated, service_role;

comment on table public.mailboxes is
'Encrypted OAuth mailbox connections for mock, Google Workspace and Microsoft 365.';

comment on table public.messages is
'Deduplicated outbound and synchronized inbound messages with sanitized HTML.';
