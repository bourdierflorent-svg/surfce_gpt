insert into public.organizations (id, name, slug, timezone, settings)
values (
  '10000000-0000-0000-0000-000000000001',
  'SURFCE',
  'surfce',
  'Europe/Paris',
  '{"demo": false}'::jsonb
)
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  timezone = excluded.timezone,
  settings = excluded.settings;

do $$
declare
  demo_user_id uuid;
begin
  select id
  into demo_user_id
  from auth.users
  where email = 'admin@surfce.local'
  limit 1;

  if demo_user_id is not null then
    insert into public.memberships (organization_id, user_id, role, is_active)
    values (
      '10000000-0000-0000-0000-000000000001',
      demo_user_id,
      'admin',
      true
    )
    on conflict (organization_id, user_id) do update
    set role = excluded.role, is_active = excluded.is_active;
  end if;
end;
$$;

-- Phase 6 — réponses entrantes fictives, classification et arrêt de séquence.
create or replace function pg_temp.seed_phase6_demo()
returns void
language plpgsql
as $phase6$
begin
insert into public.mail_threads (
  id,
  organization_id,
  mailbox_id,
  provider_thread_id,
  company_id,
  contact_id,
  campaign_id,
  subject,
  classification,
  priority,
  summary,
  summary_data,
  summary_generated_at,
  summary_prompt_version,
  last_message_at,
  last_inbound_at,
  is_unread
)
values
  (
    '75000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '71000000-0000-0000-0000-000000000001',
    'mock_thread_seed_lina',
    '50000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000001',
    '72000000-0000-0000-0000-000000000001',
    'Afterwork 20 à 50 personnes pour votre équipe',
    'interested',
    'high',
    'Lina souhaite recevoir une proposition pour un afterwork de 35 personnes en septembre.',
    '{"summary":"Lina souhaite recevoir une proposition pour un afterwork de 35 personnes en septembre.","intention":"interested","need":"Afterwork d’équipe","date":"Septembre, date à confirmer","participantCount":35,"budget":null,"venue":"Little Room évoqué","objections":[],"stakeholders":["Lina Martin"],"commitments":["SURFCE envoie les disponibilités"],"nextActions":["Proposer deux créneaux et une première estimation"],"confidence":0.82}'::jsonb,
    now() - interval '20 hours',
    'thread-summary.v1',
    now() - interval '20 hours',
    now() - interval '20 hours',
    true
  ),
  (
    '75000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    '71000000-0000-0000-0000-000000000001',
    'mock_thread_seed_alix',
    '50000000-0000-0000-0000-000000000002',
    '70000000-0000-0000-0000-000000000009',
    null,
    'Demande de devis pour un dîner d’équipe',
    'asks_price',
    'high',
    null,
    null,
    null,
    null,
    now() - interval '5 hours',
    now() - interval '5 hours',
    true
  ),
  (
    '75000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    '71000000-0000-0000-0000-000000000001',
    'mock_thread_seed_nina',
    '50000000-0000-0000-0000-000000000002',
    '70000000-0000-0000-0000-000000000010',
    null,
    'Re: proposition séminaire',
    'not_interested',
    'normal',
    null,
    null,
    null,
    null,
    now() - interval '2 days',
    now() - interval '2 days',
    false
  )
on conflict (mailbox_id, provider_thread_id) do update
set
  company_id = excluded.company_id,
  contact_id = excluded.contact_id,
  campaign_id = excluded.campaign_id,
  subject = excluded.subject,
  classification = excluded.classification,
  priority = excluded.priority,
  summary = excluded.summary,
  summary_data = excluded.summary_data,
  summary_generated_at = excluded.summary_generated_at,
  summary_prompt_version = excluded.summary_prompt_version,
  last_message_at = excluded.last_message_at,
  last_inbound_at = excluded.last_inbound_at,
  is_unread = excluded.is_unread;

insert into public.messages (
  id,
  organization_id,
  thread_id,
  campaign_id,
  provider_message_id,
  internet_message_id,
  in_reply_to,
  deduplication_key,
  direction,
  sender,
  recipients,
  reply_to,
  subject,
  body_text,
  body_html,
  received_at,
  status,
  classification,
  has_attachments,
  headers,
  provider_metadata
)
values
  (
    '76000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    '75000000-0000-0000-0000-000000000001',
    '72000000-0000-0000-0000-000000000001',
    'mock_reply_seed_lina',
    '<mock-reply-lina@studio-huit.example>',
    '<mock_message_seed_lina_first@surfce.example>',
    'provider:71000000-0000-0000-0000-000000000001:mock_reply_seed_lina',
    'inbound',
    '{"email":"lina.martin@studio-huit.example","name":"Lina Martin"}'::jsonb,
    '[{"email":"florent@stargazing.example","name":"Florent — Stargazing"}]'::jsonb,
    '[]'::jsonb,
    'Re: Afterwork 20 à 50 personnes pour votre équipe',
    E'Bonjour Florent,\n\nOui, l’idée nous intéresse pour environ 35 personnes en septembre. Pouvez-vous me proposer deux dates et une première estimation ?\n\nMerci,\nLina',
    '<p>Bonjour Florent,</p><p>Oui, l’idée nous intéresse pour environ 35 personnes en septembre. Pouvez-vous me proposer deux dates et une première estimation&nbsp;?</p><p>Merci,<br>Lina</p>',
    now() - interval '20 hours',
    'received',
    'interested',
    false,
    '{"message-id":"<mock-reply-lina@studio-huit.example>","in-reply-to":"<mock_message_seed_lina_first@surfce.example>"}'::jsonb,
    '{"provider":"mock","seed":true}'::jsonb
  ),
  (
    '76000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    '75000000-0000-0000-0000-000000000002',
    null,
    'mock_reply_seed_alix',
    '<mock-reply-alix@rive-conseil.example>',
    null,
    'provider:71000000-0000-0000-0000-000000000001:mock_reply_seed_alix',
    'inbound',
    '{"email":"alix.girard@rive-conseil.example","name":"Alix Girard"}'::jsonb,
    '[{"email":"florent@stargazing.example","name":"Florent — Stargazing"}]'::jsonb,
    '[]'::jsonb,
    'Demande de devis pour un dîner d’équipe',
    E'Bonjour,\n\nQuel serait le tarif pour un dîner de 60 personnes, avec privatisation et option végétarienne ? Vous trouverez notre brief en pièce jointe.\n\nBien à vous,\nAlix',
    '<p>Bonjour,</p><p>Quel serait le tarif pour un dîner de 60 personnes, avec privatisation et option végétarienne&nbsp;?</p><p>Bien à vous,<br>Alix</p>',
    now() - interval '5 hours',
    'received',
    'asks_price',
    true,
    '{"message-id":"<mock-reply-alix@rive-conseil.example>"}'::jsonb,
    '{"provider":"mock","seed":true}'::jsonb
  ),
  (
    '76000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000001',
    '75000000-0000-0000-0000-000000000003',
    null,
    'mock_reply_seed_nina',
    '<mock-reply-nina@rive-conseil.example>',
    null,
    'provider:71000000-0000-0000-0000-000000000001:mock_reply_seed_nina',
    'inbound',
    '{"email":"nina.bonnet@rive-conseil.example","name":"Nina Bonnet"}'::jsonb,
    '[{"email":"florent@stargazing.example","name":"Florent — Stargazing"}]'::jsonb,
    '[]'::jsonb,
    'Re: proposition séminaire',
    E'Bonjour,\n\nMerci pour votre message. Nous ne sommes pas intéressés cette année.\n\nCordialement,\nNina',
    '<p>Bonjour,</p><p>Merci pour votre message. Nous ne sommes pas intéressés cette année.</p><p>Cordialement,<br>Nina</p>',
    now() - interval '2 days',
    'received',
    'not_interested',
    false,
    '{"message-id":"<mock-reply-nina@rive-conseil.example>"}'::jsonb,
    '{"provider":"mock","seed":true}'::jsonb
  )
on conflict (organization_id, deduplication_key) do update
set
  thread_id = excluded.thread_id,
  campaign_id = excluded.campaign_id,
  provider_message_id = excluded.provider_message_id,
  internet_message_id = excluded.internet_message_id,
  in_reply_to = excluded.in_reply_to,
  sender = excluded.sender,
  recipients = excluded.recipients,
  reply_to = excluded.reply_to,
  subject = excluded.subject,
  body_text = excluded.body_text,
  body_html = excluded.body_html,
  received_at = excluded.received_at,
  status = excluded.status,
  classification = excluded.classification,
  has_attachments = excluded.has_attachments,
  headers = excluded.headers,
  provider_metadata = excluded.provider_metadata;

