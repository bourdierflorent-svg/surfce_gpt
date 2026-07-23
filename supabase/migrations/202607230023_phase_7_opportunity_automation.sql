create or replace function private.resolve_opportunity_stage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stage public.opportunity_stages%rowtype;
begin
  select *
  into v_stage
  from public.opportunity_stages
  where organization_id = new.organization_id
    and id = new.stage_id;

  if v_stage.id is null then
    raise exception 'Étape d’opportunité introuvable.';
  end if;

  if tg_op = 'UPDATE' and new.stage_id is distinct from old.stage_id then
    new.probability := v_stage.default_probability;
    new.last_activity_at := now();
  end if;

  if v_stage.category = 'won' then
    new.won_at := coalesce(new.won_at, now());
    new.lost_at := null;
    new.loss_reason := null;
  elsif v_stage.category = 'lost' then
    new.lost_at := coalesce(new.lost_at, now());
    new.won_at := null;
  else
    new.won_at := null;
    new.lost_at := null;
  end if;

  return new;
end;
$$;

create trigger opportunities_resolve_stage
before insert or update of stage_id on public.opportunities
for each row execute function private.resolve_opportunity_stage();

create or replace function private.audit_phase7_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_before jsonb;
  v_after jsonb;
  v_organization_id uuid;
  v_entity_id uuid;
