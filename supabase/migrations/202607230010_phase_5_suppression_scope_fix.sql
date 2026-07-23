create or replace function public.enroll_contact_in_campaign(
  p_campaign_id uuid,
  p_contact_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  campaign_row public.campaigns%rowtype;
  contact_row public.contacts%rowtype;
  enrollment_row public.campaign_enrollments%rowtype;
  company_domain text;
  is_suppressed boolean;
begin
  select *
  into campaign_row
  from public.campaigns
  where id = p_campaign_id
  for update;

  if campaign_row.id is null
    or not private.can_manage_campaign(campaign_row.organization_id, campaign_row.id) then
    raise exception 'Campagne introuvable ou non autorisée.' using errcode = '42501';
  end if;

  if campaign_row.status not in ('draft', 'pending_approval', 'approved') then
    raise exception 'Cette campagne ne peut plus recevoir de nouveaux contacts.';
  end if;

  select c.*
  into contact_row
  from public.contacts c
  where c.organization_id = campaign_row.organization_id
    and c.id = p_contact_id
    and c.deleted_at is null
  for update of c;

  if contact_row.id is null then
    raise exception 'Contact introuvable.';
  end if;

  select domain
  into company_domain
  from public.companies
  where organization_id = contact_row.organization_id
    and id = contact_row.company_id;

  select exists (
    select 1
    from public.suppression_list sl
    where sl.organization_id = contact_row.organization_id
      and (sl.expires_at is null or sl.expires_at > now())
      and (
        sl.normalized_email = contact_row.normalized_email
        or sl.contact_id = contact_row.id
        or (
          sl.company_id = contact_row.company_id
          and sl.metadata->>'scope' = 'company'
        )
        or (
          sl.domain is not null
          and sl.domain = company_domain
          and sl.metadata->>'scope' = 'domain'
        )
      )
  )
  into is_suppressed;

  if contact_row.email is null
    or contact_row.email_status <> 'valid'
    or contact_row.do_not_contact
    or is_suppressed then
    raise exception 'Inscription bloquée : adresse non valide ou opposition active.';
  end if;

  select *
  into enrollment_row
  from public.campaign_enrollments
  where campaign_id = campaign_row.id
    and contact_id = contact_row.id;

  if enrollment_row.id is not null then
    return jsonb_build_object(
      'enrollmentId', enrollment_row.id,
      'reused', true,
      'status', enrollment_row.status
    );
  end if;

  insert into public.campaign_enrollments (
    organization_id,
    campaign_id,
    company_id,
    contact_id,
    status,
    personalization_snapshot
  )
  values (
    campaign_row.organization_id,
    campaign_row.id,
    contact_row.company_id,
    contact_row.id,
    'draft',
    jsonb_build_object(
      'contact_name', contact_row.full_name,
      'job_title', contact_row.job_title,
      'email', contact_row.email
    )
  )
  returning * into enrollment_row;

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    after
  )
  values (
    campaign_row.organization_id,
    (select auth.uid()),
    'campaign.contact_enrolled',
    'campaign_enrollment',
    enrollment_row.id,
    jsonb_build_object(
      'campaign_id', campaign_row.id,
      'contact_id', contact_row.id
    )
  );

  return jsonb_build_object(
    'enrollmentId', enrollment_row.id,
    'reused', false,
    'status', enrollment_row.status
  );
end;
$$;

create or replace function public.suppress_contact(
  p_contact_id uuid,
  p_reason text,
  p_source text default 'manual'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  contact_row public.contacts%rowtype;
  before_snapshot jsonb;
begin
  select *
  into contact_row
  from public.contacts
  where id = p_contact_id
  for update;

  if contact_row.id is null then
    raise exception 'Contact introuvable.';
  end if;

  if not (
    private.has_org_role(
      contact_row.organization_id,
      array['admin', 'sales_manager']::public.app_role[]
    )
    or (
      private.has_org_role(
        contact_row.organization_id,
        array['sales']::public.app_role[]
      )
      and contact_row.assigned_to = (select auth.uid())
    )
  ) then
    raise exception 'Action non autorisée.' using errcode = '42501';
  end if;

  if contact_row.normalized_email is null then
    raise exception 'Une adresse e-mail est nécessaire pour enregistrer l’opposition.';
  end if;

  before_snapshot := jsonb_build_object(
    'do_not_contact', contact_row.do_not_contact,
    'contact_status', contact_row.contact_status
  );

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
    contact_row.organization_id,
    contact_row.email,
    contact_row.normalized_email,
    null,
    contact_row.company_id,
    contact_row.id,
    nullif(btrim(p_reason), ''),
    p_source,
    jsonb_build_object('actor_user_id', (select auth.uid()), 'scope', 'email')
  )
  on conflict (organization_id, normalized_email) do update
  set
    reason = excluded.reason,
    source = excluded.source,
    domain = excluded.domain,
    company_id = excluded.company_id,
    contact_id = excluded.contact_id,
    suppressed_at = now(),
    expires_at = null,
    metadata = excluded.metadata;

  update public.contacts
  set
    do_not_contact = true,
    do_not_contact_reason = nullif(btrim(p_reason), ''),
    contact_status = 'do_not_contact'
  where id = contact_row.id;

  update public.campaign_enrollments
  set
    status = 'stopped',
    stopped_at = now(),
    stop_reason = 'suppression:' || nullif(btrim(p_reason), ''),
    next_send_at = null
  where organization_id = contact_row.organization_id
    and contact_id = contact_row.id
    and status in ('draft', 'pending_approval', 'scheduled', 'active', 'paused');

  update public.messages
  set
    status = 'cancelled',
    error_code = 'suppressed',
    error_message = 'Envoi annulé après opposition.'
  where organization_id = contact_row.organization_id
    and enrollment_id in (
      select id
      from public.campaign_enrollments
      where organization_id = contact_row.organization_id
        and contact_id = contact_row.id
    )
    and status in ('draft', 'pending_approval', 'approved', 'scheduled', 'processing');

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
    contact_row.organization_id,
    (select auth.uid()),
    'contact.suppressed',
    'contact',
    contact_row.id,
    before_snapshot,
    jsonb_build_object(
      'do_not_contact', true,
      'contact_status', 'do_not_contact',
      'reason', nullif(btrim(p_reason), '')
    )
  );

  return jsonb_build_object(
    'suppressed', true,
    'contactId', contact_row.id,
    'normalizedEmail', contact_row.normalized_email
  );
end;
$$;

