begin;

drop policy provider_quotas_manage_admin on public.provider_quotas;

create policy provider_quotas_insert_admin
on public.provider_quotas
for insert
to authenticated
with check (
  private.has_org_role(organization_id, array['admin']::public.app_role[])
);

create policy provider_quotas_update_admin
on public.provider_quotas
for update
to authenticated
using (
  private.has_org_role(organization_id, array['admin']::public.app_role[])
)
with check (
  private.has_org_role(organization_id, array['admin']::public.app_role[])
);

create policy provider_quotas_delete_admin
on public.provider_quotas
for delete
to authenticated
using (
  private.has_org_role(organization_id, array['admin']::public.app_role[])
);

commit;
