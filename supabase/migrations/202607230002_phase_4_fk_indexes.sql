begin;

create index venue_matches_persona_composite_fk_idx
on public.venue_matches (organization_id, company_id, persona_id)
where persona_id is not null;

create index venue_matches_venue_composite_fk_idx
on public.venue_matches (organization_id, venue_id);

create index venue_matches_offer_composite_fk_idx
on public.venue_matches (organization_id, venue_id, offer_id)
where offer_id is not null;

commit;
