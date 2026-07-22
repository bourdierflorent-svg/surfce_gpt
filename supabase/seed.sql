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
