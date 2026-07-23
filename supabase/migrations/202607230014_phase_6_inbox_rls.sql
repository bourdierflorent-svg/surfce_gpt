create or replace function private.can_manage_conversation(
  p_organization_id uuid,
  p_mailbox_id uuid,
  p_company_id uuid,
  p_contact_id uuid,
  p_campaign_id uuid
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
      from public.mailboxes mb
      where mb.organization_id = p_organization_id
        and mb.id = p_mailbox_id
        and mb.user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.companies c
      where c.organization_id = p_organization_id
        and c.id = p_company_id
        and c.assigned_to = (select auth.uid())
    )
    or exists (
      select 1
      from public.contacts c
      where c.organization_id = p_organization_id
        and c.id = p_contact_id
        and c.assigned_to = (select auth.uid())
    )
    or exists (
      select 1
      from public.campaigns c
      where c.organization_id = p_organization_id
        and c.id = p_campaign_id
        and c.created_by = (select auth.uid())
    );
$$;

create or replace function private.can_manage_message(
  p_organization_id uuid,
  p_thread_id uuid,
  p_campaign_id uuid
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
      from public.mail_threads mt
      where mt.organization_id = p_organization_id
        and mt.id = p_thread_id
        and private.can_manage_conversation(
          mt.organization_id,
          mt.mailbox_id,
          mt.company_id,
          mt.contact_id,
          mt.campaign_id
        )
    )
    or (
      p_campaign_id is not null
      and private.can_manage_campaign(p_organization_id, p_campaign_id)
    );
$$;

drop policy if exists mail_threads_insert_operators on public.mail_threads;
drop policy if exists mail_threads_update_operators on public.mail_threads;
drop policy if exists mail_threads_delete_operators on public.mail_threads;

create policy mail_threads_insert_operators
on public.mail_threads for insert to authenticated
with check (
  private.can_manage_conversation(
    organization_id,
    mailbox_id,
    company_id,
    contact_id,
    campaign_id
  )
);

create policy mail_threads_update_operators
on public.mail_threads for update to authenticated
using (
  private.can_manage_conversation(
    organization_id,
    mailbox_id,
    company_id,
    contact_id,
    campaign_id
  )
)
with check (
  private.can_manage_conversation(
    organization_id,
    mailbox_id,
    company_id,
    contact_id,
    campaign_id
  )
);

create policy mail_threads_delete_managers
on public.mail_threads for delete to authenticated
using (
  private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
);

drop policy if exists messages_insert_operators on public.messages;
drop policy if exists messages_update_operators on public.messages;
drop policy if exists messages_delete_operators on public.messages;

create policy messages_insert_operators
on public.messages for insert to authenticated
with check (
  private.can_manage_message(organization_id, thread_id, campaign_id)
);

create policy messages_update_operators
on public.messages for update to authenticated
using (
  private.can_manage_message(organization_id, thread_id, campaign_id)
)
with check (
  private.can_manage_message(organization_id, thread_id, campaign_id)
);

create policy messages_delete_managers
on public.messages for delete to authenticated
using (
  private.has_org_role(
    organization_id,
    array['admin', 'sales_manager']::public.app_role[]
  )
);

create policy message_events_select_members
on public.message_events for select to authenticated
using (private.is_org_member(organization_id));

create policy message_events_insert_operators
on public.message_events for insert to authenticated
with check (
  private.can_manage_message(
    organization_id,
    (
      select m.thread_id
      from public.messages m
      where m.id = message_id
        and m.organization_id = message_events.organization_id
    ),
    (
      select m.campaign_id
      from public.messages m
      where m.id = message_id
        and m.organization_id = message_events.organization_id
    )
  )
);

create policy message_attachments_select_members
on public.message_attachments for select to authenticated
using (private.is_org_member(organization_id));

revoke all on function private.can_manage_conversation(uuid, uuid, uuid, uuid, uuid) from public;
revoke all on function private.can_manage_message(uuid, uuid, uuid) from public;
grant execute on function private.can_manage_conversation(uuid, uuid, uuid, uuid, uuid)
  to authenticated, service_role;
grant execute on function private.can_manage_message(uuid, uuid, uuid)
  to authenticated, service_role;

grant select, insert, update, delete on public.message_events to authenticated, service_role;
grant select, insert, update, delete on public.message_attachments to authenticated, service_role;
