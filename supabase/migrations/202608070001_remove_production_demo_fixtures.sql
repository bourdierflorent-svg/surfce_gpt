begin;

-- Production was validated with deterministic fixtures from supabase/seed.sql.
-- Remove only records carrying those reserved identifiers or explicit mock markers.
-- The SURFCE organization, owner membership, CRM stages, provider quotas and archived
-- legacy prototype remain untouched.
do $preflight$
declare
  surfce_organization_id constant uuid := '10000000-0000-0000-0000-000000000001';
begin
  if not exists (
    select 1
    from public.organizations
    where id = surfce_organization_id
      and slug = 'surfce'
  ) then
    return;
  end if;

  if exists (
    select 1
    from public.companies
    where organization_id = surfce_organization_id
      and id in (
        '50000000-0000-0000-0000-000000000001',
        '50000000-0000-0000-0000-000000000002'
      )
      and not (tags @> array['mock']::text[] and domain like '%.example')
  ) then
    raise exception 'Reserved company fixture identifiers contain non-demo data';
  end if;

  if exists (
    select 1
    from public.contacts
    where organization_id = surfce_organization_id
      and id::text like '70000000-0000-0000-0000-0000000000%'
      and not (
        tags @> array['fictif']::text[]
        and (email like '%.example' or email = 'adresse-invalide')
      )
  ) then
    raise exception 'Reserved contact fixture identifiers contain non-demo data';
  end if;

  if exists (
    select 1
    from public.venue_offers
    where organization_id = surfce_organization_id
      and id::text like '40000000-0000-0000-0000-00000000000%'
      and description not like 'Offre de démonstration.%'
  ) then
    raise exception 'Reserved venue offer identifiers contain non-demo data';
  end if;
end;
$preflight$;

delete from public.privacy_requests
where organization_id = '10000000-0000-0000-0000-000000000001'
  and id = '87000000-0000-0000-0000-000000000001';

delete from public.analytics_exports
where organization_id = '10000000-0000-0000-0000-000000000001'
  and id = '89000000-0000-0000-0000-000000000001';

delete from public.retention_runs
where organization_id = '10000000-0000-0000-0000-000000000001'
  and id = '88000000-0000-0000-0000-000000000001';

delete from public.message_attachments
where organization_id = '10000000-0000-0000-0000-000000000001'
  and id::text like '7b000000-0000-0000-0000-0000000000%';

delete from public.message_events
where organization_id = '10000000-0000-0000-0000-000000000001'
  and id::text like '7a000000-0000-0000-0000-0000000000%';

delete from public.proposals
where organization_id = '10000000-0000-0000-0000-000000000001'
  and id::text like '86000000-0000-0000-0000-0000000000%';

delete from public.appointments
where organization_id = '10000000-0000-0000-0000-000000000001'
  and id::text like '85000000-0000-0000-0000-0000000000%';

delete from public.tasks
where organization_id = '10000000-0000-0000-0000-000000000001'
  and id::text like '83000000-0000-0000-0000-0000000000%';

delete from public.activities
where organization_id = '10000000-0000-0000-0000-000000000001'
  and (
    opportunity_id::text like '82000000-0000-0000-0000-0000000000%'
    or company_id in (
      '50000000-0000-0000-0000-000000000001',
      '50000000-0000-0000-0000-000000000002'
    )
  );

delete from public.messages
where organization_id = '10000000-0000-0000-0000-000000000001'
  and id::text like '76000000-0000-0000-0000-0000000000%';

delete from public.mail_threads
where organization_id = '10000000-0000-0000-0000-000000000001'
  and id::text like '75000000-0000-0000-0000-0000000000%';

delete from public.opportunities
where organization_id = '10000000-0000-0000-0000-000000000001'
  and id::text like '82000000-0000-0000-0000-0000000000%';

delete from public.campaign_enrollments
where organization_id = '10000000-0000-0000-0000-000000000001'
  and id::text like '74000000-0000-0000-0000-0000000000%';

delete from public.sequence_steps
where organization_id = '10000000-0000-0000-0000-000000000001'
  and id::text like '73000000-0000-0000-0000-0000000000%';

delete from public.campaigns
where organization_id = '10000000-0000-0000-0000-000000000001'
  and id::text like '72000000-0000-0000-0000-0000000000%';

delete from public.mailboxes
where organization_id = '10000000-0000-0000-0000-000000000001'
  and id = '71000000-0000-0000-0000-000000000001'
  and provider = 'mock';

delete from public.suppression_list
where organization_id = '10000000-0000-0000-0000-000000000001'
  and id = '7f000000-0000-0000-0000-000000000001'
  and source = 'seed_mock';

