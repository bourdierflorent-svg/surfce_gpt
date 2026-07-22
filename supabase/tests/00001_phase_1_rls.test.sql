begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(10);

insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  (
    '00000000-0000-0000-0000-000000000101',
    'admin-a@surfce.test',
    'not-a-real-password',
    now(),
    '{"full_name":"Admin A"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    'viewer-a@surfce.test',
    'not-a-real-password',
    now(),
    '{"full_name":"Viewer A"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000201',
    'admin-b@surfce.test',
    'not-a-real-password',
    now(),
    '{"full_name":"Admin B"}'::jsonb
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

select is(
  (select count(*) from public.organizations),
  1::bigint,
  'an admin only sees organizations they belong to'
);

select is(
  (select name from public.organizations limit 1),
  'Organisation A',
  'organization B is hidden from organization A'
);

select is(
  (select count(*) from public.memberships),
  2::bigint,
  'memberships from another organization are hidden'
);

select is(
  (select count(*) from public.profiles),
  2::bigint,
  'profiles from another organization are hidden'
);

select ok(
  private.has_org_role(
    '10000000-0000-0000-0000-000000000101',
    array['admin']::public.app_role[]
  ),
  'admin role is recognized server-side'
);

select is(
  (
    with changed as (
      update public.organizations
      set name = 'Organisation A mise à jour'
      where id = '10000000-0000-0000-0000-000000000101'
      returning id
    )
    select count(*) from changed
  ),
  1::bigint,
  'an admin can update their organization'
);

select is(
  (
    with changed as (
      update public.organizations
      set name = 'Accès interdit'
      where id = '10000000-0000-0000-0000-000000000201'
      returning id
    )
    select count(*) from changed
  ),
  0::bigint,
  'an admin cannot update another organization'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000102', true);

select is(
  (
    with changed as (
      update public.organizations
      set name = 'Modification lecteur'
      where id = '10000000-0000-0000-0000-000000000101'
      returning id
    )
    select count(*) from changed
  ),
  0::bigint,
  'a viewer cannot update their organization'
);

select is(
  (select count(*) from public.memberships),
  2::bigint,
  'a viewer can read memberships in their organization'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);

select is(
  (select name from public.organizations limit 1),
  'Organisation B',
  'organization B admin only sees organization B'
);

select * from finish();
rollback;