insert into public.message_events (
  id,
  organization_id,
  message_id,
  event_type,
  provider_event_id,
  metadata,
  occurred_at
)
values
  (
    '7a000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '76000000-0000-0000-0000-000000000003',
    'received',
    'mock:mock_reply_seed_lina:received',
    '{"provider":"mock","seed":true}'::jsonb,
    now() - interval '20 hours'
  ),
  (
    '7a000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    '76000000-0000-0000-0000-000000000003',
    'campaign_stopped',
    'mock:mock_reply_seed_lina:campaign_stopped',
    '{"campaign_id":"72000000-0000-0000-0000-000000000001","enrollment_id":"74000000-0000-0000-0000-000000000001","classification":"interested"}'::jsonb,
    now() - interval '20 hours'
  ),
  (
    '7a000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    '76000000-0000-0000-0000-000000000004',
    'received',
    'mock:mock_reply_seed_alix:received',
    '{"provider":"mock","seed":true}'::jsonb,
    now() - interval '5 hours'
  ),
  (
    '7a000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    '76000000-0000-0000-0000-000000000005',
    'received',
    'mock:mock_reply_seed_nina:received',
    '{"provider":"mock","seed":true}'::jsonb,
    now() - interval '2 days'
  )
on conflict (organization_id, provider_event_id)
where provider_event_id is not null
do update
set
  event_type = excluded.event_type,
  metadata = excluded.metadata,
  occurred_at = excluded.occurred_at;

insert into public.message_attachments (
  id,
  organization_id,
  message_id,
  provider_attachment_id,
  file_name,
  content_type,
  size_bytes,
  is_inline
)
values (
  '7b000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '76000000-0000-0000-0000-000000000004',
  'mock_attachment_brief_alix',
  'brief-evenement-fictif.pdf',
  'application/pdf',
  182400,
  false
)
on conflict (message_id, provider_attachment_id) do update
set
  file_name = excluded.file_name,
  content_type = excluded.content_type,
  size_bytes = excluded.size_bytes,
  is_inline = excluded.is_inline;

update public.campaign_enrollments
set
  status = 'interested',
  stopped_at = now() - interval '20 hours',
  stop_reason = 'inbound_reply:interested',
  next_send_at = null
where id = '74000000-0000-0000-0000-000000000001';

update public.messages
set
  status = 'cancelled',
  error_code = 'reply_received',
  error_message = 'Séquence arrêtée après une réponse entrante.'
where id = '76000000-0000-0000-0000-000000000002';

update public.contacts
set last_replied_at = case
  when id = '70000000-0000-0000-0000-000000000001' then now() - interval '20 hours'
  when id = '70000000-0000-0000-0000-000000000009' then now() - interval '5 hours'
  when id = '70000000-0000-0000-0000-000000000010' then now() - interval '2 days'
  else last_replied_at
end
where id in (
  '70000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000009',
  '70000000-0000-0000-0000-000000000010'
);
end;
$phase6$;

insert into public.venues (
  id,
  organization_id,
  name,
  slug,
  venue_type,
  description,
  city,
  country_code,
  standing,
  atmosphere,
  minimum_guests,
  currency,
  features,
  event_types,
  target_sectors,
  opening_rules,
  is_active
)
values
  (
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Little Room',
    'little-room',
    'Club privé',
    'Fiche de démonstration à compléter avec les informations commerciales validées.',
    'Paris',
    'FR',
    'Premium',
    'Intimiste et nocturne',
    20,
    'EUR',
    '{"bar":true,"cocktails":true,"dj":true,"data_status":"demo_to_verify"}'::jsonb,
    array['Afterwork', 'Soirée clients'],
    array['Conseil', 'Communication'],
    '{"note":"Disponibilités à confirmer"}'::jsonb,
    true
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'Deflower',
    'deflower',
    'Club',
    'Fiche de démonstration à compléter avec les informations commerciales validées.',
    'Paris',
    'FR',
    'Premium',
    'Énergique et scénique',
    30,
    'EUR',
    '{"bar":true,"dj":true,"stage":true,"sound":true,"data_status":"demo_to_verify"}'::jsonb,
    array['Showcase', 'Lancement de produit'],
    array['Musique', 'Mode'],
    '{"note":"Disponibilités à confirmer"}'::jsonb,
    true
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    'Fresh Touch',
    'fresh-touch',
    'Lieu événementiel',
    'Fiche de démonstration à compléter avec les informations commerciales validées.',
    'Paris',
    'FR',
    'Contemporain',
    'Lumineux et modulable',
    40,
    'EUR',
    '{"catering":true,"screens":true,"lighting":true,"data_status":"demo_to_verify"}'::jsonb,
    array['Cocktail', 'Événement presse'],
    array['Tech', 'Médias'],
    '{"note":"Disponibilités à confirmer"}'::jsonb,
    true
  ),
  (
    '30000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    'Giulia',
    'giulia',
    'Restaurant festif',
    'Fiche de démonstration à compléter avec les informations commerciales validées.',
    'Paris',
    'FR',
    'Premium',
    'Dîner et soirée',
    20,
    'EUR',
    '{"catering":true,"bar":true,"cocktails":true,"dj":true,"data_status":"demo_to_verify"}'::jsonb,
    array['Dîner entreprise', 'Soirée clients'],
    array['Finance', 'Luxe'],
    '{"note":"Disponibilités à confirmer"}'::jsonb,
    true
  )
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  venue_type = excluded.venue_type,
  description = excluded.description,
  city = excluded.city,
  country_code = excluded.country_code,
  standing = excluded.standing,
  atmosphere = excluded.atmosphere,
  minimum_guests = excluded.minimum_guests,
  currency = excluded.currency,
  features = excluded.features,
  event_types = excluded.event_types,
  target_sectors = excluded.target_sectors,
  opening_rules = excluded.opening_rules,
  is_active = excluded.is_active;

insert into public.venue_offers (
  id,
  organization_id,
  venue_id,
  name,
  slug,
  event_type,
  short_description,
  description,
  min_guests,
  max_guests,
  currency,
  duration_minutes,
  available_days,
  inclusions,
  options,
  terms,
  is_active
)
values
  (
    '40000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'Afterwork 20 à 50 personnes',
    'afterwork-20-50',
    'Afterwork',
    'Un format compact pour réunir une équipe ou des clients.',
    'Offre de démonstration. Capacités, inclusions et conditions restent à valider.',
    20,
    50,
    'EUR',
    180,
    array[2, 3, 4],
    '["Espace réservé","Accueil dédié"]'::jsonb,
    '["Cocktail dînatoire","DJ"]'::jsonb,
    'Conditions commerciales à confirmer.',
    true
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002',
    'Showcase privé',
    'showcase-prive',
    'Showcase',
    'Une scène privée pour une prise de parole ou une performance.',
    'Offre de démonstration. Capacités, inclusions et conditions restent à valider.',
    30,
    80,
    'EUR',
    240,
    array[2, 3, 4],
    '["Scène","Sonorisation"]'::jsonb,
    '["Accueil presse","Captation"]'::jsonb,
    'Conditions commerciales à confirmer.',
    true
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000003',
    'Cocktail dînatoire',
    'cocktail-dinatoire',
    'Cocktail',
    'Un format modulable pour faire circuler les invités.',
    'Offre de démonstration. Capacités, inclusions et conditions restent à valider.',
    40,
    120,
    'EUR',
    240,
    array[1, 2, 3, 4],
    '["Espace événementiel","Mobilier"]'::jsonb,
    '["Restauration","Scénographie"]'::jsonb,
    'Conditions commerciales à confirmer.',
    true
  ),
  (
    '40000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000004',
    'Dîner suivi d’une soirée',
    'diner-puis-soiree',
    'Dîner entreprise',
    'Un parcours continu entre table, prise de parole et soirée.',
    'Offre de démonstration. Capacités, inclusions et conditions restent à valider.',
    20,
    60,
    'EUR',
    300,
    array[2, 3, 4, 5],
    '["Dîner","Espace soirée"]'::jsonb,
    '["Cocktails","DJ"]'::jsonb,
    'Conditions commerciales à confirmer.',
    true
  )
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  event_type = excluded.event_type,
  short_description = excluded.short_description,
  description = excluded.description,
  min_guests = excluded.min_guests,
  max_guests = excluded.max_guests,
  currency = excluded.currency,
  duration_minutes = excluded.duration_minutes,
  available_days = excluded.available_days,
  inclusions = excluded.inclusions,
  options = excluded.options,
  terms = excluded.terms,
  is_active = excluded.is_active;

