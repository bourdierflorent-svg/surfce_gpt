create or replace function private.audit_phase8_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_organization_id uuid;
  v_entity_id uuid;
begin
  v_row := to_jsonb(new);
  v_organization_id := coalesce(
    (v_row->>'organization_id')::uuid,
    (v_row->>'id')::uuid
  );
  v_entity_id := case
    when tg_table_name = 'compliance_settings' then v_organization_id
    else (v_row->>'id')::uuid
  end;

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
    v_organization_id,
    (select auth.uid()),
    tg_table_name || '.' || lower(tg_op),
    tg_table_name,
    v_entity_id,
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    v_row
  );

  return new;
end;
$$;

create trigger compliance_settings_audit
after update on public.compliance_settings
for each row execute function private.audit_phase8_event();

create trigger analytics_exports_audit
after insert on public.analytics_exports
for each row execute function private.audit_phase8_event();

create trigger retention_runs_audit
after insert on public.retention_runs
for each row execute function private.audit_phase8_event();

create trigger privacy_requests_audit
after insert on public.privacy_requests
for each row execute function private.audit_phase8_event();

create or replace function public.process_contact_privacy_request(
  p_contact_id uuid,
  p_request_type text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contact public.contacts%rowtype;
  v_request_id uuid;
  v_message_ids uuid[] := '{}'::uuid[];
  v_message_count integer := 0;
  v_source_count integer := 0;
begin
  if p_request_type not in ('anonymize', 'delete') then
    raise exception 'Type de demande non pris en charge.';
  end if;

  if char_length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'Un motif explicite est requis.';
  end if;

  select *
  into v_contact
  from public.contacts
  where id = p_contact_id
  for update;

  if v_contact.id is null then
    raise exception 'Contact introuvable.';
  end if;

  if not private.has_org_role(
    v_contact.organization_id,
    array['admin']::public.app_role[]
  ) then
    raise exception 'Action réservée aux administrateurs.' using errcode = '42501';
  end if;

  insert into public.privacy_requests (
    organization_id,
    contact_id,
    requested_by,
    request_type,
    status,
    reason
  )
  values (
    v_contact.organization_id,
    v_contact.id,
    (select auth.uid()),
    p_request_type,
    'processing',
    btrim(p_reason)
  )
  returning id into v_request_id;

  if v_contact.normalized_email is not null then
    insert into public.suppression_list (
      organization_id,
      email,
      normalized_email,
      domain,
      company_id,
      contact_id,
      reason,
      source,
      metadata
    )
    values (
      v_contact.organization_id,
      v_contact.email,
      v_contact.normalized_email,
      split_part(v_contact.normalized_email, '@', 2),
      v_contact.company_id,
      v_contact.id,
      btrim(p_reason),
      'privacy_request',
      jsonb_build_object('request_id', v_request_id, 'scope', 'email')
    )
    on conflict (organization_id, normalized_email) do update
    set
      reason = excluded.reason,
      source = excluded.source,
      company_id = excluded.company_id,
      contact_id = excluded.contact_id,
      suppressed_at = now(),
      expires_at = null,
      metadata = excluded.metadata;
  end if;

  update public.campaign_enrollments
  set
    status = 'stopped',
    stopped_at = now(),
    stop_reason = 'privacy_request:' || p_request_type,
    next_send_at = null
  where organization_id = v_contact.organization_id
    and contact_id = v_contact.id
    and status in ('draft', 'pending_approval', 'scheduled', 'active', 'paused');

  select coalesce(array_agg(distinct m.id), '{}'::uuid[])
  into v_message_ids
  from public.messages m
  left join public.mail_threads mt
    on mt.organization_id = m.organization_id
   and mt.id = m.thread_id
  left join public.campaign_enrollments ce
    on ce.organization_id = m.organization_id
   and ce.id = m.enrollment_id
  where m.organization_id = v_contact.organization_id
    and (mt.contact_id = v_contact.id or ce.contact_id = v_contact.id);

  v_message_count := cardinality(v_message_ids);

  delete from public.message_attachments
  where organization_id = v_contact.organization_id
    and message_id = any(v_message_ids);

  update public.message_events
  set
    provider_event_id = null,
    metadata = jsonb_build_object('privacy_redacted', true)
  where organization_id = v_contact.organization_id
    and message_id = any(v_message_ids);

  update public.messages
  set
    provider_message_id = null,
    internet_message_id = null,
    in_reply_to = null,
    sender = '{}'::jsonb,
    recipients = '[]'::jsonb,
    cc = '[]'::jsonb,
    bcc = '[]'::jsonb,
    reply_to = '[]'::jsonb,
    subject = 'Message anonymisé',
    body_text = '[Contenu supprimé dans le cadre d’une demande de confidentialité.]',
    body_html = '<p>Contenu supprimé dans le cadre d’une demande de confidentialité.</p>',
    variant_label = null,
    personalization_facts = '[]'::jsonb,
    risk_flags = '[]'::jsonb,
    ai_summary = null,
    headers = '{}'::jsonb,
    provider_metadata = '{}'::jsonb,
    has_attachments = false,
    error_message = null
  where organization_id = v_contact.organization_id
    and id = any(v_message_ids);

  update public.mail_threads
  set
    provider_thread_id = 'privacy:' || id::text,
    contact_id = null,
    subject = 'Conversation anonymisée',
    summary = null,
    summary_data = null,
    summary_generated_at = null,
    summary_prompt_version = null,
    suggested_reply = null,
    suggested_reply_generated_at = null
  where organization_id = v_contact.organization_id
    and contact_id = v_contact.id;

  update public.opportunities
  set primary_contact_id = null
  where organization_id = v_contact.organization_id
    and primary_contact_id = v_contact.id;

  update public.tasks
  set contact_id = null
  where organization_id = v_contact.organization_id
    and contact_id = v_contact.id;

  update public.appointments
  set contact_id = null
  where organization_id = v_contact.organization_id
    and contact_id = v_contact.id;

  update public.activities
  set contact_id = null
  where organization_id = v_contact.organization_id
    and contact_id = v_contact.id;

  with deleted as (
    delete from public.data_sources
    where organization_id = v_contact.organization_id
      and entity_type = 'contact'
      and entity_id = v_contact.id
    returning id
  )
  select count(*) into v_source_count from deleted;

  update public.contacts
  set
    first_name = 'Contact',
    last_name = 'anonymisé',
    full_name = 'Contact anonymisé',
    job_title = null,
    department = null,
    email = null,
    email_status = 'invalid',
    phone = null,
    linkedin_url = null,
    contact_status = 'do_not_contact',
    confidence = 0,
    lawful_basis = null,
    do_not_contact = true,
    do_not_contact_reason = 'Demande de confidentialité traitée',
    assigned_to = null,
    last_contacted_at = null,
    last_replied_at = null,
    tags = array['privacy_processed']::text[],
    deleted_at = case when p_request_type = 'delete' then now() else deleted_at end
  where id = v_contact.id;

  update public.privacy_requests
  set
    status = 'completed',
    result = jsonb_build_object(
      'contact_anonymized', true,
      'soft_deleted', p_request_type = 'delete',
      'messages_redacted', v_message_count,
      'sources_removed', v_source_count,
      'suppression_proof_retained', v_contact.normalized_email is not null
    ),
    completed_at = now()
  where id = v_request_id;

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
    v_contact.organization_id,
    (select auth.uid()),
    'contact.privacy_' || p_request_type,
    'contact',
    v_contact.id,
    jsonb_build_object('personal_data_present', true),
    jsonb_build_object(
      'personal_data_present', false,
      'request_id', v_request_id,
      'messages_redacted', v_message_count,
      'sources_removed', v_source_count
    )
  );

  return jsonb_build_object(
    'requestId', v_request_id,
    'contactId', v_contact.id,
    'requestType', p_request_type,
    'messagesRedacted', v_message_count,
    'sourcesRemoved', v_source_count,
    'completed', true
  );
