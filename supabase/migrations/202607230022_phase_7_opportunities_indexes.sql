create index opportunity_stages_active_position_idx
  on public.opportunity_stages (organization_id, is_active, position);

create index opportunities_company_fk_idx
  on public.opportunities (organization_id, company_id);
create index opportunities_contact_fk_idx
  on public.opportunities (organization_id, primary_contact_id);
create index opportunities_venue_fk_idx
  on public.opportunities (organization_id, venue_id);
create index opportunities_offer_fk_idx
  on public.opportunities (organization_id, venue_id, offer_id);
create index opportunities_campaign_fk_idx
  on public.opportunities (organization_id, campaign_id);
create index opportunities_stage_fk_idx
  on public.opportunities (organization_id, stage_id);
create index opportunities_owner_fk_idx
  on public.opportunities (owner_id);
create index opportunities_pipeline_idx
  on public.opportunities (organization_id, stage_id, expected_close_date, next_action_at);
create index opportunities_inactivity_idx
  on public.opportunities (organization_id, last_activity_at)
  where won_at is null and lost_at is null;

create index mail_threads_opportunity_fk_idx
  on public.mail_threads (organization_id, opportunity_id);

create index activities_company_fk_idx
  on public.activities (organization_id, company_id);
create index activities_contact_fk_idx
  on public.activities (organization_id, contact_id);
create index activities_opportunity_timeline_idx
  on public.activities (organization_id, opportunity_id, occurred_at desc);
create index activities_user_fk_idx
  on public.activities (user_id);

create index tasks_company_fk_idx
  on public.tasks (organization_id, company_id);
create index tasks_contact_fk_idx
  on public.tasks (organization_id, contact_id);
create index tasks_opportunity_fk_idx
  on public.tasks (organization_id, opportunity_id);
create index tasks_assigned_due_idx
  on public.tasks (organization_id, assigned_to, status, due_at);
create index tasks_assigned_to_fk_idx
  on public.tasks (assigned_to);
create index tasks_created_by_fk_idx
  on public.tasks (created_by);

create index appointments_company_fk_idx
  on public.appointments (organization_id, company_id);
create index appointments_contact_fk_idx
  on public.appointments (organization_id, contact_id);
create index appointments_opportunity_fk_idx
  on public.appointments (organization_id, opportunity_id);
create index appointments_owner_start_idx
  on public.appointments (organization_id, owner_id, starts_at);
create index appointments_owner_fk_idx
  on public.appointments (owner_id);

create index proposals_opportunity_fk_idx
  on public.proposals (organization_id, opportunity_id);
create index proposals_venue_fk_idx
  on public.proposals (organization_id, venue_id);
create index proposals_offer_fk_idx
  on public.proposals (organization_id, venue_id, offer_id);
create index proposals_created_by_fk_idx
  on public.proposals (created_by);