-- Phase 3: two explicitly fictional imports keep the company register useful before the
-- first Explorer action. Reserved .example domains prevent confusion with real businesses.
insert into public.companies (
  id,
  organization_id,
  legal_name,
  trade_name,
  normalized_name,
  sector,
  subsector,
  description,
  website_url,
  domain,
  phone,
  generic_email,
  employee_range,
  address_line1,
  postal_code,
  city,
  country_code,
  location,
  district,
  qualification_score,
  data_quality_score,
  tags,
  last_verified_at
)
values
  (
    '50000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Studio Huit Communication SAS fictive',
    'Studio Huit Communication',
    'studio huit communication',
    'Communication',
    'Agence de communication',
    'Société de démonstration fictive créée pour le parcours Explorer SURFCE.',
    'https://studio-huit.example',
    'studio-huit.example',
    '+33 1 80 00 08 08',
    'bonjour@studio-huit.example',
    '11–50',
    '8 rue de la Démonstration',
    '75008',
    'Paris',
    'FR',
    extensions.st_setsrid(extensions.st_makepoint(2.3135, 48.8721), 4326)::extensions.geography,
    '8e arrondissement',
    72,
    78,
    array['mock', 'communication'],
    '2026-07-22T12:00:00+02:00'
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'Cabinet Rive Conseil SAS fictif',
    'Cabinet Rive Conseil',
    'cabinet rive conseil',
    'Conseil',
    'Cabinet de conseil',
    'Société de démonstration fictive créée pour le parcours Explorer SURFCE.',
    'https://rive-conseil.example',
    'rive-conseil.example',
    '+33 1 80 00 06 06',
    'contact@rive-conseil.example',
    '11–50',
    '6 quai de la Démonstration',
    '75006',
    'Paris',
    'FR',
    extensions.st_setsrid(extensions.st_makepoint(2.3342, 48.8546), 4326)::extensions.geography,
    '6e arrondissement',
    68,
    76,
    array['mock', 'conseil'],
    '2026-07-22T12:00:00+02:00'
  )
on conflict (id) do update
set
  legal_name = excluded.legal_name,
  trade_name = excluded.trade_name,
  normalized_name = excluded.normalized_name,
  sector = excluded.sector,
  subsector = excluded.subsector,
  description = excluded.description,
  website_url = excluded.website_url,
  domain = excluded.domain,
  phone = excluded.phone,
  generic_email = excluded.generic_email,
  employee_range = excluded.employee_range,
  address_line1 = excluded.address_line1,
  postal_code = excluded.postal_code,
  city = excluded.city,
  country_code = excluded.country_code,
  location = excluded.location,
  district = excluded.district,
  qualification_score = excluded.qualification_score,
  data_quality_score = excluded.data_quality_score,
  tags = excluded.tags,
  last_verified_at = excluded.last_verified_at,
  deleted_at = null;

insert into public.company_locations (
  id,
  organization_id,
  company_id,
  label,
  address_line1,
  postal_code,
  city,
  country_code,
  location,
  is_headquarters
)
values
  (
    '51000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    'Siège fictif',
    '8 rue de la Démonstration',
    '75008',
    'Paris',
    'FR',
    extensions.st_setsrid(extensions.st_makepoint(2.3135, 48.8721), 4326)::extensions.geography,
    true
  ),
  (
    '51000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000002',
    'Siège fictif',
    '6 quai de la Démonstration',
    '75006',
    'Paris',
    'FR',
    extensions.st_setsrid(extensions.st_makepoint(2.3342, 48.8546), 4326)::extensions.geography,
    true
  )
on conflict (id) do update
set
  label = excluded.label,
  address_line1 = excluded.address_line1,
  postal_code = excluded.postal_code,
  city = excluded.city,
  country_code = excluded.country_code,
  location = excluded.location,
  is_headquarters = excluded.is_headquarters;

insert into public.data_sources (
  id,
  organization_id,
  entity_type,
  entity_id,
  field_name,
  provider,
  external_reference,
  raw_value,
  normalized_value,
  collected_at,
  last_verified_at,
  confidence,
  is_inferred,
  metadata
)
values
  (
    '52000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'company',
    '50000000-0000-0000-0000-000000000001',
    'record',
    'mock_places',
    'mock-place-studio-huit',
    '{"trade_name":"Studio Huit Communication","fictional":true}'::jsonb,
    '{"trade_name":"Studio Huit Communication","fictional":true}'::jsonb,
    '2026-07-22T12:00:00+02:00',
    '2026-07-22T12:00:00+02:00',
    0.78,
    false,
    '{"mock":true}'::jsonb
  ),
  (
    '52000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'company',
    '50000000-0000-0000-0000-000000000002',
    'record',
    'mock_places',
    'mock-place-rive-conseil',
    '{"trade_name":"Cabinet Rive Conseil","fictional":true}'::jsonb,
    '{"trade_name":"Cabinet Rive Conseil","fictional":true}'::jsonb,
    '2026-07-22T12:00:00+02:00',
    '2026-07-22T12:00:00+02:00',
    0.76,
    false,
    '{"mock":true}'::jsonb
  )
on conflict (id) do update
set
  entity_id = excluded.entity_id,
  raw_value = excluded.raw_value,
  normalized_value = excluded.normalized_value,
  collected_at = excluded.collected_at,
  last_verified_at = excluded.last_verified_at,
  confidence = excluded.confidence,
  is_inferred = excluded.is_inferred,
  metadata = excluded.metadata;

-- Phase 4: deterministic, explicitly fictional intelligence data. Unknown registry and budget
-- values remain null; no remote website or AI provider was contacted to create this seed.
insert into public.data_sources (
  id,
  organization_id,
  entity_type,
  entity_id,
  field_name,
  provider,
  external_reference,
  source_url,
  raw_value,
  normalized_value,
  collected_at,
  last_verified_at,
  confidence,
  is_inferred,
  metadata
)
values
  (
    '52000000-0000-0000-0000-000000000011',
    '10000000-0000-0000-0000-000000000001',
    'company',
    '50000000-0000-0000-0000-000000000001',
    'registry_record',
    'mock_registry',
    'mock-registry:50000000-0000-0000-0000-000000000001',
    null,
    '{"legal_name":"Studio Huit Communication SAS fictive","siren":null,"primary_siret":null}'::jsonb,
    '{"legal_name":"Studio Huit Communication SAS fictive","siren":null,"primary_siret":null,"legal_form":null,"activity_code":null,"sector":"Communication","headquarters_city":"Paris"}'::jsonb,
    '2026-07-23T09:00:00+02:00',
    '2026-07-23T09:00:00+02:00',
    0.92,
    false,
    '{"mock":true,"unknown_values_are_null":true}'::jsonb
  ),
  (
    '52000000-0000-0000-0000-000000000012',
    '10000000-0000-0000-0000-000000000001',
    'company',
    '50000000-0000-0000-0000-000000000001',
    'website_analysis',
    'mock_website',
    'mock-website:50000000-0000-0000-0000-000000000001',
    'https://studio-huit.example',
    '{"pages":[{"kind":"home","url":"https://studio-huit.example","status":"mocked"}],"warnings":["Analyse simulée : aucun contenu distant téléchargé."]}'::jsonb,
    '{"summary":"Analyse simulée de la société fictive.","signals":[{"type":"service","label":"Conseil en communication","confidence":0.78,"sourceReference":"mock-website:50000000-0000-0000-0000-000000000001"}]}'::jsonb,
    '2026-07-23T09:02:00+02:00',
    '2026-07-23T09:02:00+02:00',
    0.70,
    true,
    '{"mock":true,"page_count":1}'::jsonb
  )
on conflict (id) do update
set
  raw_value = excluded.raw_value,
  normalized_value = excluded.normalized_value,
  collected_at = excluded.collected_at,
  last_verified_at = excluded.last_verified_at,
  confidence = excluded.confidence,
  is_inferred = excluded.is_inferred,
  metadata = excluded.metadata;

