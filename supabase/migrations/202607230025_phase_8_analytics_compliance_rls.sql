alter table public.compliance_settings enable row level security;
alter table public.analytics_exports enable row level security;
alter table public.retention_runs enable row level security;
alter table public.privacy_requests enable row level security;

create policy compliance_settings_select_leadership
on public.compliance_settings for select to authenticated
using (
  private.has_org_role(
    organization_id,
    array['admin', 'direction', 'sales_manager']::public.app_role[]
  )
);

create policy compliance_settings_update_admin
on public.compliance_settings for update to authenticated
using (
  private.has_org_role(
    organization_id,
    array['admin']::public.app_role[]
  )
)
with check (
  private.has_org_role(
    organization_id,
    array['admin']::public.app_role[]
  )
  and updated_by = (select auth.uid())
);

create policy analytics_exports_select_leadership
on public.analytics_exports for select to authenticated
using (
  private.has_org_role(
    organization_id,
    array['admin', 'direction', 'sales_manager']::public.app_role[]
  )
);

create policy analytics_exports_insert_leadership
on public.analytics_exports for insert to authenticated
with check (
  requested_by = (select auth.uid())
  and private.has_org_role(
    organization_id,
    array['admin', 'direction', 'sales_manager']::public.app_role[]
  )
);

create policy retention_runs_select_leadership
on public.retention_runs for select to authenticated
using (
  private.has_org_role(
    organization_id,
    array['admin', 'direction', 'sales_manager']::public.app_role[]
  )
);

create policy retention_runs_insert_admin
on public.retention_runs for insert to authenticated
with check (
  requested_by = (select auth.uid())
  and mode = 'simulation'
  and private.has_org_role(
    organization_id,
    array['admin']::public.app_role[]
  )
);

create policy privacy_requests_select_leadership
on public.privacy_requests for select to authenticated
using (
  private.has_org_role(
    organization_id,
    array['admin', 'direction', 'sales_manager']::public.app_role[]
  )
);

create policy privacy_requests_insert_admin
on public.privacy_requests for insert to authenticated
with check (
  requested_by = (select auth.uid())
  and request_type = 'access'
  and status = 'completed'
  and private.has_org_role(
    organization_id,
    array['admin']::public.app_role[]
  )
);

grant select, update on public.compliance_settings
  to authenticated, service_role;
grant select, insert on public.analytics_exports
  to authenticated, service_role;
grant select, insert on public.retention_runs
  to authenticated, service_role;
grant select, insert on public.privacy_requests
  to authenticated, service_role;

drop policy if exists audit_logs_select_compliance on public.audit_logs;
create policy audit_logs_select_compliance
on public.audit_logs for select to authenticated
using (
  private.has_org_role(
    organization_id,
    array['admin', 'direction']::public.app_role[]
  )
  or (
    private.has_org_role(
      organization_id,
      array['sales_manager']::public.app_role[]
    )
    and entity_type in (
      'campaigns',
      'campaign_enrollments',
      'messages',
      'mail_threads',
      'opportunities',
      'tasks',
      'appointments',
      'proposals'
    )
  )
);
