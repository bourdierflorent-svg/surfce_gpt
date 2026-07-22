begin;

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  venue_type text not null check (char_length(trim(venue_type)) between 2 and 80),
  description text,
  address_line1 text,
  address_line2 text,
  postal_code text,
  city text not null default 'Paris',
  country_code text not null default 'FR' check (country_code ~ '^[A-Z]{2}$'),
  latitude numeric(9, 6) check (latitude between -90 and 90),
  longitude numeric(9, 6) check (longitude between -180 and 180),
  location extensions.geography(Point, 4326),
  district text,
  standing text,
  atmosphere text,
  capacity_seated integer check (capacity_seated is null or capacity_seated >= 0),
  capacity_standing integer check (capacity_standing is null or capacity_standing >= 0),
  minimum_guests integer check (minimum_guests is null or minimum_guests >= 0),
  minimum_spend numeric(12, 2) check (minimum_spend is null or minimum_spend >= 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  features jsonb not null default '{}'::jsonb check (jsonb_typeof(features) = 'object'),
  event_types text[] not null default '{}',
  target_sectors text[] not null default '{}',
  opening_rules jsonb not null default '{}'::jsonb check (jsonb_typeof(opening_rules) = 'object'),
  internal_contact text,
  commercial_terms text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venues_organization_slug_unique unique (organization_id, slug),
  constraint venues_organization_id_id_unique unique (organization_id, id),
  constraint venues_coordinates_together check (
    (latitude is null and longitude is null)
    or (latitude is not null and longitude is not null)
  ),
  constraint venues_minimum_guests_capacity check (
    minimum_guests is null
    or (capacity_standing is null and capacity_seated is null)
    or minimum_guests <= greatest(
      coalesce(capacity_standing, 0),
      coalesce(capacity_seated, 0)
    )
  )
);

create table public.venue_offers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  venue_id uuid not null,
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  event_type text not null check (char_length(trim(event_type)) between 2 and 80),
  short_description text,
  description text,
  min_guests integer check (min_guests is null or min_guests >= 0),
  max_guests integer check (max_guests is null or max_guests >= 0),
  minimum_budget numeric(12, 2) check (minimum_budget is null or minimum_budget >= 0),
  indicative_price numeric(12, 2) check (indicative_price is null or indicative_price >= 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  available_days integer[] not null default '{}',
  available_time_start time,
  available_time_end time,
  inclusions jsonb not null default '[]'::jsonb check (jsonb_typeof(inclusions) = 'array'),
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  commission_rate numeric(5, 2) check (
    commission_rate is null or commission_rate between 0 and 100
  ),
  terms text,
  valid_from date,
  valid_until date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venue_offers_venue_fkey
    foreign key (organization_id, venue_id)
    references public.venues(organization_id, id)
    on delete cascade,
  constraint venue_offers_organization_venue_slug_unique
    unique (organization_id, venue_id, slug),
  constraint venue_offers_organization_venue_id_unique
    unique (organization_id, venue_id, id),
  constraint venue_offers_guest_range check (
    min_guests is null or max_guests is null or min_guests <= max_guests
  ),
  constraint venue_offers_validity_range check (
    valid_from is null or valid_until is null or valid_from <= valid_until
  ),
  constraint venue_offers_available_days check (
    available_days <@ array[0, 1, 2, 3, 4, 5, 6]
  ),
  constraint venue_offers_time_range check (
    available_time_start is null
    or available_time_end is null
    or available_time_start <> available_time_end
  )
);

create table public.venue_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  venue_id uuid not null,
  offer_id uuid,
  asset_type text not null check (
    asset_type in ('image', 'brochure', 'floor_plan', 'menu', 'video', 'other')
  ),
  storage_path text not null unique check (char_length(trim(storage_path)) > 0),
  title text not null check (char_length(trim(title)) between 1 and 160),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venue_assets_venue_fkey
    foreign key (organization_id, venue_id)
    references public.venues(organization_id, id)
    on delete cascade,
  constraint venue_assets_offer_fkey
    foreign key (organization_id, venue_id, offer_id)
    references public.venue_offers(organization_id, venue_id, id)
    on delete cascade
);

create index venues_organization_active_idx
  on public.venues (organization_id, is_active, name);

create index venues_location_gist_idx
  on public.venues using gist (location);

create index venue_offers_venue_active_idx
  on public.venue_offers (venue_id, is_active, name);

create index venue_offers_organization_event_type_idx
  on public.venue_offers (organization_id, event_type);

create index venue_assets_venue_sort_idx
  on public.venue_assets (venue_id, sort_order, created_at);

create index venue_assets_offer_idx
  on public.venue_assets (offer_id)
  where offer_id is not null;

create or replace function private.set_venue_location()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.latitude is null or new.longitude is null then
    new.location = null;
  else
    new.location = extensions.st_setsrid(
      extensions.st_makepoint(new.longitude, new.latitude),
      4326
    )::extensions.geography;
  end if;

  return new;
end;
$$;

create trigger venues_set_location
before insert or update of latitude, longitude on public.venues
for each row execute function private.set_venue_location();

