create or replace function private.can_manage_opportunity(
  p_organization_id uuid,
  p_opportunity_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.has_org_role(
      p_organization_id,
      array['admin', 'sales_manager']::public.app_role[]
    )
    or exists (
      select 1
      from public.opportunities o
      where o.organization_id = p_organization_id
        and o.id = p_opportunity_id
        and o.owner_id = (select auth.uid())
        and private.has_org_role(
          p_organization_id,
          array['sales']::public.app_role[]
        )
    );
$$;

create or replace function private.can_manage_task(
  p_organization_id uuid,
  p_task_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.has_org_role(
      p_organization_id,
      array['admin', 'sales_manager']::public.app_role[]
    )
    or exists (
      select 1
      from public.tasks t
      where t.organization_id = p_organization_id
        and t.id = p_task_id
        and (
          t.assigned_to = (select auth.uid())
          or t.created_by = (select auth.uid())
          or (
            t.opportunity_id is not null
            and private.can_manage_opportunity(t.organization_id, t.opportunity_id)
          )
        )
    );
$$;

alter table public.opportunity_stages enable row level security;
alter table public.opportunities enable row level security;
alter table public.activities enable row level security;
alter table public.tasks enable row level security;
alter table public.appointments enable row level security;
alter table public.proposals enable row level security;

create policy opportunity_stages_select_members
on public.opportunity_stages for select to authenticated
using (private.is_org_member(organization_id));

create policy opportunity_stages_insert_managers
on public.opportunity_stages for insert to authenticated
with check (
  private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
);

create policy opportunity_stages_update_managers
on public.opportunity_stages for update to authenticated
using (
  private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
)
with check (
  private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
);

create policy opportunity_stages_delete_admin
on public.opportunity_stages for delete to authenticated
using (
  private.has_org_role(
    organization_id,
    array['admin']::public.app_role[]
  )
);

create policy opportunities_select_members
on public.opportunities for select to authenticated
using (private.is_org_member(organization_id));

create policy opportunities_insert_sales
on public.opportunities for insert to authenticated
with check (
  private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
  or (
    owner_id = (select auth.uid())
    and private.has_org_role(
      organization_id,
      array['sales']::public.app_role[]
    )
    and exists (
      select 1
      from public.companies c
      where c.organization_id = opportunities.organization_id
        and c.id = opportunities.company_id
        and c.assigned_to = (select auth.uid())
    )
  )
);

create policy opportunities_update_sales
on public.opportunities for update to authenticated
using (private.can_manage_opportunity(organization_id, id))
with check (private.can_manage_opportunity(organization_id, id));

create policy opportunities_delete_managers
on public.opportunities for delete to authenticated
using (
  private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
);

create policy activities_select_members
on public.activities for select to authenticated
using (private.is_org_member(organization_id));

create policy activities_insert_sales
on public.activities for insert to authenticated
with check (
  (
    opportunity_id is not null
    and private.can_manage_opportunity(organization_id, opportunity_id)
  )
  or private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
);

create policy tasks_select_members
on public.tasks for select to authenticated
using (private.is_org_member(organization_id));

create policy tasks_insert_sales
on public.tasks for insert to authenticated
with check (
  private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
  or (
    assigned_to = (select auth.uid())
    and private.has_org_role(
      organization_id,
      array['sales']::public.app_role[]
    )
    and (
      opportunity_id is null
      or private.can_manage_opportunity(organization_id, opportunity_id)
    )
  )
);

create policy tasks_update_assignees
on public.tasks for update to authenticated
using (private.can_manage_task(organization_id, id))
with check (private.can_manage_task(organization_id, id));

create policy tasks_delete_managers
on public.tasks for delete to authenticated
using (
  private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
  or created_by = (select auth.uid())
);

create policy appointments_select_members
on public.appointments for select to authenticated
using (private.is_org_member(organization_id));

create policy appointments_insert_sales
on public.appointments for insert to authenticated
with check (
  private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
  or (
    owner_id = (select auth.uid())
    and private.has_org_role(
      organization_id,
      array['sales']::public.app_role[]
    )
    and (
      opportunity_id is null
      or private.can_manage_opportunity(organization_id, opportunity_id)
    )
  )
);

create policy appointments_update_sales
on public.appointments for update to authenticated
using (
  private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
  or owner_id = (select auth.uid())
)
with check (
  private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
  or owner_id = (select auth.uid())
);

create policy appointments_delete_managers
on public.appointments for delete to authenticated
using (
  private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
  or owner_id = (select auth.uid())
);

create policy proposals_select_members
on public.proposals for select to authenticated
using (private.is_org_member(organization_id));

create policy proposals_insert_sales
on public.proposals for insert to authenticated
with check (
  private.can_manage_opportunity(organization_id, opportunity_id)
  and created_by = (select auth.uid())
);

create policy proposals_update_sales
on public.proposals for update to authenticated
using (private.can_manage_opportunity(organization_id, opportunity_id))
with check (private.can_manage_opportunity(organization_id, opportunity_id));

create policy proposals_delete_managers
on public.proposals for delete to authenticated
using (
  private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
);

revoke all on function private.can_manage_opportunity(uuid, uuid)
  from public, anon;
revoke all on function private.can_manage_task(uuid, uuid)
  from public, anon;
grant execute on function private.can_manage_opportunity(uuid, uuid)
  to authenticated, service_role;
grant execute on function private.can_manage_task(uuid, uuid)
  to authenticated, service_role;

grant select, insert, update, delete on public.opportunity_stages
  to authenticated, service_role;
grant select, insert, update, delete on public.opportunities
  to authenticated, service_role;
grant select, insert, update, delete on public.activities
  to authenticated, service_role;
grant select, insert, update, delete on public.tasks
  to authenticated, service_role;
grant select, insert, update, delete on public.appointments
  to authenticated, service_role;
grant select, insert, update, delete on public.proposals
  to authenticated, service_role;
