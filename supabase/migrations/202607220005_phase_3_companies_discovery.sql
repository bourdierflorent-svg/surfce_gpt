begin;

create type public.company_status as enum (
  'discovered',
  'qualified',
  'contacted',
  'engaged',
  'opportunity',
  'customer',
  'disqualified'
);

create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  query text,
  category text,
  center extensions.geography(Point, 4326),
  radius_meters integer check (radius_meters is null or radius_meters between 100 and 100000),
  area extensions.geography(Polygon, 4326),
  filters jsonb not null default '{}'::jsonb check (jsonb_typeof(filters) = 'object'),
  result_count integer not null default 0 check (result_count >= 0),
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_searches_area_mode check (
    (center is not null and radius_meters is not null and area is null)
    or (center is null and radius_meters is null and area is not null)
  )
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  legal_name text not null check (char_length(trim(legal_name)) between 2 and 180),
  trade_name text,
  normalized_name text not null check (char_length(trim(normalized_name)) between 2 and 180),
  siren text check (siren is null or siren ~ '^[0-9]{9}$'),
  primary_siret text check (primary_siret is null or primary_siret ~ '^[0-9]{14}$'),
  legal_form text,
  sector text,
  subsector text,
  activity_code text,
  description text,
  website_url text,
  domain text,
  phone text,
  generic_email text,
  linkedin_url text,
  instagram_url text,
  employee_range text,
  revenue_range text,
  address_line1 text,
  address_line2 text,
  postal_code text,
  city text not null default 'Paris',
  country_code text not null default 'FR' check (country_code ~ '^[A-Z]{2}$'),
  location extensions.geography(Point, 4326),
  district text,
  status public.company_status not null default 'discovered',
  qualification_score integer check (qualification_score is null or qualification_score between 0 and 100),
  data_quality_score integer check (data_quality_score is null or data_quality_score between 0 and 100),
  assigned_to uuid references public.profiles(id) on delete set null,
  do_not_contact boolean not null default false,
  do_not_contact_reason text,
  last_verified_at timestamptz,
  last_contacted_at timestamptz,
  next_action_at timestamptz,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint companies_organization_id_id_unique unique (organization_id, id),
  constraint companies_siren_unique unique (organization_id, siren),
  constraint companies_siret_unique unique (organization_id, primary_siret),
  constraint companies_do_not_contact_reason check (
    not do_not_contact or nullif(trim(do_not_contact_reason), '') is not null
  )
);

create table public.company_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null,
  label text not null check (char_length(trim(label)) between 2 and 120),
  siret text check (siret is null or siret ~ '^[0-9]{14}$'),
  address_line1 text,
  postal_code text,
  city text not null,
  country_code text not null default 'FR' check (country_code ~ '^[A-Z]{2}$'),
  location extensions.geography(Point, 4326),
  is_headquarters boolean not null default false,
  source_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_locations_organization_id_id_unique unique (organization_id, id),
  constraint company_locations_company_fkey
    foreign key (organization_id, company_id)
    references public.companies(organization_id, id)
    on delete cascade,
  constraint company_locations_siret_unique unique (organization_id, siret)
);

create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null check (char_length(trim(entity_type)) between 2 and 80),
  entity_id uuid not null,
  field_name text not null check (char_length(trim(field_name)) between 1 and 120),
  provider text not null check (char_length(trim(provider)) between 2 and 80),
  external_reference text,
  source_url text,
  raw_value jsonb,
  normalized_value jsonb,
  collected_at timestamptz not null default now(),
  last_verified_at timestamptz,
  confidence numeric(4, 3) not null default 0.5 check (confidence between 0 and 1),
  is_inferred boolean not null default false,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  constraint data_sources_organization_id_id_unique unique (organization_id, id)
);

alter table public.company_locations
  add constraint company_locations_source_fkey
  foreign key (organization_id, source_id)
  references public.data_sources(organization_id, id)
  on delete set null;

