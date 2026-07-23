revoke all on function public.process_mock_campaign_message(uuid, text)
  from public, anon, authenticated;
grant execute on function public.process_mock_campaign_message(uuid, text)
  to service_role;

comment on function public.process_mock_campaign_message(uuid, text) is
'Legacy mock delivery helper retained for regression tests and restricted to service_role.';
