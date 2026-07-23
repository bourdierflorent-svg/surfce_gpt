revoke execute on function public.enroll_contact_in_campaign(uuid, uuid) from anon;
revoke execute on function public.suppress_contact(uuid, text, text) from anon;
revoke execute on function public.process_mock_campaign_message(uuid, text) from anon;

grant execute on function public.enroll_contact_in_campaign(uuid, uuid) to authenticated;
grant execute on function public.suppress_contact(uuid, text, text) to authenticated;
grant execute on function public.process_mock_campaign_message(uuid, text) to authenticated, service_role;