create unique index data_sources_provider_reference_unique
on public.data_sources (organization_id, entity_type, provider, external_reference, field_name)
where external_reference is not null;

create unique index companies_domain_unique
on public.companies (organization_id, lower(domain))
where domain is not null and deleted_at is null;

create index companies_name_search_idx
on public.companies (organization_id, normalized_name);

create index companies_status_idx
on public.companies (organization_id, status)
where deleted_at is null;

create index companies_assigned_to_idx
on public.companies (organization_id, assigned_to)
where deleted_at is null;

create index companies_location_gix
on public.companies
using gist (location);

create index company_locations_company_idx
on public.company_locations (organization_id, company_id);

create index company_locations_location_gix
on public.company_locations
using gist (location);

create index data_sources_entity_idx
on public.data_sources (organization_id, entity_type, entity_id);

create index saved_searches_creator_idx
on public.saved_searches (organization_id, created_by, updated_at desc);

create trigger saved_searches_set_updated_at
before update on public.saved_searches
for each row execute function private.set_updated_at();

create trigger companies_set_updated_at
before update on public.companies
for each row execute function private.set_updated_at();

create trigger company_locations_set_updated_at
before update on public.company_locations
for each row execute function private.set_updated_at();

alter table public.saved_searches enable row level security;
alter table public.companies enable row level security;
alter table public.company_locations enable row level security;
alter table public.data_sources enable row level security;

create policy saved_searches_select_members
on public.saved_searches
for select to authenticated
using (private.is_org_member(organization_id));

create policy saved_searches_insert_members
on public.saved_searches
for insert to authenticated
with check (
  private.is_org_member(organization_id)
  and created_by = auth.uid()
);

create policy saved_searches_update_owners
on public.saved_searches
for update to authenticated
using (
  created_by = auth.uid()
  or private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
)
with check (
  private.is_org_member(organization_id)
  and (
    created_by = auth.uid()
    or private.has_org_role(
      organization_id,
      array['admin', 'sales_manager']::public.app_role[]
    )
  )
);

create policy saved_searches_delete_owners
on public.saved_searches
for delete to authenticated
using (
  created_by = auth.uid()
  or private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
);

create policy companies_select_members
on public.companies
for select to authenticated
using (private.is_org_member(organization_id));

create policy companies_insert_sales
on public.companies
for insert to authenticated
with check (
  private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
  or (
    private.has_org_role(organization_id, array['sales']::public.app_role[])
    and assigned_to = auth.uid()
  )
);

create policy companies_update_sales
on public.companies
for update to authenticated
using (
  private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
  or (
    private.has_org_role(organization_id, array['sales']::public.app_role[])
    and assigned_to = auth.uid()
  )
)
with check (
  private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
  or (
    private.has_org_role(organization_id, array['sales']::public.app_role[])
    and assigned_to = auth.uid()
  )
);

create policy companies_delete_sales
on public.companies
for delete to authenticated
using (
  private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
  or (
    private.has_org_role(organization_id, array['sales']::public.app_role[])
    and assigned_to = auth.uid()
  )
);

create policy company_locations_select_members
on public.company_locations
for select to authenticated
using (private.is_org_member(organization_id));

create policy company_locations_insert_sales
on public.company_locations
for insert to authenticated
with check (
  private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
  or exists (
    select 1
    from public.companies c
    where c.id = company_id
      and c.organization_id = organization_id
      and c.assigned_to = auth.uid()
      and private.has_org_role(organization_id, array['sales']::public.app_role[])
  )
);

create policy company_locations_update_sales
on public.company_locations
for update to authenticated
using (
  private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
  or exists (
    select 1
    from public.companies c
    where c.id = company_id
      and c.organization_id = organization_id
      and c.assigned_to = auth.uid()
      and private.has_org_role(organization_id, array['sales']::public.app_role[])
  )
)
with check (
  private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
  or exists (
    select 1
    from public.companies c
    where c.id = company_id
      and c.organization_id = organization_id
      and c.assigned_to = auth.uid()
      and private.has_org_role(organization_id, array['sales']::public.app_role[])
  )
);

