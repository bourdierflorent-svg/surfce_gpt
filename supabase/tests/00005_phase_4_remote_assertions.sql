begin;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-phase4@surfce.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Admin Phase 4"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000702', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'viewer-phase4@surfce.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Viewer Phase 4"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000703', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sales-phase4@surfce.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Sales Phase 4"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-other-phase4@surfce.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Admin Other Phase 4"}'::jsonb, now(), now());

insert into public.organizations (id, name, slug)
values
  ('10000000-0000-0000-0000-000000000701', 'Phase 4 A', 'phase-4-a'),
  ('10000000-0000-0000-0000-000000000801', 'Phase 4 B', 'phase-4-b');

insert into public.memberships (organization_id, user_id, role)
values
  ('10000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000701', 'admin'),
  ('10000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000702', 'viewer'),
  ('10000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000703', 'sales'),
  ('10000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000801', 'admin');

insert into public.companies (
  id, organization_id, legal_name, normalized_name, sector, employee_range,
  city, assigned_to
)
values
  ('50000000-0000-0000-0000-000000000701', '10000000-0000-0000-0000-000000000701', 'Phase 4 A fictive', 'phase 4 a fictive', 'Communication', '11–50', 'Paris', '00000000-0000-0000-0000-000000000703'),
  ('50000000-0000-0000-0000-000000000702', '10000000-0000-0000-0000-000000000701', 'Phase 4 non attribuée fictive', 'phase 4 non attribuee fictive', 'Conseil', '11–50', 'Paris', null),
  ('50000000-0000-0000-0000-000000000801', '10000000-0000-0000-0000-000000000801', 'Phase 4 B fictive', 'phase 4 b fictive', 'Conseil', '11–50', 'Paris', null);

insert into public.venues (
  id, organization_id, name, slug, venue_type, city, event_types, target_sectors
)
values
  ('30000000-0000-0000-0000-000000000701', '10000000-0000-0000-0000-000000000701', 'Lieu Phase 4 A', 'lieu-phase-4-a', 'Lieu test', 'Paris', array['Afterwork'], array['Communication']),
  ('30000000-0000-0000-0000-000000000801', '10000000-0000-0000-0000-000000000801', 'Lieu Phase 4 B', 'lieu-phase-4-b', 'Lieu test', 'Paris', array['Afterwork'], array['Conseil']);

insert into public.venue_offers (
  id, organization_id, venue_id, name, slug, event_type, min_guests, max_guests
)
values
  ('40000000-0000-0000-0000-000000000701', '10000000-0000-0000-0000-000000000701', '30000000-0000-0000-0000-000000000701', 'Afterwork Phase 4 A', 'afterwork-phase-4-a', 'Afterwork', 10, 60),
  ('40000000-0000-0000-0000-000000000801', '10000000-0000-0000-0000-000000000801', '30000000-0000-0000-0000-000000000801', 'Afterwork Phase 4 B', 'afterwork-phase-4-b', 'Afterwork', 10, 60);

