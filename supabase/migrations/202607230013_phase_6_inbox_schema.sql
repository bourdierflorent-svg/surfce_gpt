alter table public.mailboxes
  add column oauth_scopes text[] not null default '{}'::text[],
  add column provider_metadata jsonb not null default '{}'::jsonb,
  add column watch_resource_id text,
  add column last_error_code text,
  add column last_error_at timestamptz,
  add column sync_failure_count integer not null default 0
    check (sync_failure_count between 0 and 20);

create unique index mailboxes_watch_resource_unique
on public.mailboxes (provider, watch_resource_id)
where watch_resource_id is not null;

alter table public.mail_threads
  add column summary_data jsonb,
  add column summary_generated_at timestamptz,
  add column summary_prompt_version text,
  add column suggested_reply jsonb,
  add column suggested_reply_generated_at timestamptz;

alter table public.mail_threads
  add constraint mail_threads_classification_check
  check (
    classification is null
    or classification in (
      'interested',
      'asks_information',
      'asks_price',
      'asks_callback',
      'asks_later',
      'referral',
      'wrong_person',
      'not_interested',
      'unsubscribe',
      'out_of_office',
      'bounce',
      'neutral',
      'unknown'
    )
  );

alter table public.messages
  drop constraint if exists messages_status_check;

alter table public.messages
  add constraint messages_status_check
  check (
    status in (
      'draft',
      'pending_approval',
      'approved',
      'scheduled',
      'processing',
      'sent_mock',
      'sent',
      'received',
      'delivered',
      'bounced',
      'failed',
      'cancelled'
    )
  ),
  add column internet_message_id text,
  add column in_reply_to text,
  add column reply_to jsonb not null default '[]'::jsonb,
  add column has_attachments boolean not null default false,
  add column provider_metadata jsonb not null default '{}'::jsonb;

alter table public.messages
  add constraint messages_classification_check
  check (
    classification is null
    or classification in (
      'interested',
      'asks_information',
      'asks_price',
      'asks_callback',
      'asks_later',
      'referral',
      'wrong_person',
      'not_interested',
      'unsubscribe',
      'out_of_office',
      'bounce',
      'neutral',
      'unknown'
    )
  );

create index mail_threads_inbox_idx
on public.mail_threads (
  organization_id,
  is_unread desc,
  priority desc,
  last_message_at desc
);

create index mail_threads_classification_idx
on public.mail_threads (organization_id, classification, last_message_at desc);

create index messages_inbound_thread_idx
on public.messages (organization_id, thread_id, received_at desc)
where direction = 'inbound';

create index messages_internet_message_idx
on public.messages (organization_id, internet_message_id)
where internet_message_id is not null;

create table public.message_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  message_id uuid not null,
  event_type text not null
    check (
      event_type in (
        'received',
        'sent',
        'delivered',
        'bounced',
        'classified',
        'classification_corrected',
        'campaign_stopped',
        'provider_synced'
      )
    ),
  provider_event_id text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint message_events_message_fkey
    foreign key (organization_id, message_id)
    references public.messages (organization_id, id)
    on delete cascade
);

create unique index message_events_provider_unique
on public.message_events (organization_id, provider_event_id)
where provider_event_id is not null;

create index message_events_message_idx
on public.message_events (organization_id, message_id, occurred_at desc);

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  message_id uuid not null,
  provider_attachment_id text not null,
  file_name text not null,
  content_type text not null,
  size_bytes bigint not null default 0 check (size_bytes between 0 and 26214400),
  is_inline boolean not null default false,
  content_id text,
  storage_path text,
  created_at timestamptz not null default now(),
  constraint message_attachments_message_fkey
    foreign key (organization_id, message_id)
    references public.messages (organization_id, id)
    on delete cascade,
  constraint message_attachments_provider_unique
    unique (message_id, provider_attachment_id)
);

create index message_attachments_message_idx
on public.message_attachments (organization_id, message_id);

alter table public.message_events enable row level security;
alter table public.message_attachments enable row level security;

comment on table public.message_events is
'Provider and human events attached to synchronized messages without storing secrets.';

comment on table public.message_attachments is
'Attachment metadata only. Content remains provider-side until a controlled download is requested.';