create trigger venues_set_updated_at
before update on public.venues
for each row execute function private.set_updated_at();

create trigger venue_offers_set_updated_at
before update on public.venue_offers
for each row execute function private.set_updated_at();

create trigger venue_assets_set_updated_at
before update on public.venue_assets
for each row execute function private.set_updated_at();

alter table public.venues enable row level security;
alter table public.venue_offers enable row level security;
alter table public.venue_assets enable row level security;

create policy venues_select_members
on public.venues
for select
to authenticated
using (private.is_org_member(organization_id));

create policy venues_insert_editors
on public.venues
for insert
to authenticated
with check (
  private.has_org_role(
    organization_id,
    array['admin', 'venue_manager', 'marketing']::public.app_role[]
  )
);

create policy venues_update_editors
on public.venues
for update
to authenticated
using (
  private.has_org_role(
    organization_id,
    array['admin', 'venue_manager', 'marketing']::public.app_role[]
  )
)
with check (
  private.has_org_role(
    organization_id,
    array['admin', 'venue_manager', 'marketing']::public.app_role[]
  )
);

create policy venues_delete_editors
on public.venues
for delete
to authenticated
using (
  private.has_org_role(
    organization_id,
    array['admin', 'venue_manager', 'marketing']::public.app_role[]
  )
);

create policy venue_offers_select_members
on public.venue_offers
for select
to authenticated
using (private.is_org_member(organization_id));

create policy venue_offers_insert_editors
on public.venue_offers
for insert
to authenticated
with check (
  private.has_org_role(
    organization_id,
    array['admin', 'venue_manager', 'marketing']::public.app_role[]
  )
);

create policy venue_offers_update_editors
on public.venue_offers
for update
to authenticated
using (
  private.has_org_role(
    organization_id,
    array['admin', 'venue_manager', 'marketing']::public.app_role[]
  )
)
with check (
  private.has_org_role(
    organization_id,
    array['admin', 'venue_manager', 'marketing']::public.app_role[]
  )
);

create policy venue_offers_delete_editors
on public.venue_offers
for delete
to authenticated
using (
  private.has_org_role(
    organization_id,
    array['admin', 'venue_manager', 'marketing']::public.app_role[]
  )
);

create policy venue_assets_select_members
on public.venue_assets
for select
to authenticated
using (private.is_org_member(organization_id));

create policy venue_assets_insert_editors
on public.venue_assets
for insert
to authenticated
with check (
  private.has_org_role(
    organization_id,
    array['admin', 'venue_manager', 'marketing']::public.app_role[]
  )
);

create policy venue_assets_update_editors
on public.venue_assets
for update
to authenticated
using (
  private.has_org_role(
    organization_id,
    array['admin', 'venue_manager', 'marketing']::public.app_role[]
  )
)
with check (
  private.has_org_role(
    organization_id,
    array['admin', 'venue_manager', 'marketing']::public.app_role[]
  )
);

create policy venue_assets_delete_editors
on public.venue_assets
for delete
to authenticated
using (
  private.has_org_role(
    organization_id,
    array['admin', 'venue_manager', 'marketing']::public.app_role[]
  )
);

revoke all on table public.venues from anon;
revoke all on table public.venue_offers from anon;
revoke all on table public.venue_assets from anon;

grant select, insert, update, delete on table public.venues to authenticated;
grant select, insert, update, delete on table public.venue_offers to authenticated;
grant select, insert, update, delete on table public.venue_assets to authenticated;

revoke all on function private.set_venue_location() from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'venue-assets',
  'venue-assets',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy venue_assets_storage_select_members
on storage.objects
for select
to authenticated
using (
  bucket_id = 'venue-assets'
  and private.is_org_member(((storage.foldername(name))[1])::uuid)
);

create policy venue_assets_storage_insert_editors
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'venue-assets'
  and private.has_org_role(
    ((storage.foldername(name))[1])::uuid,
    array['admin', 'venue_manager', 'marketing']::public.app_role[]
  )
);

create policy venue_assets_storage_update_editors
on storage.objects
for update
to authenticated
using (
  bucket_id = 'venue-assets'
  and private.has_org_role(
    ((storage.foldername(name))[1])::uuid,
    array['admin', 'venue_manager', 'marketing']::public.app_role[]
  )
)
with check (
  bucket_id = 'venue-assets'
  and private.has_org_role(
    ((storage.foldername(name))[1])::uuid,
    array['admin', 'venue_manager', 'marketing']::public.app_role[]
  )
);

create policy venue_assets_storage_delete_editors
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'venue-assets'
  and private.has_org_role(
    ((storage.foldername(name))[1])::uuid,
    array['admin', 'venue_manager', 'marketing']::public.app_role[]
  )
);

comment on table public.venues is
  'Organization-scoped venue catalog with structured capacity, positioning and location data.';
comment on table public.venue_offers is
  'Commercial event offers attached to a venue and validated for guest, budget and date ranges.';
comment on table public.venue_assets is
  'Metadata for private venue and offer files stored in the venue-assets bucket.';
comment on index public.venues_location_gist_idx is
  'Supports future Phase 3 geographic proximity queries without changing the Phase 2 model.';

commit;
