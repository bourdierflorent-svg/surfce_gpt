create index contacts_company_fk_idx
on public.contacts (organization_id, company_id);

create index contacts_assigned_to_fk_idx
on public.contacts (assigned_to);

create index contacts_status_idx
on public.contacts (organization_id, contact_status, email_status)
where deleted_at is null;

create index mailboxes_user_fk_idx
on public.mailboxes (user_id);

create index campaigns_mailbox_fk_idx
on public.campaigns (organization_id, mailbox_id);

create index campaigns_venue_fk_idx
on public.campaigns (organization_id, venue_id)
where venue_id is not null;

create index campaigns_offer_composite_fk_idx
on public.campaigns (organization_id, venue_id, offer_id)
where offer_id is not null;

create index campaigns_created_by_fk_idx
on public.campaigns (created_by);

create index campaigns_approved_by_fk_idx
on public.campaigns (approved_by)
where approved_by is not null;

create index sequence_steps_campaign_fk_idx
on public.sequence_steps (organization_id, campaign_id, position);

create index campaign_enrollments_campaign_fk_idx
on public.campaign_enrollments (organization_id, campaign_id, status, next_send_at);

create index campaign_enrollments_company_fk_idx
on public.campaign_enrollments (organization_id, company_id);

create index campaign_enrollments_contact_fk_idx
on public.campaign_enrollments (organization_id, contact_id);

create index mail_threads_mailbox_fk_idx
on public.mail_threads (organization_id, mailbox_id, last_message_at desc);

create index mail_threads_company_fk_idx
on public.mail_threads (organization_id, company_id)
where company_id is not null;

create index mail_threads_contact_fk_idx
on public.mail_threads (organization_id, contact_id)
where contact_id is not null;

create index mail_threads_campaign_fk_idx
on public.mail_threads (organization_id, campaign_id)
where campaign_id is not null;

create index messages_thread_fk_idx
on public.messages (organization_id, thread_id)
where thread_id is not null;

create index messages_campaign_due_idx
on public.messages (organization_id, campaign_id, status, scheduled_at);

create index messages_enrollment_fk_idx
on public.messages (organization_id, enrollment_id, scheduled_at);

create index messages_sequence_step_fk_idx
on public.messages (organization_id, sequence_step_id);

create index messages_approved_by_fk_idx
on public.messages (approved_by)
where approved_by is not null;

create index suppression_list_company_fk_idx
on public.suppression_list (organization_id, company_id)
where company_id is not null;

create index suppression_list_contact_fk_idx
on public.suppression_list (organization_id, contact_id)
where contact_id is not null;

create index suppression_list_domain_idx
on public.suppression_list (organization_id, domain)
where domain is not null;

create index audit_logs_actor_fk_idx
on public.audit_logs (actor_user_id)
where actor_user_id is not null;

create index audit_logs_entity_idx
on public.audit_logs (organization_id, entity_type, entity_id, created_at desc);
