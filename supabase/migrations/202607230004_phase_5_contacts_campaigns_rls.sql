create or replace function private.can_manage_campaign(
  p_organization_id uuid,
  p_campaign_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.campaigns c
    where c.organization_id = p_organization_id
      and c.id = p_campaign_id
      and (
        private.has_org_role(
          p_organization_id,
          array['admin', 'sales_manager', 'marketing']::public.app_role[]
        )
        or (
          c.created_by = (select auth.uid())
          and private.has_org_role(
            p_organization_id,
            array['sales']::public.app_role[]
          )
        )
      )
  );
$$;

create or replace function private.can_manage_contact(
  p_organization_id uuid,
  p_contact_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.contacts c
    where c.organization_id = p_organization_id
      and c.id = p_contact_id
      and (
        private.has_org_role(
          p_organization_id,
          array['admin', 'sales_manager']::public.app_role[]
        )
        or (
          c.assigned_to = (select auth.uid())
          and private.has_org_role(
            p_organization_id,
            array['sales']::public.app_role[]
          )
        )
      )
  );
$$;

create or replace function private.can_manage_provider_entity(
  p_organization_id uuid,
  p_entity_type text,
  p_entity_id uuid
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
    or (
      p_entity_type = 'campaign'
      and private.has_org_role(
        p_organization_id,
        array['marketing']::public.app_role[]
      )
    )
    or (
      p_entity_type = 'company'
      and exists (
        select 1 from public.companies c
        where c.organization_id = p_organization_id
          and c.id = p_entity_id
          and c.assigned_to = (select auth.uid())
          and private.has_org_role(
            p_organization_id,
            array['sales']::public.app_role[]
          )
      )
    )
    or (
      p_entity_type = 'contact'
      and private.can_manage_contact(p_organization_id, p_entity_id)
    )
    or (
      p_entity_type = 'campaign'
      and private.can_manage_campaign(p_organization_id, p_entity_id)
    );
$$;

create trigger contacts_set_updated_at
before update on public.contacts
for each row execute function private.set_updated_at();

create trigger mailboxes_set_updated_at
before update on public.mailboxes
for each row execute function private.set_updated_at();

create trigger campaigns_set_updated_at
before update on public.campaigns
for each row execute function private.set_updated_at();

create trigger sequence_steps_set_updated_at
before update on public.sequence_steps
for each row execute function private.set_updated_at();

create trigger campaign_enrollments_set_updated_at
before update on public.campaign_enrollments
for each row execute function private.set_updated_at();

create trigger mail_threads_set_updated_at
before update on public.mail_threads
for each row execute function private.set_updated_at();

create trigger messages_set_updated_at
before update on public.messages
for each row execute function private.set_updated_at();

alter table public.contacts enable row level security;
alter table public.mailboxes enable row level security;
alter table public.campaigns enable row level security;
alter table public.sequence_steps enable row level security;
alter table public.campaign_enrollments enable row level security;
alter table public.mail_threads enable row level security;
alter table public.messages enable row level security;
alter table public.suppression_list enable row level security;
alter table public.audit_logs enable row level security;

create policy contacts_select_members
on public.contacts for select to authenticated
using (private.is_org_member(organization_id));

create policy contacts_insert_sales
on public.contacts for insert to authenticated
with check (
  private.has_org_role(organization_id, array['admin', 'sales_manager']::public.app_role[])
  or (
    private.has_org_role(organization_id, array['sales']::public.app_role[])
    and assigned_to = (select auth.uid())
    and exists (
      select 1 from public.companies c
      where c.organization_id = contacts.organization_id
        and c.id = contacts.company_id
        and c.assigned_to = (select auth.uid())
    )
  )
);
create policy contacts_update_sales
on public.contacts for update to authenticated
using (
  private.has_org_role(organization_id, array['admin', 'sales_manager']::public.app_role[])
  or (
    private.has_org_role(organization_id, array['sales']::public.app_role[])
    and assigned_to = (select auth.uid())
  )
)
with check (
  private.has_org_role(organization_id, array['admin', 'sales_manager']::public.app_role[])
  or (
    private.has_org_role(organization_id, array['sales']::public.app_role[])
    and assigned_to = (select auth.uid())
  )
);

create policy contacts_delete_sales
on public.contacts for delete to authenticated
using (
  private.has_org_role(organization_id, array['admin', 'sales_manager']::public.app_role[])
  or (
    private.has_org_role(organization_id, array['sales']::public.app_role[])
    and assigned_to = (select auth.uid())
  )
);

create policy mailboxes_select_members
on public.mailboxes for select to authenticated
using (private.is_org_member(organization_id));

create policy mailboxes_insert_operators
on public.mailboxes for insert to authenticated
with check (
  private.has_org_role(organization_id, array['admin', 'sales_manager']::public.app_role[])
  or (
    user_id = (select auth.uid())
    and private.has_org_role(
      organization_id,
      array['sales', 'marketing']::public.app_role[]
    )
  )
);

create policy mailboxes_update_operators
on public.mailboxes for update to authenticated
using (
  private.has_org_role(organization_id, array['admin', 'sales_manager']::public.app_role[])
  or user_id = (select auth.uid())
)
with check (
  private.has_org_role(organization_id, array['admin', 'sales_manager']::public.app_role[])
  or user_id = (select auth.uid())
);

create policy mailboxes_delete_operators
on public.mailboxes for delete to authenticated
using (
  private.has_org_role(organization_id, array['admin', 'sales_manager']::public.app_role[])
  or user_id = (select auth.uid())
);

create policy campaigns_select_members
on public.campaigns for select to authenticated
using (private.is_org_member(organization_id));

create policy campaigns_insert_operators
on public.campaigns for insert to authenticated
with check (
  private.has_org_role(
    organization_id,
    array['admin', 'sales_manager', 'marketing']::public.app_role[]
  )
  or (
    created_by = (select auth.uid())
    and private.has_org_role(organization_id, array['sales']::public.app_role[])
  )
);

create policy campaigns_update_operators
on public.campaigns for update to authenticated
using (private.can_manage_campaign(organization_id, id))
with check (private.can_manage_campaign(organization_id, id));

create policy campaigns_delete_operators
on public.campaigns for delete to authenticated
using (private.can_manage_campaign(organization_id, id));

create policy sequence_steps_select_members
on public.sequence_steps for select to authenticated
using (private.is_org_member(organization_id));

create policy sequence_steps_insert_operators
on public.sequence_steps for insert to authenticated
with check (private.can_manage_campaign(organization_id, campaign_id));

create policy sequence_steps_update_operators
on public.sequence_steps for update to authenticated
using (private.can_manage_campaign(organization_id, campaign_id))
with check (private.can_manage_campaign(organization_id, campaign_id));

create policy sequence_steps_delete_operators
on public.sequence_steps for delete to authenticated
using (private.can_manage_campaign(organization_id, campaign_id));

create policy campaign_enrollments_select_members
on public.campaign_enrollments for select to authenticated
using (private.is_org_member(organization_id));

create policy campaign_enrollments_insert_operators
on public.campaign_enrollments for insert to authenticated
with check (private.can_manage_campaign(organization_id, campaign_id));

create policy campaign_enrollments_update_operators
on public.campaign_enrollments for update to authenticated
using (private.can_manage_campaign(organization_id, campaign_id))
with check (private.can_manage_campaign(organization_id, campaign_id));

create policy campaign_enrollments_delete_operators
on public.campaign_enrollments for delete to authenticated
using (private.can_manage_campaign(organization_id, campaign_id));

create policy mail_threads_select_members
on public.mail_threads for select to authenticated
using (private.is_org_member(organization_id));

create policy mail_threads_insert_operators
on public.mail_threads for insert to authenticated
with check (
  campaign_id is not null
  and private.can_manage_campaign(organization_id, campaign_id)
);

create policy mail_threads_update_operators
on public.mail_threads for update to authenticated
using (
  campaign_id is not null
  and private.can_manage_campaign(organization_id, campaign_id)
)
with check (
  campaign_id is not null
  and private.can_manage_campaign(organization_id, campaign_id)
);

create policy mail_threads_delete_operators
on public.mail_threads for delete to authenticated
using (
  campaign_id is not null
  and private.can_manage_campaign(organization_id, campaign_id)
);

create policy messages_select_members
on public.messages for select to authenticated
using (private.is_org_member(organization_id));

create policy messages_insert_operators
on public.messages for insert to authenticated
with check (
  campaign_id is not null
  and private.can_manage_campaign(organization_id, campaign_id)
);

create policy messages_update_operators
on public.messages for update to authenticated
using (
  campaign_id is not null
  and private.can_manage_campaign(organization_id, campaign_id)
)
with check (
  campaign_id is not null
  and private.can_manage_campaign(organization_id, campaign_id)
);

create policy messages_delete_operators
on public.messages for delete to authenticated
using (
  campaign_id is not null
  and private.can_manage_campaign(organization_id, campaign_id)
);

create policy suppression_list_select_compliance
on public.suppression_list for select to authenticated
using (
  private.has_org_role(
    organization_id,
    array['admin', 'direction', 'sales_manager']::public.app_role[]
  )
);

create policy audit_logs_select_compliance
on public.audit_logs for select to authenticated
using (
  private.has_org_role(
    organization_id,
    array['admin', 'direction', 'sales_manager']::public.app_role[]
  )
);