end;
$$;

create or replace function public.run_retention(
  p_organization_id uuid,
  p_dry_run boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.compliance_settings%rowtype;
  v_run_id uuid;
  v_contact_ids uuid[] := '{}'::uuid[];
  v_contact_message_ids uuid[] := '{}'::uuid[];
  v_contact_count integer := 0;
  v_message_count integer := 0;
  v_provider_job_count integer := 0;
  v_audit_count integer := 0;
  v_report jsonb;
begin
  select *
  into v_settings
  from public.compliance_settings
  where organization_id = p_organization_id;

  if v_settings.organization_id is null then
    raise exception 'Paramètres de conformité introuvables.';
  end if;

  select coalesce(array_agg(c.id), '{}'::uuid[])
  into v_contact_ids
  from public.contacts c
  where c.organization_id = p_organization_id
    and (
      (
        c.deleted_at is not null
        and c.deleted_at < now() - make_interval(days => v_settings.contact_retention_days)
      )
      or (
        c.deleted_at is null
        and v_settings.anonymize_inactive_contacts
        and c.do_not_contact
        and greatest(
          c.updated_at,
          coalesce(c.last_contacted_at, '-infinity'::timestamptz),
          coalesce(c.last_replied_at, '-infinity'::timestamptz)
        ) < now() - make_interval(days => v_settings.contact_retention_days)
      )
    )
    and c.full_name <> 'Contact anonymisé';

  v_contact_count := cardinality(v_contact_ids);

  select count(*) into v_message_count
  from public.messages
  where organization_id = p_organization_id
    and created_at < now() - make_interval(days => v_settings.message_retention_days);

  select count(*) into v_provider_job_count
  from public.provider_jobs
  where organization_id = p_organization_id
    and created_at < now() - make_interval(days => v_settings.provider_log_retention_days);

  select count(*) into v_audit_count
  from public.audit_logs
  where organization_id = p_organization_id
    and created_at < now() - make_interval(days => v_settings.audit_retention_days);

  v_report := jsonb_build_object(
    'dry_run', p_dry_run,
    'generated_at', now(),
    'contacts_to_anonymize', v_contact_count,
    'messages_to_delete', v_message_count,
    'provider_jobs_to_delete', v_provider_job_count,
    'audit_logs_to_delete', v_audit_count,
    'suppression_proof_retained', v_settings.retain_suppression_proof
  );

  insert into public.retention_runs (
    organization_id,
    requested_by,
    mode,
    status,
    settings_snapshot,
    report,
    started_at,
    completed_at
  )
  values (
    p_organization_id,
    (select auth.uid()),
    case when p_dry_run then 'simulation' else 'execution' end,
    'completed',
    to_jsonb(v_settings) - 'updated_by',
    v_report,
    now(),
    now()
  )
  returning id into v_run_id;

  if not p_dry_run then
    select coalesce(array_agg(distinct m.id), '{}'::uuid[])
    into v_contact_message_ids
    from public.messages m
    left join public.mail_threads mt
      on mt.organization_id = m.organization_id
     and mt.id = m.thread_id
    left join public.campaign_enrollments ce
      on ce.organization_id = m.organization_id
     and ce.id = m.enrollment_id
    where m.organization_id = p_organization_id
      and (
        mt.contact_id = any(v_contact_ids)
        or ce.contact_id = any(v_contact_ids)
      );

    delete from public.message_attachments
    where organization_id = p_organization_id
      and message_id = any(v_contact_message_ids);

    update public.message_events
    set provider_event_id = null, metadata = jsonb_build_object('retention_redacted', true)
    where organization_id = p_organization_id
      and message_id = any(v_contact_message_ids);

    update public.messages
    set
      provider_message_id = null,
      internet_message_id = null,
      in_reply_to = null,
      sender = '{}'::jsonb,
      recipients = '[]'::jsonb,
      cc = '[]'::jsonb,
      bcc = '[]'::jsonb,
      reply_to = '[]'::jsonb,
      subject = 'Message anonymisé',
      body_text = '[Contenu supprimé par la politique de rétention.]',
      body_html = '<p>Contenu supprimé par la politique de rétention.</p>',
      variant_label = null,
      personalization_facts = '[]'::jsonb,
      risk_flags = '[]'::jsonb,
      ai_summary = null,
      headers = '{}'::jsonb,
      provider_metadata = '{}'::jsonb,
      has_attachments = false,
      error_message = null
    where organization_id = p_organization_id
      and id = any(v_contact_message_ids);

    update public.opportunities
    set primary_contact_id = null
    where organization_id = p_organization_id
      and primary_contact_id = any(v_contact_ids);

    update public.campaign_enrollments
    set
      status = 'stopped',
      stopped_at = coalesce(stopped_at, now()),
      stop_reason = 'retention_policy',
      next_send_at = null
    where organization_id = p_organization_id
      and contact_id = any(v_contact_ids)
      and status not in ('completed', 'stopped');

    update public.tasks
    set contact_id = null
    where organization_id = p_organization_id
      and contact_id = any(v_contact_ids);

    update public.appointments
    set contact_id = null
    where organization_id = p_organization_id
      and contact_id = any(v_contact_ids);

    update public.activities
    set contact_id = null
    where organization_id = p_organization_id
      and contact_id = any(v_contact_ids);

    update public.mail_threads
    set
      provider_thread_id = 'retention:' || id::text,
      contact_id = null,
      subject = 'Conversation anonymisée',
      summary = null,
      summary_data = null,
      summary_generated_at = null,
      summary_prompt_version = null,
      suggested_reply = null,
      suggested_reply_generated_at = null
    where organization_id = p_organization_id
      and contact_id = any(v_contact_ids);

    delete from public.data_sources
    where organization_id = p_organization_id
      and entity_type = 'contact'
      and entity_id = any(v_contact_ids);

    update public.contacts
    set
      first_name = 'Contact',
      last_name = 'anonymisé',
      full_name = 'Contact anonymisé',
      job_title = null,
      department = null,
      email = null,
      email_status = 'invalid',
      phone = null,
      linkedin_url = null,
      contact_status = 'do_not_contact',
      confidence = 0,
      lawful_basis = null,
      do_not_contact = true,
      do_not_contact_reason = 'Politique de rétention appliquée',
      assigned_to = null,
      last_contacted_at = null,
      last_replied_at = null,
      tags = array['retention_processed']::text[],
      deleted_at = coalesce(deleted_at, now())
    where organization_id = p_organization_id
      and id = any(v_contact_ids);

    delete from public.messages
    where organization_id = p_organization_id
      and created_at < now() - make_interval(days => v_settings.message_retention_days);

    delete from public.provider_jobs
    where organization_id = p_organization_id
      and created_at < now() - make_interval(days => v_settings.provider_log_retention_days);

    delete from public.audit_logs
    where organization_id = p_organization_id
      and created_at < now() - make_interval(days => v_settings.audit_retention_days);
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
    p_organization_id,
    (select auth.uid()),
    case when p_dry_run then 'retention.simulated' else 'retention.executed' end,
    'retention_run',
    v_run_id,
    v_report
  );

  return jsonb_build_object(
    'runId', v_run_id,
    'mode', case when p_dry_run then 'simulation' else 'execution' end,
    'report', v_report
  );
end;
$$;

revoke all on function private.audit_phase8_event()
  from public, anon, authenticated;
revoke all on function public.process_contact_privacy_request(uuid, text, text)
  from public, anon;
grant execute on function public.process_contact_privacy_request(uuid, text, text)
  to authenticated, service_role;
revoke all on function public.run_retention(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.run_retention(uuid, boolean)
  to service_role;