create policy company_locations_delete_sales
on public.company_locations
for delete to authenticated
using (
  private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
  or exists (
    select 1
    from public.companies c
    where c.id = company_id
      and c.organization_id = organization_id
      and c.assigned_to = auth.uid()
      and private.has_org_role(organization_id, array['sales']::public.app_role[])
  )
);

create policy data_sources_select_members
on public.data_sources
for select to authenticated
using (private.is_org_member(organization_id));

create policy data_sources_insert_sales
on public.data_sources
for insert to authenticated
with check (
  private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
  or (
    entity_type = 'company'
    and private.has_org_role(organization_id, array['sales']::public.app_role[])
    and exists (
      select 1
      from public.companies c
      where c.id = entity_id
        and c.organization_id = organization_id
        and c.assigned_to = auth.uid()
    )
  )
);

create policy data_sources_update_sales
on public.data_sources
for update to authenticated
using (
  private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
  or (
    entity_type = 'company'
    and private.has_org_role(organization_id, array['sales']::public.app_role[])
    and exists (
      select 1
      from public.companies c
      where c.id = entity_id
        and c.organization_id = organization_id
        and c.assigned_to = auth.uid()
    )
  )
)
with check (
  private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
  or (
    entity_type = 'company'
    and private.has_org_role(organization_id, array['sales']::public.app_role[])
    and exists (
      select 1
      from public.companies c
      where c.id = entity_id
        and c.organization_id = organization_id
        and c.assigned_to = auth.uid()
    )
  )
);

create policy data_sources_delete_sales
on public.data_sources
for delete to authenticated
using (
  private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
  or (
    entity_type = 'company'
    and private.has_org_role(organization_id, array['sales']::public.app_role[])
    and exists (
      select 1
      from public.companies c
      where c.id = entity_id
        and c.organization_id = organization_id
        and c.assigned_to = auth.uid()
    )
  )
);

create or replace function public.search_companies_in_radius(
  p_organization_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_radius_meters integer
)
returns setof public.companies
language sql
stable
security invoker
set search_path = ''
as $$
  select c.*
  from public.companies c
  where c.organization_id = p_organization_id
    and c.deleted_at is null
    and c.location is not null
    and p_radius_meters between 1 and 100000
    and extensions.st_dwithin(
      c.location,
      extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
      p_radius_meters
    )
  order by extensions.st_distance(
    c.location,
    extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
  );
$$;

create or replace function public.search_companies_in_polygon(
  p_organization_id uuid,
  p_geojson jsonb
)
returns setof public.companies
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_area extensions.geometry;
begin
  v_area := extensions.st_setsrid(extensions.st_geomfromgeojson(p_geojson::text), 4326);

  if extensions.geometrytype(v_area) <> 'POLYGON'
    or not extensions.st_isvalid(v_area)
    or extensions.st_isempty(v_area) then
    raise exception 'Le GeoJSON doit décrire un polygone valide.' using errcode = '22023';
  end if;

  return query
  select c.*
  from public.companies c
  where c.organization_id = p_organization_id
    and c.deleted_at is null
    and c.location is not null
    and extensions.st_covers(v_area, c.location::extensions.geometry)
  order by c.normalized_name;
exception
  when others then
    if sqlstate = '22023' then raise; end if;
    raise exception 'Le GeoJSON fourni est invalide.' using errcode = '22023';
end;
$$;

create or replace function public.import_discovered_company(
  p_organization_id uuid,
  p_company jsonb
)
returns table(company_id uuid, was_created boolean, match_reason text)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_company_id uuid;
  v_normalized_name text;
  v_domain text;
  v_phone text;
  v_address text;
  v_external_id text;
  v_provider text;
  v_assigned_to uuid;
