create or replace function public.process_mock_campaign_message(
  p_message_id uuid,
  p_provider_message_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  item record;
  is_suppressed boolean;
  next_date timestamptz;
begin
  select
    m.*,
    ce.contact_id,
    ce.company_id,
    ce.status as enrollment_status,
    c.email as contact_email,
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

  if item.status = 'sent_mock' or item.provider_message_id is not null then
    return jsonb_build_object('sent', false, 'reason', 'already_sent', 'messageId', item.id);
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
      'message.blocked_by_suppression',
      'message',
      item.id,
      jsonb_build_object('contact_id', item.contact_id)
    );

    return jsonb_build_object('sent', false, 'reason', 'suppressed', 'messageId', item.id);
  end if;

  if item.status <> 'scheduled' or item.scheduled_at is null or item.scheduled_at > now() then
    return jsonb_build_object('sent', false, 'reason', 'not_due', 'messageId', item.id);
  end if;

  if item.campaign_status <> 'active' then
    return jsonb_build_object('sent', false, 'reason', 'campaign_inactive', 'messageId', item.id);
  end if;

  if item.enrollment_status not in ('scheduled', 'active') then
    return jsonb_build_object('sent', false, 'reason', 'enrollment_inactive', 'messageId', item.id);
  end if;

  if item.mailbox_status <> 'connected' then
    return jsonb_build_object('sent', false, 'reason', 'mailbox_disconnected', 'messageId', item.id);
  end if;

  if item.sent_today >= least(item.daily_send_limit, item.campaign_daily_limit) then
    return jsonb_build_object('sent', false, 'reason', 'daily_limit', 'messageId', item.id);
  end if;

  if item.position = 0
    and item.requires_first_message_approval
    and item.approved_at is null then
    return jsonb_build_object('sent', false, 'reason', 'approval_required', 'messageId', item.id);
  end if;

  update public.messages
  set
    status = 'sent_mock',
    provider_message_id = p_provider_message_id,
    sent_at = now(),
    error_code = null,
    error_message = null
  where id = item.id;

  update public.mailboxes
  set sent_today = sent_today + 1
  where id = item.mailbox_id;

  select min(scheduled_at)
  into next_date
  from public.messages
  where enrollment_id = item.enrollment_id
    and status = 'scheduled'
    and id <> item.id;

  update public.campaign_enrollments
  set
    current_step = item.position,
    last_sent_at = now(),
    next_send_at = next_date,
    status = case
      when next_date is null then 'completed'::public.enrollment_status
      else 'active'::public.enrollment_status
    end
  where id = item.enrollment_id;

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
    'message.sent_mock',
    'message',
    item.id,
    jsonb_build_object(
      'provider_message_id', p_provider_message_id,
      'mock', true
    )
  );

  return jsonb_build_object(
    'sent', true,
    'reason', 'mock_sent',
    'messageId', item.id,
    'providerMessageId', p_provider_message_id
  );
end;
$$;

revoke all on function public.suppress_contact(uuid, text, text) from public;
grant execute on function public.suppress_contact(uuid, text, text) to authenticated;

revoke all on function public.enroll_contact_in_campaign(uuid, uuid) from public;
grant execute on function public.enroll_contact_in_campaign(uuid, uuid) to authenticated;

revoke all on function public.process_mock_campaign_message(uuid, text) from public;
grant execute on function public.process_mock_campaign_message(uuid, text) to authenticated, service_role;

comment on table public.contacts is
'Organization-scoped professional contacts with explicit verification and opposition state.';

comment on table public.mailboxes is
'Mail provider connections. Phase 5 seeds only a token-free mock mailbox.';

comment on table public.campaigns is
'Low-volume, approval-gated outbound campaigns with configurable send and stop rules.';

comment on table public.messages is
'Deduplicated campaign messages. Phase 5 only permits mock delivery.';

comment on table public.suppression_list is
'Organization-wide exact-address, contact, company or domain suppression controls.';
