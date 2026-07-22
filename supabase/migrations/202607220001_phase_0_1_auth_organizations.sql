begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists postgis with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create type public.app_role as enum (
  'admin',
  'direction',
  'sales_manager',
  'sales',
  'venue_manager',
  'marketing',
  'viewer'
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  timezone text not null default 'Europe/Paris' check (char_length(trim(timezone)) > 0),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'viewer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memberships_organization_user_unique unique (organization_id, user_id)
);

create index memberships_user_active_idx
  on public.memberships (user_id, is_active)
  where is_active;

create index memberships_organization_active_idx
  on public.memberships (organization_id, is_active)
  where is_active;

create index memberships_organization_role_idx
  on public.memberships (organization_id, role);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function private.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger memberships_set_updated_at
before update on public.memberships
for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    coalesce(new.email, ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'avatar_url', '')), '')
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email,
    avatar_url = excluded.avatar_url,
    updated_at = now();

  return new;
end;
$$;

create trigger on_auth_user_created
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function private.handle_new_user();

create or replace function private.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships as membership
    where membership.organization_id = p_organization_id
      and membership.user_id = (select auth.uid())
      and membership.is_active
  );
$$;

create or replace function private.has_org_role(
  p_organization_id uuid,
  p_roles public.app_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships as membership
    where membership.organization_id = p_organization_id
      and membership.user_id = (select auth.uid())
      and membership.is_active
      and membership.role = any(p_roles)
  );
$$;

create or replace function private.shares_org_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships as current_membership
    join public.memberships as target_membership
      on target_membership.organization_id = current_membership.organization_id
    where current_membership.user_id = (select auth.uid())
      and target_membership.user_id = p_user_id
      and current_membership.is_active
      and target_membership.is_active
  );
$$;

create or replace function private.create_organization(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization_id uuid;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  insert into public.organizations (name, slug)
  values (trim(p_name), lower(trim(p_slug)))
  returning id into organization_id;

  insert into public.memberships (organization_id, user_id, role)
  values (organization_id, current_user_id, 'admin');

  return organization_id;
end;
$$;

create or replace function public.create_organization(p_name text, p_slug text)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.create_organization(p_name, p_slug);
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;

create policy organizations_select_members
on public.organizations
for select
to authenticated
using (private.is_org_member(id));

create policy organizations_update_admin
on public.organizations
for update
to authenticated
using (private.has_org_role(id, array['admin']::public.app_role[]))
with check (private.has_org_role(id, array['admin']::public.app_role[]));

create policy profiles_select_self_or_colleagues
on public.profiles
for select
to authenticated
using (id = (select auth.uid()) or private.shares_org_with(id));

create policy profiles_update_self
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy memberships_select_members
on public.memberships
for select
to authenticated
using (private.is_org_member(organization_id));

create policy memberships_insert_admin
on public.memberships
for insert
to authenticated
with check (private.has_org_role(organization_id, array['admin']::public.app_role[]));

create policy memberships_update_admin
on public.memberships
for update
to authenticated
using (private.has_org_role(organization_id, array['admin']::public.app_role[]))
with check (private.has_org_role(organization_id, array['admin']::public.app_role[]));

create policy memberships_delete_admin
on public.memberships
for delete
to authenticated
using (private.has_org_role(organization_id, array['admin']::public.app_role[]));

revoke all on table public.organizations from anon;
revoke all on table public.profiles from anon;
revoke all on table public.memberships from anon;

grant select, update on table public.organizations to authenticated;
grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.memberships to authenticated;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.is_org_member(uuid) from public, anon;
revoke all on function private.has_org_role(uuid, public.app_role[]) from public, anon;
revoke all on function private.shares_org_with(uuid) from public, anon;
revoke all on function private.create_organization(text, text) from public, anon;
revoke all on function public.create_organization(text, text) from public, anon;

grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_org_role(uuid, public.app_role[]) to authenticated;
grant execute on function private.shares_org_with(uuid) to authenticated;
grant execute on function private.create_organization(text, text) to authenticated;
grant execute on function public.create_organization(text, text) to authenticated;

comment on function private.is_org_member(uuid) is
  'Checks active organization membership without recursively evaluating membership RLS.';
comment on function private.has_org_role(uuid, public.app_role[]) is
  'Checks an active organization role for server-side and RLS authorization.';
comment on index public.memberships_user_active_idx is
  'Supports resolving the active organization context for an authenticated user.';

commit;