begin
  if not private.has_org_role(
    p_organization_id,
    array['admin', 'sales_manager', 'sales']::public.app_role[]
  ) then
    raise exception 'Action interdite.' using errcode = '42501';
  end if;

  v_normalized_name := nullif(trim(p_company->>'normalized_name'), '');
  v_domain := nullif(lower(trim(p_company->>'domain')), '');
  v_phone := nullif(regexp_replace(p_company->>'phone', '[^0-9+]', '', 'g'), '');
  v_address := nullif(lower(trim(p_company->>'address_line1')), '');
  v_external_id := nullif(trim(p_company->>'external_id'), '');
  v_provider := coalesce(nullif(trim(p_company->>'provider'), ''), 'mock_places');

  if v_normalized_name is null or v_external_id is null then
    raise exception 'Nom normalisé et identifiant provider requis.' using errcode = '22023';
  end if;

  select ds.entity_id into v_company_id
  from public.data_sources ds
  where ds.organization_id = p_organization_id
    and ds.entity_type = 'company'
    and ds.provider = v_provider
    and ds.external_reference = v_external_id
  limit 1;

  if v_company_id is not null then
    return query select v_company_id, false, 'provider_reference'::text;
    return;
  end if;

  if v_domain is not null then
    select c.id into v_company_id
    from public.companies c
    where c.organization_id = p_organization_id
      and c.deleted_at is null
      and lower(c.domain) = v_domain
    limit 1;
  end if;

  if v_company_id is not null then
    return query select v_company_id, false, 'domain'::text;
    return;
  end if;

  if v_phone is not null then
    select c.id into v_company_id
    from public.companies c
    where c.organization_id = p_organization_id
      and c.deleted_at is null
      and regexp_replace(c.phone, '[^0-9+]', '', 'g') = v_phone
    limit 1;
  end if;

  if v_company_id is not null then
    return query select v_company_id, false, 'phone'::text;
    return;
  end if;

  if v_address is not null then
    select c.id into v_company_id
    from public.companies c
    where c.organization_id = p_organization_id
      and c.deleted_at is null
      and c.normalized_name = v_normalized_name
      and lower(c.address_line1) = v_address
    limit 1;
  end if;

  if v_company_id is not null then
    return query select v_company_id, false, 'name_address'::text;
    return;
  end if;

  if private.has_org_role(p_organization_id, array['sales']::public.app_role[])
    and not private.has_org_role(
      p_organization_id,
      array['admin', 'sales_manager']::public.app_role[]
    ) then
    v_assigned_to := auth.uid();
  end if;

  insert into public.companies (
    organization_id,
    legal_name,
    trade_name,
    normalized_name,
    sector,
    subsector,
    description,
    website_url,
    domain,
    phone,
    generic_email,
    employee_range,
    address_line1,
    postal_code,
    city,
    country_code,
    location,
    district,
    qualification_score,
    data_quality_score,
    assigned_to,
    last_verified_at,
    tags
  ) values (
    p_organization_id,
    coalesce(nullif(trim(p_company->>'legal_name'), ''), p_company->>'trade_name'),
    nullif(trim(p_company->>'trade_name'), ''),
    v_normalized_name,
    nullif(trim(p_company->>'sector'), ''),
    nullif(trim(p_company->>'subsector'), ''),
    nullif(trim(p_company->>'description'), ''),
    nullif(trim(p_company->>'website_url'), ''),
    v_domain,
    nullif(trim(p_company->>'phone'), ''),
    nullif(lower(trim(p_company->>'generic_email')), ''),
    nullif(trim(p_company->>'employee_range'), ''),
    nullif(trim(p_company->>'address_line1'), ''),
    nullif(trim(p_company->>'postal_code'), ''),
    coalesce(nullif(trim(p_company->>'city'), ''), 'Paris'),
    coalesce(nullif(upper(trim(p_company->>'country_code')), ''), 'FR'),
    case
      when p_company ? 'latitude' and p_company ? 'longitude'
      then extensions.st_setsrid(
        extensions.st_makepoint(
          (p_company->>'longitude')::double precision,
          (p_company->>'latitude')::double precision
        ),
        4326
      )::extensions.geography
      else null
    end,
    nullif(trim(p_company->>'district'), ''),
    nullif(p_company->>'qualification_score', '')::integer,
    coalesce(nullif(p_company->>'data_quality_score', '')::integer, 70),
    v_assigned_to,
    coalesce(nullif(p_company->>'collected_at', '')::timestamptz, now()),
    coalesce(
      array(select jsonb_array_elements_text(coalesce(p_company->'tags', '[]'::jsonb))),
      '{}'::text[]
    )
  )
  returning id into v_company_id;

  insert into public.company_locations (
    organization_id,
    company_id,
    label,
    address_line1,
    postal_code,
    city,
    country_code,
    location,
    is_headquarters
  ) values (
    p_organization_id,
    v_company_id,
    'Siège déclaré par la source',
    nullif(trim(p_company->>'address_line1'), ''),
    nullif(trim(p_company->>'postal_code'), ''),
    coalesce(nullif(trim(p_company->>'city'), ''), 'Paris'),
    coalesce(nullif(upper(trim(p_company->>'country_code')), ''), 'FR'),
    case
      when p_company ? 'latitude' and p_company ? 'longitude'
      then extensions.st_setsrid(
        extensions.st_makepoint(
          (p_company->>'longitude')::double precision,
          (p_company->>'latitude')::double precision
        ),
        4326
      )::extensions.geography
      else null
    end,
    true
  );

  insert into public.data_sources (
    organization_id,
    entity_type,
    entity_id,
    field_name,
    provider,
    external_reference,
    raw_value,
    normalized_value,
    collected_at,
    last_verified_at,
    confidence,
    is_inferred,
    metadata
  )
  select
    p_organization_id,
    'company',
    v_company_id,
    source.field_name,
    v_provider,
    v_external_id,
    source.raw_value,
    source.normalized_value,
    coalesce(nullif(p_company->>'collected_at', '')::timestamptz, now()),
    coalesce(nullif(p_company->>'collected_at', '')::timestamptz, now()),
    coalesce(nullif(p_company->>'confidence', '')::numeric, 0.78),
    false,
    jsonb_build_object('mock', v_provider = 'mock_places')
  from (
    values
      ('record'::text, p_company, p_company),
      ('trade_name'::text, to_jsonb(p_company->>'trade_name'), to_jsonb(p_company->>'trade_name')),
      ('sector'::text, to_jsonb(p_company->>'sector'), to_jsonb(p_company->>'sector')),
      ('phone'::text, to_jsonb(p_company->>'phone'), to_jsonb(v_phone)),
      ('website_url'::text, to_jsonb(p_company->>'website_url'), to_jsonb(v_domain)),
      ('location'::text, p_company->'location', jsonb_build_object(
        'latitude', p_company->'latitude',
        'longitude', p_company->'longitude'
      ))
  ) as source(field_name, raw_value, normalized_value);

  return query select v_company_id, true, 'created'::text;
end;
$$;

revoke all on function public.search_companies_in_radius(uuid, double precision, double precision, integer)
from public, anon;
revoke all on function public.search_companies_in_polygon(uuid, jsonb)
from public, anon;
revoke all on function public.import_discovered_company(uuid, jsonb)
from public, anon;

grant execute on function public.search_companies_in_radius(uuid, double precision, double precision, integer)
to authenticated;
grant execute on function public.search_companies_in_polygon(uuid, jsonb)
to authenticated;
grant execute on function public.import_discovered_company(uuid, jsonb)
to authenticated;

comment on function public.search_companies_in_radius(uuid, double precision, double precision, integer)
is 'Phase 3 organization-scoped PostGIS radius search; RLS remains active.';
comment on function public.search_companies_in_polygon(uuid, jsonb)
is 'Phase 3 organization-scoped PostGIS polygon search with validated GeoJSON; RLS remains active.';
comment on function public.import_discovered_company(uuid, jsonb)
is 'Atomic, role-scoped and idempotent import of a provider discovery result with provenance.';

commit;
