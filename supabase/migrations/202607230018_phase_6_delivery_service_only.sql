revoke all on function public.claim_campaign_message(uuid)
  from public, anon, authenticated;
grant execute on function public.claim_campaign_message(uuid)
  to service_role;

revoke all on function public.finalize_campaign_message(uuid, text, text, timestamptz, boolean)
  from public, anon, authenticated;
grant execute on function public.finalize_campaign_message(uuid, text, text, timestamptz, boolean)
  to service_role;

revoke all on function public.fail_campaign_message(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.fail_campaign_message(uuid, text, text)
  to service_role;

comment on function public.claim_campaign_message(uuid) is
'Service-only atomic campaign delivery claim after application-level authorization.';

comment on function public.finalize_campaign_message(uuid, text, text, timestamptz, boolean) is
'Service-only campaign delivery finalization after provider confirmation.';

comment on function public.fail_campaign_message(uuid, text, text) is
'Service-only transition from processing to a sanitized provider failure.';
