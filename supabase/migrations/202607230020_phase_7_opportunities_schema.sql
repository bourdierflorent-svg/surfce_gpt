create table public.opportunity_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null check (key ~ '^[a-z][a-z0-9_]{1,39}$'),
  label text not null check (char_length(btrim(label)) between 2 and 80),
  position integer not null check (position between 0 and 1000),
  default_probability integer not null check (default_probability between 0 and 100),
  category text not null default 'open' check (category in ('open', 'won', 'lost')),
  color text not null default 'slate',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunity_stages_organization_id_id_unique unique (organization_id, id),
  constraint opportunity_stages_organization_key_unique unique (organization_id, key),
  constraint opportunity_stages_organization_position_unique unique (organization_id, position)
);

create or replace function private.insert_default_opportunity_stages(p_organization_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.opportunity_stages (
    organization_id,
    key,
    label,
    position,
    default_probability,
    category,
    color
  )
  values
    (p_organization_id, 'target_detected', 'Cible détectée', 10, 5, 'open', 'slate'),
    (p_organization_id, 'company_enriched', 'Entreprise enrichie', 20, 10, 'open', 'sky'),
    (p_organization_id, 'prospect_qualified', 'Prospect qualifié', 30, 20, 'open', 'blue'),
    (p_organization_id, 'contacted', 'Contacté', 40, 30, 'open', 'indigo'),
    (p_organization_id, 'engaged', 'Engagé', 50, 45, 'open', 'violet'),
    (p_organization_id, 'appointment', 'Rendez-vous', 60, 60, 'open', 'amber'),
    (p_organization_id, 'proposal_sent', 'Proposition envoyée', 70, 70, 'open', 'orange'),
    (p_organization_id, 'negotiation', 'Négociation', 80, 85, 'open', 'rose'),
    (p_organization_id, 'event_confirmed', 'Événement confirmé', 90, 95, 'won', 'emerald'),
    (p_organization_id, 'won', 'Gagné', 100, 100, 'won', 'green'),
    (p_organization_id, 'lost', 'Perdu', 110, 0, 'lost', 'stone')
  on conflict (organization_id, key) do nothing;
$$;

select private.insert_default_opportunity_stages(id)
from public.organizations;

create or replace function private.seed_opportunity_stages_on_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.insert_default_opportunity_stages(new.id);
  return new;
end;
$$;

create trigger organizations_seed_opportunity_stages
after insert on public.organizations
for each row execute function private.seed_opportunity_stages_on_organization();

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null,
  primary_contact_id uuid,
  venue_id uuid,
  offer_id uuid,
  campaign_id uuid,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  stage_id uuid not null,
  title text not null check (char_length(btrim(title)) between 3 and 200),
  probability integer not null check (probability between 0 and 100),
  estimated_amount numeric(14, 2) check (estimated_amount is null or estimated_amount >= 0),
  proposed_amount numeric(14, 2) check (proposed_amount is null or proposed_amount >= 0),
  signed_amount numeric(14, 2) check (signed_amount is null or signed_amount >= 0),
  currency text not null default 'EUR'
    check (currency = upper(currency) and char_length(currency) = 3),
  estimated_guests integer check (estimated_guests is null or estimated_guests > 0),
  event_type text,
  desired_event_date date,
  expected_close_date date,
  source text not null default 'manual',
  objections jsonb not null default '[]'::jsonb check (jsonb_typeof(objections) = 'array'),
  next_action text,
  next_action_at timestamptz,
  loss_reason text,
  notes text,
  last_activity_at timestamptz not null default now(),
  won_at timestamptz,
  lost_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunities_organization_id_id_unique unique (organization_id, id),
  constraint opportunities_company_fkey
    foreign key (organization_id, company_id)
    references public.companies (organization_id, id)
    on delete restrict,
  constraint opportunities_contact_fkey
    foreign key (organization_id, primary_contact_id)
    references public.contacts (organization_id, id)
    on delete set null,
  constraint opportunities_venue_fkey
    foreign key (organization_id, venue_id)
    references public.venues (organization_id, id)
    on delete set null,
  constraint opportunities_offer_fkey
    foreign key (organization_id, venue_id, offer_id)
    references public.venue_offers (organization_id, venue_id, id)
    on delete set null,
  constraint opportunities_campaign_fkey
    foreign key (organization_id, campaign_id)
    references public.campaigns (organization_id, id)
    on delete set null,
  constraint opportunities_stage_fkey
    foreign key (organization_id, stage_id)
    references public.opportunity_stages (organization_id, id)
    on delete restrict,
  constraint opportunities_offer_requires_venue check (offer_id is null or venue_id is not null),
  constraint opportunities_resolution_consistency check (won_at is null or lost_at is null)
);

