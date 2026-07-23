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
  mailbox_row record;
  thread_row public.mail_threads%rowtype;
  message_row public.messages%rowtype;
  contact_row record;
  enrollment_row record;
  sender_email text;
  deduplication_key text;
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

  select *
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
  into contact_row
  from public.contacts c
  where p_direction = 'inbound'
    and sender_email <> ''
    and c.organization_id = mailbox_row.organization_id
    and c.normalized_email = sender_email
    and c.deleted_at is null
  limit 1;

  select *
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
      contact_row.company_id,
      contact_row.id,
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
    update public.mail_threads
    set
      company_id = coalesce(mail_threads.company_id, contact_row.company_id),
      contact_id = coalesce(mail_threads.contact_id, contact_row.id),
      subject = coalesce(nullif(trim(p_subject), ''), mail_threads.subject),
      classification = case
        when p_direction = 'inbound' then p_classification
        else mail_threads.classification
      end,
      last_message_at = greatest(
        mail_threads.last_message_at,
        coalesce(p_received_at, p_sent_at, now())
      ),
      last_inbound_at = case
        when p_direction = 'inbound'
          then greatest(mail_threads.last_inbound_at, coalesce(p_received_at, now()))
        else mail_threads.last_inbound_at
      end,
      is_unread = mail_threads.is_unread or p_direction = 'inbound'
    where id = thread_row.id
    returning *
    into thread_row;
  end if;

  deduplication_key :=
    'provider:' || mailbox_row.id::text || ':' || p_provider_message_id;

  select *
  into message_row
  from public.messages m
  where m.organization_id = mailbox_row.organization_id
    and m.deduplication_key = deduplication_key;

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
    enrollment_id,
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
    null,
    p_provider_message_id,
    deduplication_key,
    p_internet_message_id,
    p_in_reply_to,
    p_direction,
    p_sender,
    p_recipients,
    p_cc,
    p_bcc,
    p_reply_to,
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
      update public.contacts
      set last_replied_at = coalesce(p_received_at, now())
      where organization_id = mailbox_row.organization_id
        and id = thread_row.contact_id;
    end if;

    if thread_row.campaign_id is not null and thread_row.contact_id is not null then
      select ce.*
      into enrollment_row
      from public.campaign_enrollments ce
      where ce.organization_id = mailbox_row.organization_id
        and ce.campaign_id = thread_row.campaign_id
        and ce.contact_id = thread_row.contact_id
        and ce.status in (
          'draft',
          'pending_approval',
          'scheduled',
          'active',
          'paused'
        )
      for update;

      if enrollment_row.id is not null then
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

        update public.campaign_enrollments
        set
          status = target_status,
          stopped_at = coalesce(p_received_at, now()),
          stop_reason = 'inbound_reply:' || p_classification,
          next_send_at = null
        where id = enrollment_row.id;

        update public.messages
        set
          status = 'cancelled',
          error_code = 'reply_received',
          error_message = 'Séquence arrêtée après une réponse entrante.'
        where organization_id = mailbox_row.organization_id
          and enrollment_id = enrollment_row.id
          and direction = 'outbound'
          and status in ('draft', 'pending_approval', 'approved', 'scheduled');

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
            'enrollment_id', enrollment_row.id,
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

      update public.contacts
      set
        do_not_contact = true,
        do_not_contact_reason = 'Opposition détectée dans une réponse entrante.',
        contact_status = 'do_not_contact'
      where organization_id = mailbox_row.organization_id
        and id = thread_row.contact_id;
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