begin
  v_before := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  v_after := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  v_row := coalesce(v_after, v_before);
  v_organization_id := (v_row->>'organization_id')::uuid;
  v_entity_id := (v_row->>'id')::uuid;

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    before,
    after
  )
  values (
    v_organization_id,
    (select auth.uid()),
    tg_table_name || '.' || lower(tg_op),
    tg_table_name,
    v_entity_id,
    v_before,
    v_after
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger opportunity_stages_audit
after insert or update or delete on public.opportunity_stages
for each row execute function private.audit_phase7_mutation();

create trigger opportunities_audit
after insert or update or delete on public.opportunities
for each row execute function private.audit_phase7_mutation();

create trigger tasks_audit
after insert or update or delete on public.tasks
for each row execute function private.audit_phase7_mutation();

create trigger appointments_audit
after insert or update or delete on public.appointments
for each row execute function private.audit_phase7_mutation();

create trigger proposals_audit
after insert or update or delete on public.proposals
for each row execute function private.audit_phase7_mutation();

create or replace function private.record_opportunity_stage_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_label text;
  v_new_label text;
begin
  if tg_op = 'INSERT' then
    insert into public.activities (
      organization_id,
      company_id,
      contact_id,
      opportunity_id,
      user_id,
      activity_type,
      title,
      description,
      metadata
    )
    values (
      new.organization_id,
      new.company_id,
      new.primary_contact_id,
      new.id,
      (select auth.uid()),
      'opportunity_created',
      'Opportunité créée',
      new.title,
      jsonb_build_object('source', new.source, 'stage_id', new.stage_id)
    );
    return new;
  end if;

  if new.stage_id is distinct from old.stage_id then
    select label into v_old_label
    from public.opportunity_stages
    where organization_id = old.organization_id and id = old.stage_id;

    select label into v_new_label
    from public.opportunity_stages
    where organization_id = new.organization_id and id = new.stage_id;

    insert into public.activities (
      organization_id,
      company_id,
      contact_id,
      opportunity_id,
      user_id,
      activity_type,
      title,
      description,
      metadata
    )
    values (
      new.organization_id,
      new.company_id,
      new.primary_contact_id,
      new.id,
      (select auth.uid()),
      'stage_changed',
      'Étape modifiée',
      coalesce(v_old_label, 'Étape précédente') || ' → ' || coalesce(v_new_label, 'Nouvelle étape'),
      jsonb_build_object(
        'from_stage_id', old.stage_id,
        'to_stage_id', new.stage_id,
        'probability', new.probability
      )
    );
  end if;

  return new;
end;
$$;

create trigger opportunities_activity
after insert or update of stage_id on public.opportunities
for each row execute function private.record_opportunity_stage_activity();

create or replace function private.record_task_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_opportunity public.opportunities%rowtype;
  v_next_task public.tasks%rowtype;
begin
  if new.opportunity_id is null then
    return new;
  end if;

  select * into v_opportunity
  from public.opportunities
  where organization_id = new.organization_id
    and id = new.opportunity_id;

  if tg_op = 'INSERT' then
    insert into public.activities (
      organization_id,
      company_id,
      contact_id,
      opportunity_id,
      user_id,
      activity_type,
      title,
      description,
      metadata
    )
    values (
      new.organization_id,
      new.company_id,
      new.contact_id,
      new.opportunity_id,
      (select auth.uid()),
      'task_created',
      'Tâche créée',
      new.title,
      jsonb_build_object('task_id', new.id, 'due_at', new.due_at, 'priority', new.priority)
    );

    update public.opportunities
    set
      next_action = new.title,
      next_action_at = new.due_at,
      last_activity_at = now()
    where id = new.opportunity_id
      and organization_id = new.organization_id
      and (
        next_action_at is null
        or (new.due_at is not null and new.due_at <= next_action_at)
      );
  elsif new.status = 'completed' and old.status is distinct from new.status then
    insert into public.activities (
      organization_id,
      company_id,
      contact_id,
      opportunity_id,
      user_id,
      activity_type,
      title,
      description,
      metadata
    )
    values (
      new.organization_id,
      new.company_id,
      new.contact_id,
      new.opportunity_id,
      (select auth.uid()),
      'task_completed',
      'Tâche terminée',
      new.title,
      jsonb_build_object('task_id', new.id)
    );

    select *
    into v_next_task
    from public.tasks
    where organization_id = new.organization_id
      and opportunity_id = new.opportunity_id
      and id <> new.id
      and status in ('todo', 'in_progress')
    order by due_at asc nulls last, created_at asc
    limit 1;

    update public.opportunities
    set
      next_action = v_next_task.title,
      next_action_at = v_next_task.due_at,
      last_activity_at = now()
    where id = new.opportunity_id
      and organization_id = new.organization_id;
  end if;

  return new;
end;
$$;

create trigger tasks_activity
after insert or update of status on public.tasks
for each row execute function private.record_task_activity();

create or replace function private.record_appointment_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appointment_stage_id uuid;
  v_current_position integer;
  v_appointment_position integer;
begin
  if new.opportunity_id is null then
    return new;
  end if;

  insert into public.activities (
    organization_id,
    company_id,
    contact_id,
    opportunity_id,
    user_id,
    activity_type,
    title,
    description,
    metadata
  )
  values (
    new.organization_id,
    new.company_id,
    new.contact_id,
    new.opportunity_id,
    (select auth.uid()),
    'appointment_created',
    'Rendez-vous planifié',
    new.title,
    jsonb_build_object(
      'appointment_id', new.id,
      'starts_at', new.starts_at,
      'ends_at', new.ends_at,
      'location', new.location
    )
  );

  select s.id, s.position
  into v_appointment_stage_id, v_appointment_position
  from public.opportunity_stages s
  where s.organization_id = new.organization_id
    and s.key = 'appointment'
    and s.is_active;

  select s.position
  into v_current_position
  from public.opportunities o
  join public.opportunity_stages s
    on s.organization_id = o.organization_id and s.id = o.stage_id
  where o.organization_id = new.organization_id
    and o.id = new.opportunity_id;

  update public.opportunities
  set
    stage_id = case
      when v_appointment_stage_id is not null
        and v_current_position < v_appointment_position
      then v_appointment_stage_id
      else stage_id
    end,
    next_action = 'Préparer le rendez-vous',
    next_action_at = new.starts_at,
    last_activity_at = now()
  where organization_id = new.organization_id
    and id = new.opportunity_id;

  return new;
end;
$$;

create trigger appointments_activity
after insert on public.appointments
for each row execute function private.record_appointment_activity();

create or replace function private.record_proposal_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stage_key text;
  v_stage_id uuid;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  insert into public.activities (
    organization_id,
    opportunity_id,
    user_id,
    activity_type,
    title,
    description,
    metadata
  )
  values (
    new.organization_id,
    new.opportunity_id,
    (select auth.uid()),
    case when tg_op = 'INSERT' then 'proposal_created' else 'proposal_status_changed' end,
    case
      when tg_op = 'INSERT' then 'Proposition créée'
      else 'Proposition ' || new.status
    end,
    'Version ' || new.version || ' · ' || new.amount || ' ' || new.currency,
    jsonb_build_object('proposal_id', new.id, 'status', new.status, 'version', new.version)
  );

  if tg_op = 'INSERT' then
    update public.opportunities
    set
      proposed_amount = new.amount,
      last_activity_at = now()
    where organization_id = new.organization_id
      and id = new.opportunity_id;
    return new;
  end if;

  v_stage_key := case new.status
    when 'sent' then 'proposal_sent'
    when 'accepted' then 'won'
    when 'rejected' then 'negotiation'
    else null
  end;

  if v_stage_key is not null then
    select id into v_stage_id
    from public.opportunity_stages
    where organization_id = new.organization_id
      and key = v_stage_key
      and is_active;
  end if;

  update public.opportunities
  set
    stage_id = coalesce(v_stage_id, stage_id),
    proposed_amount = new.amount,
    signed_amount = case when new.status = 'accepted' then new.amount else signed_amount end,
    next_action = case
      when new.status = 'sent' then 'Relancer la proposition'
      when new.status = 'accepted' then 'Préparer la confirmation'
      when new.status = 'rejected' then 'Traiter les objections'
      else next_action
    end,
    last_activity_at = now()
  where organization_id = new.organization_id
    and id = new.opportunity_id;

  return new;
end;
$$;

create trigger proposals_activity
after insert or update of status on public.proposals
for each row execute function private.record_proposal_activity();

create or replace function public.create_opportunity_from_thread(
  p_thread_id uuid,
  p_title text,
  p_event_type text default null,
  p_estimated_guests integer default null,
  p_desired_event_date date default null,
  p_next_action text default 'Qualifier le besoin',
  p_next_action_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_thread record;
  v_owner_id uuid;
  v_stage_id uuid;
  v_opportunity_id uuid;
  v_task_id uuid;
begin
  select
    mt.*,
    c.assigned_to
  into v_thread
  from public.mail_threads mt
  join public.companies c
    on c.organization_id = mt.organization_id
   and c.id = mt.company_id
  where mt.id = p_thread_id
  for update of mt;

  if v_thread.id is null then
    raise exception 'Conversation ou entreprise introuvable.';
  end if;

  if not private.can_manage_conversation(
    v_thread.organization_id,
    v_thread.mailbox_id,
    v_thread.company_id,
    v_thread.contact_id,
    v_thread.campaign_id
  ) then
    raise exception 'Action non autorisée.' using errcode = '42501';
  end if;

  if not private.has_org_role(
    v_thread.organization_id,
    array['admin', 'sales_manager', 'sales']::public.app_role[]
  ) then
    raise exception 'Rôle commercial requis.' using errcode = '42501';
  end if;

  if coalesce(v_thread.classification, 'unknown') not in (
    'interested',
    'asks_information',
    'asks_price',
    'asks_callback'
  ) then
    raise exception 'La réponse doit être qualifiée comme signal commercial.';
  end if;

  if v_thread.opportunity_id is not null then
    return jsonb_build_object(
      'opportunityId', v_thread.opportunity_id,
      'created', false,
      'duplicate', true
    );
  end if;

  select coalesce(
    (
      select m.user_id
      from public.memberships m
      where m.organization_id = v_thread.organization_id
        and m.user_id = v_thread.assigned_to
        and m.is_active
      limit 1
    ),
    (select auth.uid())
  )
  into v_owner_id;

  select id
  into v_stage_id
  from public.opportunity_stages
  where organization_id = v_thread.organization_id
    and key = 'engaged'
    and is_active;

  if v_stage_id is null then
    raise exception 'L’étape Engagé est indisponible.';
  end if;

  insert into public.opportunities (
    organization_id,
    company_id,
    primary_contact_id,
    campaign_id,
    owner_id,
    stage_id,
    title,
    probability,
    estimated_guests,
    event_type,
    desired_event_date,
    source,
    next_action,
    next_action_at
  )
  values (
    v_thread.organization_id,
    v_thread.company_id,
    v_thread.contact_id,
    v_thread.campaign_id,
    v_owner_id,
    v_stage_id,
    btrim(p_title),
    45,
    p_estimated_guests,
    nullif(btrim(p_event_type), ''),
    p_desired_event_date,
    'inbox',
    nullif(btrim(p_next_action), ''),
    p_next_action_at
  )
  returning id into v_opportunity_id;

  update public.mail_threads
  set
    opportunity_id = v_opportunity_id,
    priority = case when classification = 'asks_price' then 'high' else priority end
  where id = v_thread.id;

  update public.companies
  set
    status = 'opportunity',
    next_action_at = p_next_action_at
  where organization_id = v_thread.organization_id
    and id = v_thread.company_id;

  if nullif(btrim(p_next_action), '') is not null then
    insert into public.tasks (
      organization_id,
      company_id,
      contact_id,
      opportunity_id,
      assigned_to,
      created_by,
      title,
      priority,
      due_at
    )
    values (
      v_thread.organization_id,
      v_thread.company_id,
      v_thread.contact_id,
      v_opportunity_id,
      v_owner_id,
      (select auth.uid()),
      btrim(p_next_action),
      case when v_thread.classification = 'asks_price' then 'high' else 'normal' end,
      p_next_action_at
    )
    returning id into v_task_id;
  end if;

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    after
  )
  values (
    v_thread.organization_id,
    (select auth.uid()),
    'mail_thread.opportunity_created',
    'mail_thread',
    v_thread.id,
    jsonb_build_object(
      'opportunity_id', v_opportunity_id,
      'task_id', v_task_id,
      'classification', v_thread.classification
    )
  );

  return jsonb_build_object(
    'opportunityId', v_opportunity_id,
    'taskId', v_task_id,
    'created', true,
    'duplicate', false
  );
end;
$$;

revoke all on function private.resolve_opportunity_stage()
  from public, anon, authenticated;
revoke all on function private.audit_phase7_mutation()
  from public, anon, authenticated;
revoke all on function private.record_opportunity_stage_activity()
  from public, anon, authenticated;
revoke all on function private.record_task_activity()
  from public, anon, authenticated;
revoke all on function private.record_appointment_activity()
  from public, anon, authenticated;
revoke all on function private.record_proposal_activity()
  from public, anon, authenticated;

revoke all on function public.create_opportunity_from_thread(
  uuid, text, text, integer, date, text, timestamptz
) from public, anon;
grant execute on function public.create_opportunity_from_thread(
  uuid, text, text, integer, date, text, timestamptz
) to authenticated, service_role;