delete from public.provider_jobs
where organization_id = '10000000-0000-0000-0000-000000000001'
  and provider like 'mock%'
  and id in (
    '62000000-0000-0000-0000-000000000001',
    '62000000-0000-0000-0000-000000000002',
    '62000000-0000-0000-0000-000000000003',
    '78000000-0000-0000-0000-000000000001'
  );

delete from public.ai_runs
where organization_id = '10000000-0000-0000-0000-000000000001'
  and provider = 'mock_ai'
  and id in (
    '63000000-0000-0000-0000-000000000001',
    '79000000-0000-0000-0000-000000000001'
  );

delete from public.provider_usage_events
where organization_id = '10000000-0000-0000-0000-000000000001'
  and provider like 'mock%';

delete from public.venue_matches
where organization_id = '10000000-0000-0000-0000-000000000001'
  and id::text like '61000000-0000-0000-0000-0000000000%';

delete from public.personas
where organization_id = '10000000-0000-0000-0000-000000000001'
  and id = '60000000-0000-0000-0000-000000000001';

delete from public.data_sources
where organization_id = '10000000-0000-0000-0000-000000000001'
  and (
    entity_id in (
      '50000000-0000-0000-0000-000000000001',
      '50000000-0000-0000-0000-000000000002'
    )
    or entity_id::text like '70000000-0000-0000-0000-0000000000%'
  )
  and coalesce((metadata ->> 'mock')::boolean, provider = 'seed_mock');

delete from public.contacts
where organization_id = '10000000-0000-0000-0000-000000000001'
  and id::text like '70000000-0000-0000-0000-0000000000%'
  and tags @> array['fictif']::text[];

delete from public.company_locations
where organization_id = '10000000-0000-0000-0000-000000000001'
  and id::text like '51000000-0000-0000-0000-0000000000%';

delete from public.companies
where organization_id = '10000000-0000-0000-0000-000000000001'
  and id in (
    '50000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000002'
  )
  and tags @> array['mock']::text[]
  and domain like '%.example';

delete from public.venue_offers
where organization_id = '10000000-0000-0000-0000-000000000001'
  and id::text like '40000000-0000-0000-0000-00000000000%'
  and description like 'Offre de démonstration.%';

update public.venues
set
  description = null,
  standing = null,
  atmosphere = null,
  minimum_guests = null,
  features = '{}'::jsonb,
  event_types = '{}',
  target_sectors = '{}',
  opening_rules = '{}'::jsonb
where organization_id = '10000000-0000-0000-0000-000000000001'
  and id::text like '30000000-0000-0000-0000-00000000000%'
  and features ->> 'data_status' = 'demo_to_verify';

update public.compliance_settings
set
  default_lawful_basis = 'legitimate_interest',
  contact_retention_days = 730,
  message_retention_days = 365,
  provider_log_retention_days = 180,
  audit_retention_days = 2190,
  anonymize_inactive_contacts = true,
  retain_suppression_proof = true,
  tracking_enabled = false,
  updated_by = null
where organization_id = '10000000-0000-0000-0000-000000000001';

-- Keep the immutable initialization history for the 11 default CRM stages. Remove only
-- audit rows tied to deterministic fixtures and the compliance reset above.
delete from public.audit_logs
where organization_id = '10000000-0000-0000-0000-000000000001'
  and (
    entity_id::text like any (array[
      '82000000-0000-0000-0000-0000000000%',
      '83000000-0000-0000-0000-0000000000%',
      '85000000-0000-0000-0000-0000000000%',
      '86000000-0000-0000-0000-0000000000%'
    ])
    or entity_id in (
      '87000000-0000-0000-0000-000000000001',
      '88000000-0000-0000-0000-000000000001',
      '89000000-0000-0000-0000-000000000001'
    )
    or (
      entity_type = 'compliance_settings'
      and entity_id = '10000000-0000-0000-0000-000000000001'
    )
  );

do $postcondition$
begin
  if exists (
    select 1 from public.companies
    where organization_id = '10000000-0000-0000-0000-000000000001'
      and tags @> array['mock']::text[]
  ) or exists (
    select 1 from public.contacts
    where organization_id = '10000000-0000-0000-0000-000000000001'
      and tags @> array['fictif']::text[]
  ) or exists (
    select 1 from public.venues
    where organization_id = '10000000-0000-0000-0000-000000000001'
      and features ? 'data_status'
  ) or exists (
    select 1 from public.provider_usage_events
    where organization_id = '10000000-0000-0000-0000-000000000001'
      and provider like 'mock%'
  ) then
    raise exception 'Production demo fixture cleanup is incomplete';
  end if;
end;
$postcondition$;

commit;