create or replace function public.classify_inbound_message(
  p_message_id uuid,
  p_classification text,
  p_priority text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  item record;
  enrollment_row record;
  sender_email text;
  target_status public.enrollment_status;
  campaign_was_stopped boolean := false;
begin
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
  ) or p_priority not in ('low', 'normal', 'high') then
    raise exception 'Classification ou priorité invalide.';
  end if;

  select
    m.*,
    mt.mailbox_id,
    mt.company_id,
    mt.contact_id,
    mt.campaign_id as thread_campaign_id,
    mt.classification as previous_classification
  into item
  from public.messages m
  join public.mail_threads mt
    on mt.organization_id = m.organization_id
   and mt.id = m.thread_id
  where m.id = p_message_id
    and m.direction = 'inbound'
  for update of m, mt;

  if item.id is null then
    raise exception 'Message entrant introuvable.';
  end if;

  if not (
    (select auth.role()) = 'service_role'
    or private.can_manage_conversation(
      item.organization_id,
      item.mailbox_id,
      item.company_id,
      item.contact_id,
      item.thread_campaign_id
    )
  ) then
    raise exception 'Action non autorisée.' using errcode = '42501';
  end if;

  update public.messages
  set classification = p_classification
  where id = item.id;

  update public.mail_threads
  set
    classification = p_classification,
    priority = p_priority
  where id = item.thread_id;

  if item.thread_campaign_id is not null and item.contact_id is not null then
    select ce.*
    into enrollment_row
    from public.campaign_enrollments ce
    where ce.organization_id = item.organization_id
      and ce.campaign_id = item.thread_campaign_id
      and ce.contact_id = item.contact_id
    for update;

    if enrollment_row.id is not null then
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
      update public.campaign_enrollments
      set
        status = target_status,
        stopped_at = coalesce(stopped_at, now()),
        stop_reason = 'inbound_reply:' || p_classification,
        next_send_at = null
      where id = enrollment_row.id;
    end if;
  end if;

  sender_email := lower(trim(coalesce(item.sender->>'email', '')));
  if p_classification = 'unsubscribe'
    and item.contact_id is not null
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
      item.organization_id,
      sender_email,
      sender_email,
      item.company_id,
      item.contact_id,
      'Opposition confirmée par correction manuelle.',
      'manual_classification',
      '{"scope":"email","automatic":false}'::jsonb
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

    update public.contacts
    set
      do_not_contact = true,
      do_not_contact_reason = 'Opposition confirmée par correction manuelle.',
      contact_status = 'do_not_contact'
    where organization_id = item.organization_id
      and id = item.contact_id;
  end if;

  insert into public.message_events (
    organization_id,
    message_id,
    event_type,
    metadata
  )
  values (
    item.organization_id,
    item.id,
    case
      when item.previous_classification is null
        then 'classified'
      else 'classification_corrected'
    end,
    jsonb_build_object(
      'before', item.previous_classification,
      'after', p_classification,
      'priority', p_priority
    )
  );

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    before,
    after
  )
  values (
    item.organization_id,
    (select auth.uid()),
    'message.classification_corrected',
    'message',
    item.id,
    jsonb_build_object('classification', item.previous_classification),
    jsonb_build_object('classification', p_classification, 'priority', p_priority)
  );

  return jsonb_build_object(
    'messageId', item.id,
    'classification', p_classification,
    'priority', p_priority,
    'campaignStopped', campaign_was_stopped
  );
end;
$$;

create or replace function public.associate_mail_thread(
  p_thread_id uuid,
  p_company_id uuid,
  p_contact_id uuid,
  p_campaign_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  thread_row public.mail_threads%rowtype;
begin
  select *
  into thread_row
  from public.mail_threads mt
  where mt.id = p_thread_id
  for update;

  if thread_row.id is null then
    raise exception 'Conversation introuvable.';
  end if;

  if not private.can_manage_conversation(
    thread_row.organization_id,
    thread_row.mailbox_id,
    thread_row.company_id,
    thread_row.contact_id,
    thread_row.campaign_id
  ) then
    raise exception 'Action non autorisée.' using errcode = '42501';
  end if;

  if p_company_id is not null and not exists (
    select 1 from public.companies c
    where c.organization_id = thread_row.organization_id
      and c.id = p_company_id
  ) then
    raise exception 'Entreprise invalide.';
  end if;

  if p_contact_id is not null and not exists (
    select 1 from public.contacts c
    where c.organization_id = thread_row.organization_id
      and c.id = p_contact_id
      and (p_company_id is null or c.company_id = p_company_id)
  ) then
    raise exception 'Contact invalide.';
  end if;

  if p_campaign_id is not null and not exists (
    select 1 from public.campaigns c
    where c.organization_id = thread_row.organization_id
      and c.id = p_campaign_id
  ) then
    raise exception 'Campagne invalide.';
  end if;

  update public.mail_threads
  set
    company_id = p_company_id,
    contact_id = p_contact_id,
    campaign_id = p_campaign_id
  where id = thread_row.id;

  update public.messages
  set campaign_id = p_campaign_id
  where organization_id = thread_row.organization_id
    and thread_id = thread_row.id;

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    before,
    after
  )
  values (
    thread_row.organization_id,
    (select auth.uid()),
    'mail_thread.associated',
    'mail_thread',
    thread_row.id,
    jsonb_build_object(
      'company_id', thread_row.company_id,
      'contact_id', thread_row.contact_id,
      'campaign_id', thread_row.campaign_id
    ),
    jsonb_build_object(
      'company_id', p_company_id,
      'contact_id', p_contact_id,
      'campaign_id', p_campaign_id
    )
  );

  return jsonb_build_object(
    'threadId', thread_row.id,
    'companyId', p_company_id,
    'contactId', p_contact_id,
    'campaignId', p_campaign_id
  );
end;
$$;

revoke all on function public.ingest_provider_message(
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
) from public, anon, authenticated;

grant execute on function public.ingest_provider_message(
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
) to service_role;

revoke all on function public.classify_inbound_message(uuid, text, text)
  from public, anon;
grant execute on function public.classify_inbound_message(uuid, text, text)
  to authenticated, service_role;

revoke all on function public.associate_mail_thread(uuid, uuid, uuid, uuid)
  from public, anon;
grant execute on function public.associate_mail_thread(uuid, uuid, uuid, uuid)
  to authenticated, service_role;
