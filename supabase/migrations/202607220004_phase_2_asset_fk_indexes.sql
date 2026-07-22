begin;

create index venue_assets_organization_venue_offer_idx
  on public.venue_assets (organization_id, venue_id, offer_id);

comment on index public.venue_assets_organization_venue_offer_idx is
  'Covers both composite venue_assets foreign keys for updates and deletes on parent rows.';

commit;
