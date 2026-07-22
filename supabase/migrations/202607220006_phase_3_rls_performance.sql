begin;

create index companies_assigned_to_fk_idx
on public.companies (assigned_to)
where assigned_to is not null;

create index company_locations_source_fk_idx
on public.company_locations (organization_id, source_id)
where source_id is not null;

create index saved_searches_created_by_fk_idx
on public.saved_searches (created_by);

alter policy saved_searches_insert_members
on public.saved_searches
with check (
  private.is_org_member(organization_id)
  and created_by = (select auth.uid())
);

alter policy saved_searches_update_owners
on public.saved_searches
using (
  created_by = (select auth.uid())
  or private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
)
with check (
  private.is_org_member(organization_id)
  and (
    created_by = (select auth.uid())
    or private.has_org_role(
      organization_id,
      array['admin', 'sales_manager']::public.app_role[]
    )
  )
);

alter policy saved_searches_delete_owners
on public.saved_searches
using (
  created_by = (select auth.uid())
  or private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
);

alter policy companies_insert_sales
on public.companies
with check (
  private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
  or (
    private.has_org_role(organization_id, array['sales']::public.app_role[])
    and assigned_to = (select auth.uid())
  )
);

alter policy companies_update_sales
on public.companies
using (
  private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
  or (
    private.has_org_role(organization_id, array['sales']::public.app_role[])
    and assigned_to = (select auth.uid())
  )
)
with check (
  private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
  or (
    private.has_org_role(organization_id, array['sales']::public.app_role[])
    and assigned_to = (select auth.uid())
  )
);

alter policy companies_delete_sales
on public.companies
using (
  private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
  or (
    private.has_org_role(organization_id, array['sales']::public.app_role[])
    and assigned_to = (select auth.uid())
  )
);

alter policy company_locations_insert_sales
on public.company_locations
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
      and c.assigned_to = (select auth.uid())
      and private.has_org_role(organization_id, array['sales']::public.app_role[])
  )
);

alter policy company_locations_update_sales
on public.company_locations
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
      and c.assigned_to = (select auth.uid())
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
      and c.assigned_to = (select auth.uid())
      and private.has_org_role(organization_id, array['sales']::public.app_role[])
  )
);

alter policy company_locations_delete_sales
on public.company_locations
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
      and c.assigned_to = (select auth.uid())
      and private.has_org_role(organization_id, array['sales']::public.app_role[])
  )
);

alter policy data_sources_insert_sales
on public.data_sources
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
        and c.assigned_to = (select auth.uid())
    )
  )
);

alter policy data_sources_update_sales
on public.data_sources
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
        and c.assigned_to = (select auth.uid())
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
        and c.assigned_to = (select auth.uid())
    )
  )
);

alter policy data_sources_delete_sales
on public.data_sources
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
        and c.assigned_to = (select auth.uid())
    )
  )
);

commit;