insert into public.personas (
  id,
  organization_id,
  company_id,
  version,
  status,
  summary,
  company_type,
  event_maturity,
  estimated_size,
  probable_needs,
  likely_contact_roles,
  recommended_event_types,
  estimated_guest_range,
  estimated_budget_range,
  fit_score,
  confidence,
  risks,
  evidence,
  input_snapshot,
  model_provider,
  model_name,
  prompt_version,
  created_at
)
values (
  '60000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  1,
  'draft',
  'Hypothèse commerciale : Studio Huit Communication peut être pertinent pour des formats événementiels liés à la communication. Les besoins restent à valider humainement.',
  'Agence de communication',
  'high',
  '{"label":"11–50","confidence":0.72}'::jsonb,
  '[{"type":"afterwork","confidence":0.82,"reason":"Une activité orientée équipes et clients rend ce format plausible."},{"type":"soirée clients","confidence":0.74,"reason":"Le secteur suggère des besoins de relation et d’activation de marque."},{"type":"lancement de produit","confidence":0.61,"reason":"Le format est cohérent avec une activité de communication, sans être confirmé."}]'::jsonb,
  array['Office Manager', 'Responsable Communication', 'Responsable Événementiel'],
  array['Afterwork', 'Soirée clients', 'Lancement de produit'],
  '{"min":10,"max":60,"confidence":0.54}'::jsonb,
  '{"min":null,"max":null,"currency":"EUR","confidence":0}'::jsonb,
  84,
  0.68,
  '["Budget inconnu"]'::jsonb,
  '[{"claim":"Le secteur déclaré soutient l’hypothèse de formats afterwork et soirée clients.","source_type":"mock_website","source_reference":"52000000-0000-0000-0000-000000000012","confidence":0.70}]'::jsonb,
  '{"mock":true,"company_id":"50000000-0000-0000-0000-000000000001","source_ids":["52000000-0000-0000-0000-000000000011","52000000-0000-0000-0000-000000000012"]}'::jsonb,
  'mock_ai',
  'surfce-deterministic-mock-v1',
  'persona.v1',
  '2026-07-23T09:04:00+02:00'
)
on conflict (id) do update
set
  summary = excluded.summary,
  probable_needs = excluded.probable_needs,
  recommended_event_types = excluded.recommended_event_types,
  estimated_guest_range = excluded.estimated_guest_range,
  estimated_budget_range = excluded.estimated_budget_range,
  fit_score = excluded.fit_score,
  confidence = excluded.confidence,
  risks = excluded.risks,
  evidence = excluded.evidence,
  input_snapshot = excluded.input_snapshot,
  model_provider = excluded.model_provider,
  model_name = excluded.model_name,
  prompt_version = excluded.prompt_version;

insert into public.venue_matches (
  id,
  organization_id,
  company_id,
  persona_id,
  venue_id,
  offer_id,
  score,
  score_breakdown,
  reasons,
  risks,
  recommended_pitch,
  model_version,
  is_selected,
  created_at,
  updated_at
)
values
  (
    '61000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    87,
    '{"event_fit":30,"capacity_budget_fit":20,"distance_fit":10,"brand_fit":15,"availability_fit":7,"history_fit":5}'::jsonb,
    '["L’offre correspond au format Afterwork recommandé.","Entreprise et établissement sont à Paris.","La communication fait partie des secteurs cibles du lieu."]'::jsonb,
    '["Budget non confirmé","Disponibilité à confirmer"]'::jsonb,
    'Afterwork 20 à 50 personnes chez Little Room : une piste à tester, fondée sur un score explicable de 87/100.',
    'deterministic-v1+venue-match-rationale.v1',
    false,
    '2026-07-23T09:06:00+02:00',
    '2026-07-23T09:06:00+02:00'
  ),
  (
    '61000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000002',
    76,
    '{"event_fit":30,"capacity_budget_fit":16,"distance_fit":10,"brand_fit":8,"availability_fit":7,"history_fit":5}'::jsonb,
    '["Le lancement de produit fait partie des formats recommandés.","Entreprise et établissement sont à Paris.","La compatibilité d’image reste à valider."]'::jsonb,
    '["Budget non confirmé","Disponibilité à confirmer"]'::jsonb,
    'Showcase privé chez Deflower : une alternative créative à tester avec un score explicable de 76/100.',
    'deterministic-v1+venue-match-rationale.v1',
    false,
    '2026-07-23T09:06:00+02:00',
    '2026-07-23T09:06:00+02:00'
  ),
  (
    '61000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000004',
    '40000000-0000-0000-0000-000000000004',
    58,
    '{"event_fit":12,"capacity_budget_fit":16,"distance_fit":10,"brand_fit":8,"availability_fit":7,"history_fit":5}'::jsonb,
    '["Le dîner reste une alternative à tester.","Entreprise et établissement sont à Paris.","La compatibilité d’image reste à valider."]'::jsonb,
    '["Budget non confirmé","Disponibilité à confirmer"]'::jsonb,
    'Dîner suivi d’une soirée chez Giulia : une alternative à confirmer, score explicable de 58/100.',
    'deterministic-v1+venue-match-rationale.v1',
    false,
    '2026-07-23T09:06:00+02:00',
    '2026-07-23T09:06:00+02:00'
  ),
  (
    '61000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000003',
    '40000000-0000-0000-0000-000000000003',
    58,
    '{"event_fit":12,"capacity_budget_fit":16,"distance_fit":10,"brand_fit":8,"availability_fit":7,"history_fit":5}'::jsonb,
    '["Le cocktail reste une alternative à tester.","Entreprise et établissement sont à Paris.","La compatibilité d’image reste à valider."]'::jsonb,
    '["Budget non confirmé","Disponibilité à confirmer"]'::jsonb,
    'Cocktail dînatoire chez Fresh Touch : une alternative modulable à confirmer, score explicable de 58/100.',
    'deterministic-v1+venue-match-rationale.v1',
    false,
    '2026-07-23T09:06:00+02:00',
    '2026-07-23T09:06:00+02:00'
  )
on conflict (id) do update
set
  score = excluded.score,
  score_breakdown = excluded.score_breakdown,
  reasons = excluded.reasons,
  risks = excluded.risks,
  recommended_pitch = excluded.recommended_pitch,
  model_version = excluded.model_version;

insert into public.provider_jobs (
  id,
  organization_id,
  idempotency_key,
  job_type,
  provider,
  entity_type,
  entity_id,
  status,
  input,
  output,
  attempt_count,
  estimated_cost,
  currency,
  scheduled_at,
  started_at,
  completed_at,
  created_at,
  updated_at
)
values
  (
    '62000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'seed-registry-50000000-0000-0000-0000-000000000001',
    'registry_verification',
    'mock_registry',
    'company',
    '50000000-0000-0000-0000-000000000001',
    'completed',
    '{"mock":true}'::jsonb,
    '{"sourceId":"52000000-0000-0000-0000-000000000011","estimatedCost":0}'::jsonb,
    1,
    0,
    'EUR',
    '2026-07-23T09:00:00+02:00',
    '2026-07-23T09:00:00+02:00',
    '2026-07-23T09:00:01+02:00',
    '2026-07-23T09:00:00+02:00',
    '2026-07-23T09:00:01+02:00'
  ),
  (
    '62000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'seed-persona-50000000-0000-0000-0000-000000000001-v1',
    'persona_generation',
    'mock_ai',
    'company',
    '50000000-0000-0000-0000-000000000001',
    'completed',
    '{"promptVersion":"persona.v1","mock":true}'::jsonb,
    '{"personaId":"60000000-0000-0000-0000-000000000001","version":1}'::jsonb,
    1,
    0,
    'EUR',
    '2026-07-23T09:04:00+02:00',
    '2026-07-23T09:04:00+02:00',
    '2026-07-23T09:04:01+02:00',
    '2026-07-23T09:04:00+02:00',
    '2026-07-23T09:04:01+02:00'
  ),
  (
    '62000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    'seed-matching-50000000-0000-0000-0000-000000000001-v1',
    'venue_matching',
    'mock_ai+deterministic-v1',
    'company',
    '50000000-0000-0000-0000-000000000001',
    'completed',
    '{"personaId":"60000000-0000-0000-0000-000000000001","scoringVersion":"deterministic-v1"}'::jsonb,
    '{"matchIds":["61000000-0000-0000-0000-000000000001","61000000-0000-0000-0000-000000000002","61000000-0000-0000-0000-000000000003","61000000-0000-0000-0000-000000000004"],"count":4}'::jsonb,
    1,
    0,
    'EUR',
    '2026-07-23T09:06:00+02:00',
    '2026-07-23T09:06:00+02:00',
    '2026-07-23T09:06:01+02:00',
    '2026-07-23T09:06:00+02:00',
    '2026-07-23T09:06:01+02:00'
  )
on conflict (id) do update
set
  status = excluded.status,
  input = excluded.input,
  output = excluded.output,
  error = null,
  attempt_count = excluded.attempt_count,
  estimated_cost = excluded.estimated_cost,
  completed_at = excluded.completed_at,
  updated_at = excluded.updated_at;

insert into public.ai_runs (
  id,
  organization_id,
  run_type,
  entity_type,
  entity_id,
  provider,
  model,
  prompt_version,
  input_hash,
  input_snapshot,
  output,
  status,
  token_usage,
  created_at,
  completed_at
)
values (
  '63000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'persona_generation',
  'company',
  '50000000-0000-0000-0000-000000000001',
  'mock_ai',
  'surfce-deterministic-mock-v1',
  'persona.v1',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  '{"mock":true,"source_ids":["52000000-0000-0000-0000-000000000011","52000000-0000-0000-0000-000000000012"]}'::jsonb,
  '{"persona_id":"60000000-0000-0000-0000-000000000001","fit_score":84,"confidence":0.68}'::jsonb,
  'completed',
  '{"mode":"mock","input_tokens":0,"output_tokens":0}'::jsonb,
  '2026-07-23T09:04:00+02:00',
  '2026-07-23T09:04:01+02:00'
)
on conflict (id) do update
set
  output = excluded.output,
  status = excluded.status,
  token_usage = excluded.token_usage,
  completed_at = excluded.completed_at;