insert into public.personas (
  id, organization_id, company_id, version, status, summary, company_type,
  event_maturity, estimated_size, probable_needs, likely_contact_roles,
  recommended_event_types, estimated_guest_range, estimated_budget_range,
  fit_score, confidence, risks, evidence, input_snapshot, model_provider,
  model_name, prompt_version
)
values (
  '60000000-0000-0000-0000-000000000801',
  '10000000-0000-0000-0000-000000000801',
  '50000000-0000-0000-0000-000000000801',
  1,
  'draft',
  'Persona fictif de l’organisation B pour vérifier l’isolation.',
  'Cabinet de conseil',
  'medium',
  '{"label":"11–50","confidence":0.7}'::jsonb,
  '[]'::jsonb,
  array['Office Manager'],
  array['Afterwork'],
  '{"min":10,"max":50,"confidence":0.5}'::jsonb,
  '{"min":null,"max":null,"currency":"EUR","confidence":0}'::jsonb,
  60,
  0.6,
  '["Budget inconnu"]'::jsonb,
  '[]'::jsonb,
  '{"mock":true}'::jsonb,
  'mock_ai',
  'remote-test-v1',
  'persona.v1'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000701', true);

insert into public.personas (
  id, organization_id, company_id, version, status, summary, company_type,
  event_maturity, estimated_size, probable_needs, likely_contact_roles,
  recommended_event_types, estimated_guest_range, estimated_budget_range,
  fit_score, confidence, risks, evidence, input_snapshot, model_provider,
  model_name, prompt_version
)
values (
  '60000000-0000-0000-0000-000000000701',
  '10000000-0000-0000-0000-000000000701',
  '50000000-0000-0000-0000-000000000701',
  1,
  'draft',
  'Persona fictif de l’organisation A strictement fondé sur les entrées.',
  'Agence de communication',
  'high',
  '{"label":"11–50","confidence":0.7}'::jsonb,
  '[{"type":"afterwork","confidence":0.8,"reason":"Format plausible."}]'::jsonb,
  array['Office Manager'],
  array['Afterwork'],
  '{"min":10,"max":60,"confidence":0.5}'::jsonb,
  '{"min":null,"max":null,"currency":"EUR","confidence":0}'::jsonb,
  84,
  0.68,
  '["Budget inconnu"]'::jsonb,
  '[]'::jsonb,
  '{"mock":true}'::jsonb,
  'mock_ai',
  'remote-test-v1',
  'persona.v1'
);

insert into public.provider_jobs (
  organization_id, idempotency_key, job_type, provider, entity_type, entity_id,
  status, input, output, attempt_count, completed_at
)
values (
  '10000000-0000-0000-0000-000000000701',
  'phase4-idempotency-key-a',
  'persona_generation',
  'mock_ai',
  'company',
  '50000000-0000-0000-0000-000000000701',
  'completed',
  '{"mock":true}'::jsonb,
  '{"personaId":"60000000-0000-0000-0000-000000000701"}'::jsonb,
  1,
  now()
);

insert into public.ai_runs (
  organization_id, run_type, entity_type, entity_id, provider, model,
  prompt_version, input_hash, input_snapshot, output, status, completed_at
)
values (
  '10000000-0000-0000-0000-000000000701',
  'persona_generation',
  'company',
  '50000000-0000-0000-0000-000000000701',
  'mock_ai',
  'remote-test-v1',
  'persona.v1',
  'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  '{"mock":true}'::jsonb,
  '{"fit_score":84}'::jsonb,
  'completed',
  now()
);

insert into public.venue_matches (
  organization_id, company_id, persona_id, venue_id, offer_id, score,
  score_breakdown, reasons, risks, recommended_pitch, model_version
)
values (
  '10000000-0000-0000-0000-000000000701',
  '50000000-0000-0000-0000-000000000701',
  '60000000-0000-0000-0000-000000000701',
  '30000000-0000-0000-0000-000000000701',
  '40000000-0000-0000-0000-000000000701',
  83,
  '{"event_fit":30,"capacity_budget_fit":16,"distance_fit":10,"brand_fit":15,"availability_fit":7,"history_fit":5}'::jsonb,
  '["Score explicable"]'::jsonb,
  '["Budget inconnu"]'::jsonb,
  'Piste fictive à valider.',
  'deterministic-v1'
);

do $$
declare row_total bigint;
begin
  select count(*) into row_total from public.personas;
  if row_total <> 1 then
    raise exception 'Phase 4 RLS failed: admin A sees % personas instead of 1', row_total;
  end if;

  begin
    insert into public.provider_jobs (
      organization_id, idempotency_key, job_type, provider, entity_type, entity_id
    ) values (
      '10000000-0000-0000-0000-000000000701',
      'phase4-idempotency-key-a',
      'persona_generation',
      'mock_ai',
      'company',
      '50000000-0000-0000-0000-000000000701'
    );
    raise exception 'Phase 4 idempotence failed: duplicate provider job was accepted';
  exception when unique_violation then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000702', true);

do $$
declare changed_rows bigint;
begin
  update public.personas
  set summary = 'Viewer edit'
  where id = '60000000-0000-0000-0000-000000000701';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception 'Phase 4 RLS failed: viewer updated a persona';
  end if;

  begin
    insert into public.provider_jobs (
      organization_id, idempotency_key, job_type, provider, entity_type, entity_id
    ) values (
      '10000000-0000-0000-0000-000000000701',
      'phase4-viewer-forbidden',
      'website_analysis',
      'mock_website',
      'company',
      '50000000-0000-0000-0000-000000000701'
    );
    raise exception 'Phase 4 RLS failed: viewer created a provider job';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000703', true);

do $$
begin
  insert into public.provider_jobs (
    organization_id, idempotency_key, job_type, provider, entity_type, entity_id
  ) values (
    '10000000-0000-0000-0000-000000000701',
    'phase4-sales-assigned',
    'website_analysis',
    'mock_website',
    'company',
    '50000000-0000-0000-0000-000000000701'
  );

  begin
    insert into public.provider_jobs (
      organization_id, idempotency_key, job_type, provider, entity_type, entity_id
    ) values (
      '10000000-0000-0000-0000-000000000701',
      'phase4-sales-unassigned',
      'website_analysis',
      'mock_website',
      'company',
      '50000000-0000-0000-0000-000000000702'
    );
    raise exception 'Phase 4 RLS failed: sales created a job for an unassigned company';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
rollback;

select 'phase_4_rls_and_intelligence_assertions_passed' as result;
