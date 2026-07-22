begin;

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin-phase2@surfce.test',
    'not-a-real-password',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Admin Phase 2"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000302',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'viewer-phase2@surfce.test',
    'not-a-real-password',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Viewer Phase 2"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000303',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'venue-manager-phase2@surfce.test',
    'not-a-real-password',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Venue Manager Phase 2"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000401',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin-other-phase2@surfce.test',
    'not-a-real-password',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Admin Other Phase 2"}'::jsonb,
    now(),
    now()
  );

insert into public.organizations (id, name, slug)
values
  ('10000000-0000-0000-0000-000000000301', 'Phase 2 A', 'phase-2-a'),
  ('10000000-0000-0000-0000-000000000401', 'Phase 2 B', 'phase-2-b');

insert into public.memberships (organization_id, user_id, role)
values
  (
    '10000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-000000000301',
    'admin'
  ),
  (
    '10000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-000000000302',
    'viewer'
  ),
  (
    '10000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-000000000303',
    'venue_manager'
  ),
  (
    '10000000-0000-0000-0000-000000000401',
    '00000000-0000-0000-0000-000000000401',
    'admin'
  );

insert into public.venues (
  id,
  organization_id,
  name,
  slug,
  venue_type,
  minimum_guests,
  capacity_standing
)
values
  (
    '30000000-0000-0000-0000-000000000301',
    '10000000-0000-0000-0000-000000000301',
    'Venue A',
    'venue-a',
    'Club',
    10,
    50
  ),
  (
    '30000000-0000-0000-0000-000000000401',
    '10000000-0000-0000-0000-000000000401',
    'Venue B',
    'venue-b',
    'Restaurant',
    20,
    80
  );

insert into public.venue_offers (
  id,
  organization_id,
  venue_id,
  name,
  slug,
  event_type,
  min_guests,
  max_guests,
  minimum_budget
)
values
  (
    '40000000-0000-0000-0000-000000000301',
    '10000000-0000-0000-0000-000000000301',
    '30000000-0000-0000-0000-000000000301',
    'Offer A',
    'offer-a',
    'Afterwork',
    10,
    40,
    1000
  ),
  (
    '40000000-0000-0000-0000-000000000401',
    '10000000-0000-0000-0000-000000000401',
    '30000000-0000-0000-0000-000000000401',
    'Offer B',
    'offer-b',
    'Dîner',
    20,
    60,
    2000
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000301', true);

do $$
declare
  row_total bigint;
begin
  select count(*) into row_total from public.venues;
  if row_total <> 1 then
    raise exception 'Phase 2 RLS failed: admin A sees % venues instead of 1', row_total;
  end if;

  select count(*) into row_total from public.venue_offers;
  if row_total <> 1 then
    raise exception 'Phase 2 RLS failed: admin A sees % offers instead of 1', row_total;
  end if;

  insert into public.venue_assets (
    organization_id,
    venue_id,
    offer_id,
    asset_type,
    storage_path,
    title
  )
  values (
    '10000000-0000-0000-0000-000000000301',
    '30000000-0000-0000-0000-000000000301',
    '40000000-0000-0000-0000-000000000301',
    'brochure',
    '10000000-0000-0000-0000-000000000301/test/brochure.pdf',
    'Brochure test'
  );
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000302', true);

do $$
declare
  changed_rows bigint;
begin
  update public.venues
  set name = 'Viewer edit'
  where id = '30000000-0000-0000-0000-000000000301';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'Phase 2 RLS failed: viewer updated a venue';
  end if;

  begin
    insert into public.venues (organization_id, name, slug, venue_type)
    values (
      '10000000-0000-0000-0000-000000000301',
      'Forbidden venue',
      'forbidden-venue',
      'Club'
    );
    raise exception 'Phase 2 RLS failed: viewer inserted a venue';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000303', true);

do $$
declare
  changed_rows bigint;
begin
  update public.venues
  set atmosphere = 'Updated by venue manager'
  where id = '30000000-0000-0000-0000-000000000301';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'Phase 2 RLS failed: venue manager could not update a venue';
  end if;

  update public.venue_offers
  set minimum_budget = 1200
  where id = '40000000-0000-0000-0000-000000000301';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'Phase 2 RLS failed: venue manager could not update an offer';
  end if;
end;
$$;

reset role;
rollback;

select 'phase_2_rls_assertions_passed' as result;