alter table public.mail_threads
  add column opportunity_id uuid;

alter table public.mail_threads
  add constraint mail_threads_opportunity_fkey
  foreign key (organization_id, opportunity_id)
  references public.opportunities (organization_id, id)
  on delete set null;

create unique index mail_threads_opportunity_source_unique
on public.mail_threads (organization_id, opportunity_id)
where opportunity_id is not null;

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid,
  contact_id uuid,
  opportunity_id uuid,
  user_id uuid references public.profiles(id) on delete set null,
  activity_type text not null check (
    activity_type in (
      'opportunity_created',
      'stage_changed',
      'note',
      'task_created',
      'task_completed',
      'appointment_created',
      'proposal_created',
      'proposal_status_changed'
    )
  ),
  title text not null check (char_length(btrim(title)) between 2 and 200),
  description text,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint activities_company_fkey
    foreign key (organization_id, company_id)
    references public.companies (organization_id, id)
    on delete cascade,
  constraint activities_contact_fkey
    foreign key (organization_id, contact_id)
    references public.contacts (organization_id, id)
    on delete set null,
  constraint activities_opportunity_fkey
    foreign key (organization_id, opportunity_id)
    references public.opportunities (organization_id, id)
    on delete cascade
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid,
  contact_id uuid,
  opportunity_id uuid,
  assigned_to uuid not null references public.profiles(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 2 and 200),
  description text,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'completed', 'cancelled')),
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_organization_id_id_unique unique (organization_id, id),
  constraint tasks_company_fkey
    foreign key (organization_id, company_id)
    references public.companies (organization_id, id)
    on delete cascade,
  constraint tasks_contact_fkey
    foreign key (organization_id, contact_id)
    references public.contacts (organization_id, id)
    on delete set null,
  constraint tasks_opportunity_fkey
    foreign key (organization_id, opportunity_id)
    references public.opportunities (organization_id, id)
    on delete cascade,
  constraint tasks_completion_consistency check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  )
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid,
  contact_id uuid,
  opportunity_id uuid,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 2 and 200),
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  external_calendar_id text,
  status text not null default 'planned'
    check (status in ('planned', 'completed', 'cancelled', 'no_show')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_organization_id_id_unique unique (organization_id, id),
  constraint appointments_company_fkey
    foreign key (organization_id, company_id)
    references public.companies (organization_id, id)
    on delete cascade,
  constraint appointments_contact_fkey
    foreign key (organization_id, contact_id)
    references public.contacts (organization_id, id)
    on delete set null,
  constraint appointments_opportunity_fkey
    foreign key (organization_id, opportunity_id)
    references public.opportunities (organization_id, id)
    on delete cascade,
  constraint appointments_duration_check check (ends_at > starts_at)
);

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  opportunity_id uuid not null,
  venue_id uuid,
  offer_id uuid,
  version integer not null check (version between 1 and 1000),
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null default 'EUR'
    check (currency = upper(currency) and char_length(currency) = 3),
  guest_count integer check (guest_count is null or guest_count > 0),
  event_date date,
  content jsonb not null default '{}'::jsonb,
  storage_path text,
  sent_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proposals_organization_id_id_unique unique (organization_id, id),
  constraint proposals_opportunity_fkey
    foreign key (organization_id, opportunity_id)
    references public.opportunities (organization_id, id)
    on delete cascade,
  constraint proposals_venue_fkey
    foreign key (organization_id, venue_id)
    references public.venues (organization_id, id)
    on delete set null,
  constraint proposals_offer_fkey
    foreign key (organization_id, venue_id, offer_id)
    references public.venue_offers (organization_id, venue_id, id)
    on delete set null,
  constraint proposals_opportunity_version_unique unique (opportunity_id, version),
  constraint proposals_offer_requires_venue check (offer_id is null or venue_id is not null),
  constraint proposals_status_dates check (
    (status <> 'sent' or sent_at is not null)
    and (status <> 'accepted' or accepted_at is not null)
    and (status <> 'rejected' or rejected_at is not null)
  )
);

create trigger opportunity_stages_set_updated_at
before update on public.opportunity_stages
for each row execute function private.set_updated_at();

create trigger opportunities_set_updated_at
before update on public.opportunities
for each row execute function private.set_updated_at();

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function private.set_updated_at();

create trigger appointments_set_updated_at
before update on public.appointments
for each row execute function private.set_updated_at();

create trigger proposals_set_updated_at
before update on public.proposals
for each row execute function private.set_updated_at();

revoke all on function private.insert_default_opportunity_stages(uuid)
  from public, anon, authenticated;
revoke all on function private.seed_opportunity_stages_on_organization()
  from public, anon, authenticated;
