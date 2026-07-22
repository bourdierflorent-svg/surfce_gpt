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
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin-a@surfce.test',
    'not-a-real-password',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Admin A"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'viewer-a@surfce.test',
    'not-a-real-password',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Viewer A"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin-b@surfce.test',
    'not-a-real-password',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Admin B"}'::jsonb,
    now(),
    now()
  );

insert into public.organizations (id, name, slug)
values
  ('10000000-0000-0000-0000-000000000101', 'Organisation A', 'organisation-a'),
  ('10000000-0000-0000-0000-000000000201', 'Organisation B', 'organisation-b');

insert into public.memberships (organization_id, user_id, role)
values
  (
    '10000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000101',
    'admin'
  ),
  (
    '10000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000102',
    'viewer'
  ),
  (
    '10000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000201',
    'admin'
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);

do $$
declare
  row_total bigint;
  changed_rows bigint;
  visible_name text;
begin
  select count(*) into row_total from public.organizations;
  if row_total <> 1 then
    raise exception 'RLS assertion failed: admin A sees % organizations instead of 1', row_total;
  end if;

  select name into visible_name from public.organizations limit 1;
  if visible_name <> 'Organisation A' then
    raise exception 'RLS assertion failed: admin A sees %', visible_name;
  end if;

  select count(*) into row_total from public.memberships;
  if row_total <> 2 then
    raise exception 'RLS assertion failed: admin A sees % memberships instead of 2', row_total;
  end if;

  select count(*) into row_total from public.profiles;
  if row_total <> 2 then
    raise exception 'RLS assertion failed: admin A sees % profiles instead of 2', row_total;
  end if;

  if not private.has_org_role(
    '10000000-0000-0000-0000-000000000101',
    array['admin']::public.app_role[]
  ) then
    raise exception 'RLS assertion failed: admin role was not recognized';
  end if;

  update public.organizations
  set name = 'Organisation A mise à jour'
  where id = '10000000-0000-0000-0000-000000000101';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'RLS assertion failed: admin A could not update organization A';
  end if;

  update public.organizations
  set name = 'Accès interdit'
  where id = '10000000-0000-0000-0000-000000000201';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'RLS assertion failed: admin A updated organization B';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000102', true);

do $$
declare
  row_total bigint;
  changed_rows bigint;
begin
  update public.organizations
  set name = 'Modification lecteur'
  where id = '10000000-0000-0000-0000-000000000101';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'RLS assertion failed: viewer updated organization A';
  end if;

  select count(*) into row_total from public.memberships;
  if row_total <> 2 then
    raise exception 'RLS assertion failed: viewer sees % memberships instead of 2', row_total;
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);

do $$
declare
  visible_name text;
begin
  select name into visible_name from public.organizations limit 1;
  if visible_name <> 'Organisation B' then
    raise exception 'RLS assertion failed: admin B sees %', visible_name;
  end if;
end;
$$;

reset role;
rollback;

select 'phase_1_rls_assertions_passed' as result;
