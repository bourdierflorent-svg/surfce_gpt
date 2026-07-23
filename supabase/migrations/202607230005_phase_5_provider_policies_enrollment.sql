drop policy data_sources_insert_sales on public.data_sources;
drop policy data_sources_update_sales on public.data_sources;
drop policy data_sources_delete_sales on public.data_sources;

create policy data_sources_insert_phase5_operators
on public.data_sources for insert to authenticated
with check (
  entity_type in ('company', 'contact')
  and private.can_manage_provider_entity(organization_id, entity_type, entity_id)
);

create policy data_sources_update_phase5_operators
on public.data_sources for update to authenticated
using (
  entity_type in ('company', 'contact')
  and private.can_manage_provider_entity(organization_id, entity_type, entity_id)
)
with check (
  entity_type in ('company', 'contact')
  and private.can_manage_provider_entity(organization_id, entity_type, entity_id)
);

create policy data_sources_delete_phase5_operators
on public.data_sources for delete to authenticated
using (
  entity_type in ('company', 'contact')
  and private.can_manage_provider_entity(organization_id, entity_type, entity_id)
);

drop policy provider_jobs_insert_sales on public.provider_jobs;
drop policy provider_jobs_update_sales on public.provider_jobs;
drop policy provider_jobs_delete_sales on public.provider_jobs;

create policy provider_jobs_insert_phase5_operators
on public.provider_jobs for insert to authenticated
with check (
  private.can_manage_provider_entity(
    organization_id,
    entity_type,
    entity_id
  )
);

create policy provider_jobs_update_phase5_operators
on public.provider_jobs for update to authenticated
using (
  private.can_manage_provider_entity(
    organization_id,
    entity_type,
    entity_id
  )
)
with check (
  private.can_manage_provider_entity(
    organization_id,
    entity_type,
    entity_id
  )
);

create policy provider_jobs_delete_phase5_operators
on public.provider_jobs for delete to authenticated
using (
  private.can_manage_provider_entity(
    organization_id,
    entity_type,
    entity_id
  )
);

drop policy ai_runs_insert_sales on public.ai_runs;
drop policy ai_runs_update_sales on public.ai_runs;
drop policy ai_runs_delete_sales on public.ai_runs;

create policy ai_runs_insert_phase5_operators
on public.ai_runs for insert to authenticated
with check (
  private.can_manage_provider_entity(
    organization_id,
    entity_type,
    entity_id
  )
);

create policy ai_runs_update_phase5_operators
on public.ai_runs for update to authenticated
using (
  private.can_manage_provider_entity(
    organization_id,
    entity_type,
    entity_id
  )
)
with check (
  private.can_manage_provider_entity(
    organization_id,
    entity_type,
    entity_id
  )
);

create policy ai_runs_delete_phase5_operators
on public.ai_runs for delete to authenticated
using (
  private.can_manage_provider_entity(
    organization_id,
    entity_type,
    entity_id
  )
);

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
