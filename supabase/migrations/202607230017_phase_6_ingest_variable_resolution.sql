create or replace function public.ingest_provider_message(
  p_mailbox_id uuid,
  p_provider_thread_id text,
  p_provider_message_id text,
  p_internet_message_id text,
  p_in_reply_to text,
  p_direction text,
  p_sender jsonb,
  p_recipients jsonb,
  p_cc jsonb,
  p_bcc jsonb,
  p_reply_to jsonb,
  p_subject text,
  p_body_text text,
  p_body_html text,
  p_sent_at timestamptz,
  p_received_at timestamptz,
  p_classification text,
  p_has_attachments boolean,
  p_headers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  mailbox_row public.mailboxes%rowtype;
  thread_row public.mail_threads%rowtype;
  message_row public.messages%rowtype;
  matched_contact_id uuid;
  matched_company_id uuid;
  matched_enrollment_id uuid;
  sender_email text;
  message_deduplication_key text;
  target_status public.enrollment_status;
  campaign_was_stopped boolean := false;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'Action réservée aux jobs serveur.' using errcode = '42501';
  end if;

  if p_direction not in ('inbound', 'outbound') then
    raise exception 'Direction de message invalide.';
  end if;

  if p_classification not in (
    'interested',
    'asks_information',
    'asks_price',
    'asks_callback',
    'asks_later',
    'referral',
    'wrong_person',
    'not_interested',
    'unsubscribe',
    'out_of_office',
    'bounce',
    'neutral',
    'unknown'
  ) then
    raise exception 'Classification invalide.';
  end if;

  select mb.*
  into mailbox_row
  from public.mailboxes mb
  where mb.id = p_mailbox_id
    and mb.status = 'connected'
  for update;

  if mailbox_row.id is null then
    raise exception 'Boîte connectée introuvable.';
  end if;

  sender_email := lower(trim(coalesce(p_sender->>'email', '')));
  select c.id, c.company_id
  into matched_contact_id, matched_company_id
  from public.contacts c
  where p_direction = 'inbound'
    and sender_email <> ''
    and c.organization_id = mailbox_row.organization_id
    and c.normalized_email = sender_email
    and c.deleted_at is null
  limit 1;

  select mt.*
  into thread_row
  from public.mail_threads mt
  where mt.mailbox_id = mailbox_row.id
    and mt.provider_thread_id = p_provider_thread_id
  for update;

  if thread_row.id is null then
    insert into public.mail_threads (
      organization_id,
      mailbox_id,
      provider_thread_id,
      company_id,
      contact_id,
      subject,
      classification,
      priority,
      last_message_at,
      last_inbound_at,
      is_unread
    )
    values (
      mailbox_row.organization_id,
      mailbox_row.id,
      p_provider_thread_id,
      matched_company_id,
      matched_contact_id,
      nullif(trim(p_subject), ''),
      case when p_direction = 'inbound' then p_classification else null end,
      'normal',
      coalesce(p_received_at, p_sent_at, now()),
      case when p_direction = 'inbound' then coalesce(p_received_at, now()) else null end,
      p_direction = 'inbound'
    )
    returning *
    into thread_row;
  else
    update public.mail_threads mt
    set
      company_id = coalesce(mt.company_id, matched_company_id),
      contact_id = coalesce(mt.contact_id, matched_contact_id),
      subject = coalesce(nullif(trim(p_subject), ''), mt.subject),
      classification = case
        when p_direction = 'inbound' then p_classification
        else mt.classification
      end,
      last_message_at = coalesce(
        greatest(mt.last_message_at, coalesce(p_received_at, p_sent_at, now())),
        coalesce(p_received_at, p_sent_at, now())
      ),
      last_inbound_at = case
        when p_direction = 'inbound' then coalesce(
          greatest(mt.last_inbound_at, coalesce(p_received_at, now())),
          coalesce(p_received_at, now())
        )
        else mt.last_inbound_at
      end,
      is_unread = mt.is_unread or p_direction = 'inbound'
    where mt.id = thread_row.id
    returning *
    into thread_row;
  end if;

  message_deduplication_key :=
    'provider:' || mailbox_row.id::text || ':' || p_provider_message_id;

  select m.*
  into message_row
  from public.messages m
  where m.organization_id = mailbox_row.organization_id
    and m.deduplication_key = message_deduplication_key;

  if message_row.id is not null then
    return jsonb_build_object(
      'ingested', false,
      'duplicate', true,
      'messageId', message_row.id,
      'threadId', thread_row.id
    );
  end if;

  insert into public.messages (
    organization_id,
    thread_id,
    campaign_id,
    provider_message_id,
    deduplication_key,
    internet_message_id,
    in_reply_to,
    direction,
    sender,
    recipients,
    cc,
    bcc,
    reply_to,
    subject,
    body_text,
    body_html,
    sent_at,
    received_at,
    status,
    classification,
    has_attachments,
    headers,
    provider_metadata
  )
  values (
    mailbox_row.organization_id,
    thread_row.id,
    thread_row.campaign_id,
    p_provider_message_id,
    message_deduplication_key,
    p_internet_message_id,
    p_in_reply_to,
    p_direction,
    coalesce(p_sender, '{}'::jsonb),
    coalesce(p_recipients, '[]'::jsonb),
    coalesce(p_cc, '[]'::jsonb),
    coalesce(p_bcc, '[]'::jsonb),
    coalesce(p_reply_to, '[]'::jsonb),
    coalesce(nullif(trim(p_subject), ''), '(Sans objet)'),
    coalesce(p_body_text, ''),
    coalesce(p_body_html, ''),
    p_sent_at,
    p_received_at,
    case when p_direction = 'inbound' then 'received' else 'sent' end,
    case when p_direction = 'inbound' then p_classification else null end,
    coalesce(p_has_attachments, false),
    coalesce(p_headers, '{}'::jsonb),
    jsonb_build_object('provider', mailbox_row.provider)
  )
  returning *
  into message_row;

  insert into public.message_events (
    organization_id,
    message_id,
    event_type,
    provider_event_id,
    metadata,
    occurred_at
  )
  values (
    mailbox_row.organization_id,
    message_row.id,
    case when p_direction = 'inbound' then 'received' else 'provider_synced' end,
    mailbox_row.provider || ':' || p_provider_message_id || ':ingested',
    jsonb_build_object('provider', mailbox_row.provider),
    coalesce(p_received_at, p_sent_at, now())
  )
  on conflict do nothing;

  if p_direction = 'inbound' then
    if thread_row.contact_id is not null then
      update public.contacts c
      set last_replied_at = coalesce(p_received_at, now())
      where c.organization_id = mailbox_row.organization_id
        and c.id = thread_row.contact_id;
    end if;

    if thread_row.campaign_id is not null and thread_row.contact_id is not null then
      select ce.id
      into matched_enrollment_id
      from public.campaign_enrollments ce
      where ce.organization_id = mailbox_row.organization_id
        and ce.campaign_id = thread_row.campaign_id
        and ce.contact_id = thread_row.contact_id
        and ce.status in ('draft', 'pending_approval', 'scheduled', 'active', 'paused')
      for update;

      if matched_enrollment_id is not null then
        campaign_was_stopped := true;
        target_status := case
          when p_classification = 'interested'
            then 'interested'::public.enrollment_status
          when p_classification = 'not_interested'
            then 'not_interested'::public.enrollment_status
          when p_classification = 'unsubscribe'
            then 'unsubscribed'::public.enrollment_status
          when p_classification = 'bounce'
            then 'bounced'::public.enrollment_status
          else 'replied'::public.enrollment_status
        end;

        update public.campaign_enrollments ce
        set
          status = target_status,
          stopped_at = coalesce(p_received_at, now()),
          stop_reason = 'inbound_reply:' || p_classification,
          next_send_at = null
        where ce.id = matched_enrollment_id;

        update public.messages m
        set
          status = 'cancelled',
          error_code = 'reply_received',
          error_message = 'Séquence arrêtée après une réponse entrante.'
        where m.organization_id = mailbox_row.organization_id
          and m.enrollment_id = matched_enrollment_id
          and m.direction = 'outbound'
          and m.status in ('draft', 'pending_approval', 'approved', 'scheduled');

        insert into public.message_events (
          organization_id,
          message_id,
          event_type,
          metadata
        )
        values (
          mailbox_row.organization_id,
          message_row.id,
          'campaign_stopped',
          jsonb_build_object(
            'campaign_id', thread_row.campaign_id,
            'enrollment_id', matched_enrollment_id,
            'classification', p_classification
          )
        );
      end if;
    end if;

    if p_classification = 'unsubscribe'
      and thread_row.contact_id is not null
      and sender_email <> '' then
      insert into public.suppression_list (
        organization_id,
        email,
        normalized_email,
        company_id,
        contact_id,
        reason,
        source,
        metadata
      )
      values (
        mailbox_row.organization_id,
        sender_email,
        sender_email,
        thread_row.company_id,
        thread_row.contact_id,
        'Opposition détectée dans une réponse entrante.',
        mailbox_row.provider || '_inbound',
        '{"scope":"email","automatic":true}'::jsonb
      )
      on conflict (organization_id, normalized_email)
      do update set
        reason = excluded.reason,
        source = excluded.source,
        company_id = excluded.company_id,
        contact_id = excluded.contact_id,
        suppressed_at = now(),
        expires_at = null,
        metadata = excluded.metadata;

      update public.contacts c
      set
        do_not_contact = true,
        do_not_contact_reason = 'Opposition détectée dans une réponse entrante.',
        contact_status = 'do_not_contact'
      where c.organization_id = mailbox_row.organization_id
        and c.id = thread_row.contact_id;
    end if;

    insert into public.audit_logs (
      organization_id,
      actor_user_id,
      action,
      entity_type,
      entity_id,
      after
    )
    values (
      mailbox_row.organization_id,
      null,
      'message.inbound_ingested',
      'message',
      message_row.id,
      jsonb_build_object(
        'thread_id', thread_row.id,
        'classification', p_classification,
        'campaign_stopped', campaign_was_stopped
      )
    );
  end if;

  return jsonb_build_object(
    'ingested', true,
    'duplicate', false,
    'messageId', message_row.id,
    'threadId', thread_row.id,
    'campaignStopped', campaign_was_stopped
  );
end;
$$;

comment on function public.ingest_provider_message(
  uuid,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  text,
  boolean,
  jsonb
) is
'Service-only provider ingestion with explicit variable names and campaign-stop guarantees.';
