create index analytics_exports_organization_created_idx
  on public.analytics_exports (organization_id, created_at desc);
create index compliance_settings_updated_by_fk_idx
  on public.compliance_settings (updated_by)
  where updated_by is not null;
create index analytics_exports_requested_by_fk_idx
  on public.analytics_exports (requested_by);

create index retention_runs_organization_created_idx
  on public.retention_runs (organization_id, created_at desc);
create index retention_runs_requested_by_fk_idx
  on public.retention_runs (requested_by)
  where requested_by is not null;

create index privacy_requests_organization_created_idx
  on public.privacy_requests (organization_id, created_at desc);
create index privacy_requests_contact_fk_idx
  on public.privacy_requests (organization_id, contact_id)
  where contact_id is not null;
create index privacy_requests_requested_by_fk_idx
  on public.privacy_requests (requested_by);

create index contacts_retention_idx
  on public.contacts (organization_id, updated_at)
  where deleted_at is not null or do_not_contact;
create index messages_retention_idx
  on public.messages (organization_id, created_at);
create index provider_jobs_retention_idx
  on public.provider_jobs (organization_id, created_at);