-- Phase 5: all people, addresses and outbound activity below are explicitly fictional.
-- Reserved .example domains ensure the mock mail provider cannot target a real recipient.
insert into public.contacts (
  id,
  organization_id,
  company_id,
  first_name,
  last_name,
  full_name,
  job_title,
  department,
  email,
  email_status,
  contact_status,
  confidence,
  lawful_basis,
  do_not_contact,
  do_not_contact_reason,
  tags
)
values
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Lina', 'Martin', 'Lina Martin', 'Responsable Communication', 'Communication', 'lina.martin@studio-huit.example', 'valid', 'valid', 0.97, 'intérêt légitime B2B documenté — démonstration', false, null, array['fictif', 'communication']),
  ('70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Noé', 'Bernard', 'Noé Bernard', 'Office Manager', 'Opérations', 'noe.bernard@studio-huit.example', 'valid', 'valid', 0.96, 'intérêt légitime B2B documenté — démonstration', false, null, array['fictif', 'office']),
  ('70000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Inès', 'Robert', 'Inès Robert', 'Responsable Événementiel', 'Communication', 'ines.robert@studio-huit.example', 'valid', 'valid', 0.94, 'intérêt légitime B2B documenté — démonstration', false, null, array['fictif', 'evenementiel']),
  ('70000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Malo', 'Petit', 'Malo Petit', 'Responsable Marketing', 'Marketing', 'malo.petit@studio-huit.example', 'valid', 'valid', 0.93, 'intérêt légitime B2B documenté — démonstration', false, null, array['fictif', 'marketing']),
  ('70000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Aya', 'Moreau', 'Aya Moreau', 'Responsable RH', 'Ressources humaines', 'aya.moreau@studio-huit.example', 'unverified', 'to_verify', 0.61, null, false, null, array['fictif', 'rh']),
  ('70000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Sacha', 'Leroy', 'Sacha Leroy', 'Responsable Partenariats', 'Développement', 'sacha.leroy@studio-huit.example', 'valid', 'valid', 0.92, 'intérêt légitime B2B documenté — démonstration', false, null, array['fictif', 'partenariats']),
  ('70000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Lou', 'Roux', 'Lou Roux', 'Assistante de direction', 'Direction', 'lou.roux@autre-studio.example', 'risky', 'risky', 0.63, null, false, null, array['fictif', 'direction']),
  ('70000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Eden', 'Fournier', 'Eden Fournier', 'Responsable Relations Presse', 'Presse', 'eden.fournier@studio-huit.example', 'valid', 'valid', 0.91, 'intérêt légitime B2B documenté — démonstration', false, null, array['fictif', 'presse']),
  ('70000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 'Alix', 'Girard', 'Alix Girard', 'Office Manager', 'Opérations', 'alix.girard@rive-conseil.example', 'valid', 'valid', 0.96, 'intérêt légitime B2B documenté — démonstration', false, null, array['fictif', 'office']),
  ('70000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 'Nina', 'Bonnet', 'Nina Bonnet', 'Responsable Expérience Collaborateur', 'Ressources humaines', 'nina.bonnet@rive-conseil.example', 'valid', 'valid', 0.95, 'intérêt légitime B2B documenté — démonstration', false, null, array['fictif', 'experience']),
  ('70000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 'Maël', 'Dupont', 'Maël Dupont', 'Direction Générale', 'Direction', 'mael.dupont@rive-conseil.example', 'unverified', 'to_verify', 0.58, null, false, null, array['fictif', 'direction']),
  ('70000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 'Jade', 'Lambert', 'Jade Lambert', 'Responsable Communication', 'Communication', 'jade.lambert@rive-conseil.example', 'valid', 'valid', 0.93, 'intérêt légitime B2B documenté — démonstration', false, null, array['fictif', 'communication']),
  ('70000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 'Éli', 'Fontaine', 'Éli Fontaine', 'Responsable Hospitality', 'Hospitality', 'adresse-invalide', 'invalid', 'invalid', 0.99, null, false, null, array['fictif', 'invalide']),
  ('70000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 'Rose', 'Chevalier', 'Rose Chevalier', 'Responsable Marketing', 'Marketing', 'rose.chevalier@rive-conseil.example', 'valid', 'valid', 0.92, 'intérêt légitime B2B documenté — démonstration', false, null, array['fictif', 'marketing']),
  ('70000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 'Elio', 'Mercier', 'Elio Mercier', 'Responsable RH', 'Ressources humaines', 'elio.mercier@rive-conseil.example', 'valid', 'do_not_contact', 0.95, 'intérêt légitime B2B documenté — démonstration', true, 'Opposition fictive de démonstration', array['fictif', 'suppression'])
on conflict (id) do update
set
  company_id = excluded.company_id,
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  full_name = excluded.full_name,
  job_title = excluded.job_title,
  department = excluded.department,
  email = excluded.email,
  email_status = excluded.email_status,
  contact_status = excluded.contact_status,
  confidence = excluded.confidence,
  lawful_basis = excluded.lawful_basis,
  do_not_contact = excluded.do_not_contact,
  do_not_contact_reason = excluded.do_not_contact_reason,
  tags = excluded.tags,
  deleted_at = null;

insert into public.data_sources (
  organization_id,
  entity_type,
  entity_id,
  field_name,
  provider,
  external_reference,
  raw_value,
  normalized_value,
  collected_at,
  last_verified_at,
  confidence,
  is_inferred,
  metadata
)
select
  c.organization_id,
  'contact',
  c.id,
  'professional_record',
  'seed_mock',
  'seed-contact:' || c.id::text,
  jsonb_build_object('full_name', c.full_name, 'job_title', c.job_title, 'fictional', true),
  jsonb_build_object('full_name', c.full_name, 'job_title', c.job_title, 'fictional', true),
  '2026-07-23T10:00:00+02:00'::timestamptz,
  '2026-07-23T10:00:00+02:00'::timestamptz,
  case when c.contact_status in ('valid', 'do_not_contact') then 0.90 else 0.70 end,
  false,
  '{"mock":true,"fictional":true}'::jsonb
from public.contacts c
where c.organization_id = '10000000-0000-0000-0000-000000000001'
  and c.id::text like '70000000-0000-0000-0000-0000000000%'
on conflict (organization_id, entity_type, provider, external_reference, field_name)
where external_reference is not null
do update set
  raw_value = excluded.raw_value,
  normalized_value = excluded.normalized_value,
  last_verified_at = excluded.last_verified_at,
  confidence = excluded.confidence,
  metadata = excluded.metadata;

insert into public.suppression_list (
  id,
  organization_id,
  email,
  normalized_email,
  domain,
  company_id,
  contact_id,
  reason,
  source,
  suppressed_at,
  metadata
)
values (
  '7f000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'elio.mercier@rive-conseil.example',
  'elio.mercier@rive-conseil.example',
  null,
  '50000000-0000-0000-0000-000000000002',
  '70000000-0000-0000-0000-000000000015',
  'Opposition fictive de démonstration',
  'seed_mock',
  '2026-07-23T10:05:00+02:00',
  '{"mock":true,"fictional":true,"scope":"email"}'::jsonb
)
on conflict (organization_id, normalized_email) do update
set
  reason = excluded.reason,
  source = excluded.source,
  company_id = excluded.company_id,
  contact_id = excluded.contact_id,
  suppressed_at = excluded.suppressed_at,
  expires_at = null,
  metadata = excluded.metadata;

do $$
declare
  owner_user_id uuid;
begin
  select user_id
  into owner_user_id
  from public.memberships
  where organization_id = '10000000-0000-0000-0000-000000000001'
    and is_active = true
  order by case when role = 'admin' then 0 else 1 end, created_at
  limit 1;

  if owner_user_id is null then
    raise notice 'Phase 5 campaign seed skipped: no SURFCE membership is available.';
    return;
  end if;

  insert into public.mailboxes (
    id,
    organization_id,
    user_id,
    provider,
    provider_account_id,
    email_address,
    display_name,
    status,
    daily_send_limit,
    sent_today
  )
  values (
    '71000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    owner_user_id,
    'mock',
    'mock-surfce-primary',
    'florent@stargazing.example',
    'Florent — Stargazing',
    'connected',
    20,
    1
  )
  on conflict (id) do update
  set
    user_id = excluded.user_id,
    email_address = excluded.email_address,
    display_name = excluded.display_name,
    status = excluded.status,
    daily_send_limit = excluded.daily_send_limit,
    sent_today = excluded.sent_today,
    encrypted_access_token = null,
    encrypted_refresh_token = null;

  insert into public.campaigns (
    id,
    organization_id,
    name,
    description,
    status,
    venue_id,
    offer_id,
    mailbox_id,
    segment_definition,
    language,
    tone,
    daily_limit,
    send_window,
    stop_rules,
    requires_first_message_approval,
    created_by,
    approved_by,
    approved_at,
    launched_at
  )
  values
    (
      '72000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001',
      'Afterwork agences parisiennes',
      'Scénario mock complet pour proposer un afterwork à faible volume.',
      'active',
      '30000000-0000-0000-0000-000000000001',
      '40000000-0000-0000-0000-000000000001',
      '71000000-0000-0000-0000-000000000001',
      '{"label":"Agences de communication — Paris","mode":"manual_contacts"}'::jsonb,
      'fr',
      'directe et commerciale',
      10,
      '{"timezone":"Europe/Paris","weekdays":[1,2,3,4,5],"start":"09:00","end":"17:30"}'::jsonb,
      '{"human_reply":true,"unsubscribe":true,"bounce":true,"do_not_contact":true}'::jsonb,
      true,
      owner_user_id,
      owner_user_id,
      now() - interval '3 days',
      now() - interval '2 days'
    ),
    (
      '72000000-0000-0000-0000-000000000002',
      '10000000-0000-0000-0000-000000000001',
      'Dîner cabinets de conseil',
      'Brouillon mock avant génération et validation.',
      'draft',
      '30000000-0000-0000-0000-000000000004',
      '40000000-0000-0000-0000-000000000004',
      '71000000-0000-0000-0000-000000000001',
      '{"label":"Cabinets de conseil — Paris","mode":"manual_contacts"}'::jsonb,
      'fr',
      'premium et événementielle',
      8,
      '{"timezone":"Europe/Paris","weekdays":[1,2,3,4,5],"start":"09:30","end":"17:00"}'::jsonb,
      '{"human_reply":true,"unsubscribe":true,"bounce":true,"do_not_contact":true}'::jsonb,
      true,
      owner_user_id,
      null,
      null,
      null
    )
  on conflict (id) do update
  set
    name = excluded.name,
    description = excluded.description,
    status = excluded.status,
    venue_id = excluded.venue_id,
    offer_id = excluded.offer_id,
    mailbox_id = excluded.mailbox_id,
    segment_definition = excluded.segment_definition,
    language = excluded.language,
    tone = excluded.tone,
    daily_limit = excluded.daily_limit,
    send_window = excluded.send_window,
    stop_rules = excluded.stop_rules,
    requires_first_message_approval = excluded.requires_first_message_approval,
    created_by = excluded.created_by,
    approved_by = excluded.approved_by,
    approved_at = excluded.approved_at,
    launched_at = excluded.launched_at;

  insert into public.sequence_steps (
    id,
    organization_id,
    campaign_id,
    position,
    delay_days,
    delay_hours,
    ai_instructions,
    requires_approval,
    is_active
  )
  values
    ('73000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 0, 0, 0, 'Premier contact', true, true),
    ('73000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 1, 4, 0, 'Relance courte', false, true),
    ('73000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 2, 9, 0, 'Exemple d’offre', false, true),
    ('73000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 3, 14, 0, 'Fermeture polie', false, true),
    ('73000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000002', 0, 0, 0, 'Premier contact', true, true),
    ('73000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000002', 1, 5, 0, 'Relance courte', false, true),
    ('73000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000002', 2, 10, 0, 'Proposition de valeur', false, true),
    ('73000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000002', 3, 14, 0, 'Fermeture polie', false, true)
  on conflict (campaign_id, position) do update
  set
    delay_days = excluded.delay_days,
    delay_hours = excluded.delay_hours,
    ai_instructions = excluded.ai_instructions,
    requires_approval = excluded.requires_approval,
    is_active = excluded.is_active;

  insert into public.campaign_enrollments (
    id,
    organization_id,
    campaign_id,
    company_id,
    contact_id,
    status,
    current_step,
    next_send_at,
    last_sent_at,
    personalization_snapshot
  )
  values
    (
      '74000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001',
      '72000000-0000-0000-0000-000000000001',
      '50000000-0000-0000-0000-000000000001',
      '70000000-0000-0000-0000-000000000001',
      'active',
      0,
      now() + interval '2 days',
      now() - interval '2 days',
      '{"contact_name":"Lina Martin","verified":true,"mock":true}'::jsonb
    ),
    (
      '74000000-0000-0000-0000-000000000002',
      '10000000-0000-0000-0000-000000000001',
      '72000000-0000-0000-0000-000000000002',
      '50000000-0000-0000-0000-000000000002',
      '70000000-0000-0000-0000-000000000009',
      'draft',
      0,
      null,
      null,
      '{"contact_name":"Alix Girard","verified":true,"mock":true}'::jsonb
    )
  on conflict (campaign_id, contact_id) do update
  set
    status = excluded.status,
    current_step = excluded.current_step,
    next_send_at = excluded.next_send_at,
    last_sent_at = excluded.last_sent_at,
    stopped_at = null,
    stop_reason = null,
    personalization_snapshot = excluded.personalization_snapshot;

  insert into public.mail_threads (
    id,
    organization_id,
    mailbox_id,
    provider_thread_id,
    company_id,
    contact_id,
    campaign_id,
    subject,
    last_message_at
  )
  values (
    '75000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '71000000-0000-0000-0000-000000000001',
    'mock_thread_seed_lina',
    '50000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000001',
    '72000000-0000-0000-0000-000000000001',
    'Afterwork 20 à 50 personnes pour votre équipe',
    now() - interval '2 days'
  )
  on conflict (mailbox_id, provider_thread_id) do update
  set
    subject = excluded.subject,
    last_message_at = excluded.last_message_at;

  insert into public.messages (
    id,
    organization_id,
    thread_id,
    campaign_id,
    enrollment_id,
    sequence_step_id,
    provider_message_id,
    deduplication_key,
    direction,
    sender,
    recipients,
    subject,
    body_text,
    body_html,
    variant_label,
    personalization_facts,
    risk_flags,
    scheduled_at,
    sent_at,
    status,
    approved_by,
    approved_at,
    headers
  )
  values
    (
      '76000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001',
      '75000000-0000-0000-0000-000000000001',
      '72000000-0000-0000-0000-000000000001',
      '74000000-0000-0000-0000-000000000001',
      '73000000-0000-0000-0000-000000000001',
      'mock_message_seed_lina_first',
      'seed:campaign-1:enrollment-1:step-0',
      'outbound',
      '{"email":"florent@stargazing.example","name":"Florent — Stargazing"}'::jsonb,
      '[{"email":"lina.martin@studio-huit.example","name":"Lina Martin"}]'::jsonb,
      'Afterwork 20 à 50 personnes pour votre équipe',
      E'Bonjour Lina,\n\nStudio Huit Communication est située à Paris. Je vous contacte avec une proposition simple : un afterwork chez Little Room.\n\nSouhaitez-vous que je vous envoie les grandes lignes ?\n\nBien à vous,\nFlorent\n\nSi ce sujet n’est pas pertinent, dites-le-moi et je ne vous recontacterai pas.',
      '<p>Bonjour Lina,</p><p>Studio Huit Communication est située à Paris. Proposition : un afterwork chez Little Room.</p><p>Si ce sujet n’est pas pertinent, dites-le-moi et je ne vous recontacterai pas.</p>',
      'Directe',
      '[{"fact":"Studio Huit Communication est située à Paris.","source_reference":"52000000-0000-0000-0000-000000000001"}]'::jsonb,
      '[]'::jsonb,
      now() - interval '2 days',
      now() - interval '2 days',
      'sent_mock',
      owner_user_id,
      now() - interval '3 days',
      '{"mock":true,"prompt_version":"campaign-email.v1"}'::jsonb
    ),
    (
      '76000000-0000-0000-0000-000000000002',
      '10000000-0000-0000-0000-000000000001',
      '75000000-0000-0000-0000-000000000001',
      '72000000-0000-0000-0000-000000000001',
      '74000000-0000-0000-0000-000000000001',
      '73000000-0000-0000-0000-000000000002',
      null,
      'seed:campaign-1:enrollment-1:step-1',
      'outbound',
      '{"email":"florent@stargazing.example","name":"Florent — Stargazing"}'::jsonb,
      '[{"email":"lina.martin@studio-huit.example","name":"Lina Martin"}]'::jsonb,
      'Une relance courte pour votre équipe',
      E'Bonjour Lina,\n\nJe me permets une relance courte au cas où ce sujet soit d’actualité.\n\nSi ce sujet n’est pas pertinent, dites-le-moi et je ne vous recontacterai pas.',
      '<p>Bonjour Lina,</p><p>Je me permets une relance courte.</p><p>Si ce sujet n’est pas pertinent, dites-le-moi et je ne vous recontacterai pas.</p>',
      'Directe',
      '[{"fact":"Studio Huit Communication est située à Paris.","source_reference":"52000000-0000-0000-0000-000000000001"}]'::jsonb,
      '[]'::jsonb,
      now() + interval '2 days',
      null,
      'scheduled',
      null,
      null,
      '{"mock":true,"prompt_version":"campaign-email.v1"}'::jsonb
    )
  on conflict (organization_id, deduplication_key) do update
  set
    thread_id = excluded.thread_id,
    provider_message_id = excluded.provider_message_id,
    sender = excluded.sender,
    recipients = excluded.recipients,
    subject = excluded.subject,
    body_text = excluded.body_text,
    body_html = excluded.body_html,
    variant_label = excluded.variant_label,
    personalization_facts = excluded.personalization_facts,
    risk_flags = excluded.risk_flags,
    scheduled_at = excluded.scheduled_at,
    sent_at = excluded.sent_at,
    status = excluded.status,
    approved_by = excluded.approved_by,
    approved_at = excluded.approved_at,
    headers = excluded.headers;

  insert into public.provider_jobs (
    id,
    organization_id,
    idempotency_key,
    job_type,
    provider,
    entity_type,
    entity_id,
    status,
    input,
    output,
    attempt_count,
    estimated_cost,
    scheduled_at,
    started_at,
    completed_at
  )
  values (
    '78000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'seed-campaign-email-72000000-0000-0000-0000-000000000001',
    'campaign_email_generation',
    'mock_ai',
    'campaign',
    '72000000-0000-0000-0000-000000000001',
    'completed',
    '{"mock":true,"prompt_version":"campaign-email.v1"}'::jsonb,
    '{"generatedCount":2,"enrollmentCount":1,"estimatedCost":0,"mock":true}'::jsonb,
    1,
    0,
    now() - interval '3 days',
    now() - interval '3 days',
    now() - interval '3 days'
  )
  on conflict (organization_id, idempotency_key) do update
  set
    status = excluded.status,
    input = excluded.input,
    output = excluded.output,
    attempt_count = excluded.attempt_count,
    estimated_cost = excluded.estimated_cost,
    completed_at = excluded.completed_at;

  insert into public.ai_runs (
    id,
    organization_id,
    run_type,
    entity_type,
    entity_id,
    provider,
    model,
    prompt_version,
    input_hash,
    input_snapshot,
    output,
    status,
    token_usage,
    created_by,
    created_at,
    completed_at
  )
  values (
    '79000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'campaign_email_generation',
    'campaign',
    '72000000-0000-0000-0000-000000000001',
    'mock_ai',
    'surfce-deterministic-mock-v1',
    'campaign-email.v1',
    'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    '{"campaignId":"72000000-0000-0000-0000-000000000001","sourceReferences":["52000000-0000-0000-0000-000000000001"],"mock":true}'::jsonb,
    '{"variants":[{"label":"Directe","subject":"Afterwork 20 à 50 personnes pour votre équipe","body_text":"Bonjour Lina — proposition mock.","body_html":"<p>Bonjour Lina — proposition mock.</p>","personalization_facts":[{"fact":"Studio Huit Communication est située à Paris.","source_reference":"52000000-0000-0000-0000-000000000001"}],"risk_flags":[]},{"label":"Premium","subject":"Une piste événementielle à étudier","body_text":"Bonjour Lina — piste premium mock.","body_html":"<p>Bonjour Lina — piste premium mock.</p>","personalization_facts":[{"fact":"Studio Huit Communication est située à Paris.","source_reference":"52000000-0000-0000-0000-000000000001"}],"risk_flags":[]},{"label":"Relationnelle","subject":"Une idée pour Studio Huit Communication","body_text":"Bonjour Lina — idée relationnelle mock.","body_html":"<p>Bonjour Lina — idée relationnelle mock.</p>","personalization_facts":[{"fact":"Studio Huit Communication est située à Paris.","source_reference":"52000000-0000-0000-0000-000000000001"}],"risk_flags":[]}],"recommended_variant":0,"reason":"Variante courte et vérifiée.","missing_information":[]}'::jsonb,
    'completed',
    '{"mode":"mock","input_tokens":0,"output_tokens":0}'::jsonb,
    owner_user_id,
    now() - interval '3 days',
    now() - interval '3 days'
  )
  on conflict (id) do update
  set
    output = excluded.output,
    status = excluded.status,
    token_usage = excluded.token_usage,
    created_by = excluded.created_by,
    completed_at = excluded.completed_at;
end;
$$;

select pg_temp.seed_phase6_demo();

-- Phase 7 — pipeline, tâches, rendez-vous et propositions entièrement fictifs.
create or replace function pg_temp.seed_phase7_demo()
returns void
language plpgsql
as $phase7$
declare
  owner_user_id uuid;
begin
  select m.user_id
  into owner_user_id
  from public.memberships m
  where m.organization_id = '10000000-0000-0000-0000-000000000001'
    and m.is_active
  order by
    case m.role
      when 'admin' then 0
      when 'sales_manager' then 1
      when 'sales' then 2
      else 3
    end,
    m.created_at
  limit 1;

  if owner_user_id is null then
    return;
  end if;

  insert into public.opportunities (
    id,
    organization_id,
    company_id,
    primary_contact_id,
    venue_id,
    offer_id,
    campaign_id,
    owner_id,
    stage_id,
    title,
    probability,
    estimated_amount,
    proposed_amount,
    signed_amount,
    currency,
    estimated_guests,
    event_type,
    desired_event_date,
    expected_close_date,
    source,
    objections,
    next_action,
    next_action_at,
    notes,
    last_activity_at,
    won_at
  )
  values
    (
      '82000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001',
      '50000000-0000-0000-0000-000000000001',
      '70000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000001',
      '40000000-0000-0000-0000-000000000001',
      '72000000-0000-0000-0000-000000000001',
      owner_user_id,
      (
        select id from public.opportunity_stages
        where organization_id = '10000000-0000-0000-0000-000000000001' and key = 'engaged'
      ),
      'Afterwork Studio Huit · 45 personnes',
      45,
      6800,
      null,
      null,
      'EUR',
      45,
      'Afterwork',
      current_date + 57,
      current_date + 15,
      'inbox',
      '[]'::jsonb,
      'Qualifier le format et les horaires',
      now() + interval '1 day',
      'Donnée fictive issue de la réponse positive de Lina Martin.',
      now() - interval '2 hours',
      null
    ),
    (
      '82000000-0000-0000-0000-000000000002',
      '10000000-0000-0000-0000-000000000001',
      '50000000-0000-0000-0000-000000000002',
      '70000000-0000-0000-0000-000000000009',
      '30000000-0000-0000-0000-000000000004',
      '40000000-0000-0000-0000-000000000004',
      null,
      owner_user_id,
      (
        select id from public.opportunity_stages
        where organization_id = '10000000-0000-0000-0000-000000000001' and key = 'appointment'
      ),
      'Séminaire Rive Conseil · direction',
      60,
      12400,
      null,
      null,
      'EUR',
      72,
      'Séminaire',
      current_date + 77,
      current_date + 29,
      'inbox',
      '["Accès transports à confirmer"]'::jsonb,
      'Préparer le rendez-vous découverte',
      now() - interval '1 hour',
      'Donnée fictive de démonstration.',
      now() - interval '1 day',
      null
    ),
    (
      '82000000-0000-0000-0000-000000000003',
      '10000000-0000-0000-0000-000000000001',
      '50000000-0000-0000-0000-000000000001',
      '70000000-0000-0000-0000-000000000003',
      '30000000-0000-0000-0000-000000000002',
      '40000000-0000-0000-0000-000000000002',
      null,
      owner_user_id,
      (
        select id from public.opportunity_stages
        where organization_id = '10000000-0000-0000-0000-000000000001' and key = 'proposal_sent'
      ),
      'Cocktail presse · lancement produit',
      70,
      9800,
      10400,
      null,
      'EUR',
      90,
      'Cocktail',
      current_date + 68,
      current_date + 8,
      'manual',
      '["Budget décoration"]'::jsonb,
      'Relancer la proposition v2',
      now() + interval '2 days',
      'Donnée fictive de démonstration.',
      now() - interval '1 day',
      null
    ),
    (
      '82000000-0000-0000-0000-000000000004',
      '10000000-0000-0000-0000-000000000001',
      '50000000-0000-0000-0000-000000000002',
      '70000000-0000-0000-0000-000000000012',
      '30000000-0000-0000-0000-000000000003',
      '40000000-0000-0000-0000-000000000003',
      null,
      owner_user_id,
      (
        select id from public.opportunity_stages
        where organization_id = '10000000-0000-0000-0000-000000000001' and key = 'negotiation'
      ),
      'Dîner partenaires Rive Conseil',
      85,
      15600,
      14900,
      null,
      'EUR',
      38,
      'Dîner',
      current_date + 112,
      current_date + 22,
      'referral',
      '["Privatisation totale demandée"]'::jsonb,
      'Valider la clause d’exclusivité',
      now() + interval '5 days',
      'Donnée fictive de démonstration.',
      now() - interval '3 days',
      null
    ),
    (
      '82000000-0000-0000-0000-000000000005',
      '10000000-0000-0000-0000-000000000001',
      '50000000-0000-0000-0000-000000000001',
      '70000000-0000-0000-0000-000000000006',
      '30000000-0000-0000-0000-000000000001',
      '40000000-0000-0000-0000-000000000001',
      null,
      owner_user_id,
      (
        select id from public.opportunity_stages
        where organization_id = '10000000-0000-0000-0000-000000000001' and key = 'won'
      ),
      'Soirée partenaires · rentrée',
      100,
      7200,
      7600,
      7600,
      'EUR',
      55,
      'Soirée',
      current_date + 42,
      current_date - 5,
      'manual',
      '[]'::jsonb,
      'Transmettre le dossier de production',
      now() + interval '4 days',
      'Donnée fictive gagnée pour démontrer le revenu signé.',
      now() - interval '5 days',
      now() - interval '5 days'
    )
  on conflict (id) do update
  set
    stage_id = excluded.stage_id,
    title = excluded.title,
    probability = excluded.probability,
    estimated_amount = excluded.estimated_amount,
    proposed_amount = excluded.proposed_amount,
    signed_amount = excluded.signed_amount,
    next_action = excluded.next_action,
    next_action_at = excluded.next_action_at,
    owner_id = excluded.owner_id,
    notes = excluded.notes;

  update public.mail_threads
  set opportunity_id = case id
    when '75000000-0000-0000-0000-000000000001'
      then '82000000-0000-0000-0000-000000000001'::uuid
    when '75000000-0000-0000-0000-000000000002'
      then '82000000-0000-0000-0000-000000000002'::uuid
    else opportunity_id
  end
  where id in (
    '75000000-0000-0000-0000-000000000001',
    '75000000-0000-0000-0000-000000000002'
  );

  insert into public.tasks (
    id,
    organization_id,
    company_id,
    contact_id,
    opportunity_id,
    assigned_to,
    created_by,
    title,
    description,
    priority,
    status,
    due_at
  )
  values
    ('83000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001', owner_user_id, owner_user_id, 'Qualifier le format et les horaires', 'Préparer trois questions de qualification.', 'normal', 'todo', now() + interval '1 day'),
    ('83000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000009', '82000000-0000-0000-0000-000000000002', owner_user_id, owner_user_id, 'Préparer le rendez-vous découverte', 'Valider les participants et le budget.', 'high', 'todo', now() - interval '1 hour'),
    ('83000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000003', '82000000-0000-0000-0000-000000000003', owner_user_id, owner_user_id, 'Relancer la proposition v2', null, 'normal', 'todo', now() + interval '2 days'),
    ('83000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000012', '82000000-0000-0000-0000-000000000004', owner_user_id, owner_user_id, 'Valider la clause d’exclusivité', null, 'high', 'todo', now() + interval '5 days'),
    ('83000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000006', '82000000-0000-0000-0000-000000000005', owner_user_id, owner_user_id, 'Transmettre le dossier de production', null, 'normal', 'todo', now() + interval '4 days')
  on conflict (id) do update
  set
    title = excluded.title,
    description = excluded.description,
    priority = excluded.priority,
    due_at = excluded.due_at,
    assigned_to = excluded.assigned_to;

  insert into public.appointments (
    id,
    organization_id,
    company_id,
    contact_id,
    opportunity_id,
    owner_id,
    title,
    description,
    starts_at,
    ends_at,
    location,
    status
  )
  values (
    '85000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000002',
    '70000000-0000-0000-0000-000000000009',
    '82000000-0000-0000-0000-000000000002',
    owner_user_id,
    'Rendez-vous découverte',
    'Valider le format, la jauge et le budget.',
    now() + interval '1 day',
    now() + interval '1 day 45 minutes',
    'Visioconférence',
    'planned'
  )
  on conflict (id) do update
  set
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    location = excluded.location,
    owner_id = excluded.owner_id;

  insert into public.proposals (
    id,
    organization_id,
    opportunity_id,
    venue_id,
    offer_id,
    version,
    status,
    amount,
    currency,
    guest_count,
    event_date,
    content,
    sent_at,
    accepted_at,
    created_by
  )
  values
    (
      '86000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001',
      '82000000-0000-0000-0000-000000000003',
      '30000000-0000-0000-0000-000000000002',
      '40000000-0000-0000-0000-000000000002',
      1,
      'sent',
      10400,
      'EUR',
      90,
      current_date + 68,
      '{"summary":"Cocktail presse fictif avec privatisation.","inclusions":["Privatisation","Accueil","Cocktail"],"terms":"Sous réserve de disponibilité."}'::jsonb,
      now() - interval '1 day',
      null,
      owner_user_id
    ),
    (
      '86000000-0000-0000-0000-000000000002',
      '10000000-0000-0000-0000-000000000001',
      '82000000-0000-0000-0000-000000000005',
      '30000000-0000-0000-0000-000000000001',
      '40000000-0000-0000-0000-000000000001',
      1,
      'accepted',
      7600,
      'EUR',
      55,
      current_date + 42,
      '{"summary":"Soirée partenaires fictive confirmée.","inclusions":["Privatisation","Cocktail"],"terms":"Démonstration uniquement."}'::jsonb,
      now() - interval '7 days',
      now() - interval '5 days',
      owner_user_id
    )
  on conflict (id) do update
  set
    status = excluded.status,
    amount = excluded.amount,
    content = excluded.content,
    sent_at = excluded.sent_at,
    accepted_at = excluded.accepted_at,
    created_by = excluded.created_by;
end;
$phase7$;

select pg_temp.seed_phase7_demo();

create or replace function pg_temp.seed_phase8_demo()
returns void
language plpgsql
as $phase8$
declare
  owner_user_id uuid;
begin
  select user_id
  into owner_user_id
  from public.memberships
  where organization_id = '10000000-0000-0000-0000-000000000001'
    and role = 'admin'
    and is_active
  order by created_at
  limit 1;

  if owner_user_id is null then
    raise exception 'Phase 8 seed requires the SURFCE administrator';
  end if;

  update public.compliance_settings
  set
    default_lawful_basis = 'legitimate_interest',
    contact_retention_days = 730,
    message_retention_days = 365,
    provider_log_retention_days = 180,
    audit_retention_days = 2190,
    anonymize_inactive_contacts = true,
    retain_suppression_proof = true,
    tracking_enabled = false,
    updated_by = owner_user_id
  where organization_id = '10000000-0000-0000-0000-000000000001';

  insert into public.analytics_exports (
    id,
    organization_id,
    requested_by,
    export_type,
    format,
    filters,
    columns,
    row_count,
    status,
    checksum
  )
  values (
    '89000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    owner_user_id,
    'analytics_overview',
    'csv',
    '{"period":"phase8_demo"}'::jsonb,
    array['indicateur', 'valeur', 'unite', 'definition', 'source'],
    17,
    'completed',
    repeat('a', 64)
  )
  on conflict (id) do nothing;

  insert into public.retention_runs (
    id,
    organization_id,
    requested_by,
    mode,
    status,
    settings_snapshot,
    report,
    started_at,
    completed_at
  )
  values (
    '88000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    owner_user_id,
    'simulation',
    'completed',
    '{"contact_retention_days":730,"message_retention_days":365,"provider_log_retention_days":180,"audit_retention_days":2190,"tracking_enabled":false}'::jsonb,
    '{"contacts":0,"messages":0,"provider_jobs":0,"audit_logs":0,"dry_run":true}'::jsonb,
    now(),
    now()
  )
  on conflict (id) do nothing;

  insert into public.privacy_requests (
    id,
    organization_id,
    contact_id,
    requested_by,
    request_type,
    status,
    reason,
    result,
    completed_at
  )
  values (
    '87000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000001',
    owner_user_id,
    'access',
    'completed',
    'Démonstration fictive de la traçabilité Phase 8',
    '{"exported_sections":["contact","company","sources","campaign_enrollments","conversations"]}'::jsonb,
    now()
  )
  on conflict (id) do nothing;
end;
$phase8$;

select pg_temp.seed_phase8_demo();
