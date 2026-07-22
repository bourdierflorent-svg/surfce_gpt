begin;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-phase3@surfce.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Admin Phase 3"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'viewer-phase3@surfce.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Viewer Phase 3"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sales-phase3@surfce.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Sales Phase 3"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-other-phase3@surfce.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Admin Other Phase 3"}'::jsonb, now(), now());

insert into public.organizations (id, name, slug)
values
  ('10000000-0000-0000-0000-000000000501', 'Phase 3 A', 'phase-3-a'),
  ('10000000-0000-0000-0000-000000000601', 'Phase 3 B', 'phase-3-b');

insert into public.memberships (organization_id, user_id, role)
values
  ('10000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000501', 'admin'),
  ('10000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000502', 'viewer'),
  ('10000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000503', 'sales'),
  ('10000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000601', 'admin');

insert into public.companies (
  id, organization_id, legal_name, normalized_name, domain, phone,
  address_line1, city, location, assigned_to
)
values
  ('50000000-0000-0000-0000-000000000501', '10000000-0000-0000-0000-000000000501', 'Test A fictive', 'test a fictive', 'test-a.example', '+33180000501', '1 rue Test', 'Paris', extensions.st_setsrid(extensions.st_makepoint(2.3333, 48.8667), 4326)::extensions.geography, '00000000-0000-0000-0000-000000000503'),
  ('50000000-0000-0000-0000-000000000502', '10000000-0000-0000-0000-000000000501', 'Test non attribué fictive', 'test non attribue fictive', 'test-unassigned.example', '+33180000502', '2 rue Test', 'Paris', extensions.st_setsrid(extensions.st_makepoint(2.34, 48.87), 4326)::extensions.geography, null),
  ('50000000-0000-0000-0000-000000000601', '10000000-0000-0000-0000-000000000601', 'Test B fictive', 'test b fictive', 'test-b.example', '+33180000601', '6 rue Test', 'Paris', extensions.st_setsrid(extensions.st_makepoint(2.35, 48.88), 4326)::extensions.geography, null);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000501', true);

do $$
declare
  row_total bigint;
  first_import record;
  second_import record;
begin
  select count(*) into row_total from public.companies;
  if row_total <> 2 then
    raise exception 'Phase 3 RLS failed: admin A sees % companies instead of 2', row_total;
  end if;

  select count(*) into row_total
  from public.search_companies_in_radius(
    '10000000-0000-0000-0000-000000000501', 48.8667, 2.3333, 2000
  );
  if row_total <> 2 then
    raise exception 'Phase 3 PostGIS radius failed: % rows instead of 2', row_total;
  end if;

  select count(*) into row_total
  from public.search_companies_in_polygon(
    '10000000-0000-0000-0000-000000000501',
    '{"type":"Polygon","coordinates":[[[2.30,48.84],[2.37,48.84],[2.37,48.90],[2.30,48.90],[2.30,48.84]]]}'::jsonb
  );
  if row_total <> 2 then
    raise exception 'Phase 3 PostGIS polygon failed: % rows instead of 2', row_total;
  end if;

  select * into first_import from public.import_discovered_company(
    '10000000-0000-0000-0000-000000000501',
    '{"external_id":"remote-phase3-mock","provider":"mock_places","legal_name":"Import fictif","trade_name":"Import fictif","normalized_name":"import fictif","domain":"remote-phase3.example","phone":"+33180000999","address_line1":"9 rue Mock","city":"Paris","country_code":"FR","latitude":48.86,"longitude":2.32,"tags":["mock"]}'::jsonb
  );
  select * into second_import from public.import_discovered_company(
    '10000000-0000-0000-0000-000000000501',
    '{"external_id":"remote-phase3-mock","provider":"mock_places","legal_name":"Import fictif","trade_name":"Import fictif","normalized_name":"import fictif","domain":"remote-phase3.example","phone":"+33180000999","address_line1":"9 rue Mock","city":"Paris","country_code":"FR","latitude":48.86,"longitude":2.32,"tags":["mock"]}'::jsonb
  );
  if not first_import.was_created or second_import.was_created or first_import.company_id <> second_import.company_id then
    raise exception 'Phase 3 import is not idempotent';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000502', true);

do $$
declare changed_rows bigint;
begin
  update public.companies set legal_name = 'Viewer edit' where id = '50000000-0000-0000-0000-000000000501';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then raise exception 'Phase 3 RLS failed: viewer updated a company'; end if;

  begin
    perform public.import_discovered_company(
      '10000000-0000-0000-0000-000000000501',
      '{"external_id":"viewer-forbidden","normalized_name":"viewer forbidden"}'::jsonb
    );
    raise exception 'Phase 3 RLS failed: viewer imported a company';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000503', true);

do $$
declare changed_rows bigint;
begin
  update public.companies set qualification_score = 77 where id = '50000000-0000-0000-0000-000000000501';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then raise exception 'Phase 3 RLS failed: assigned sales could not update company'; end if;

  update public.companies set qualification_score = 77 where id = '50000000-0000-0000-0000-000000000502';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then raise exception 'Phase 3 RLS failed: sales updated an unassigned company'; end if;
end;
$$;

reset role;
rollback;

select 'phase_3_rls_and_postgis_assertions_passed' as result;
