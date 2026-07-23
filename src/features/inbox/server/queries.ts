import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { assertOrganizationPermission } from "@/features/organizations/server/authorization";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppAuthContext } from "@/types/auth";

import type { InboxThreadDetail, InboxThreadListItem } from "../types";

export interface InboxFilters {
  query?: string;
  classification?: string;
  priority?: string;
  unread?: boolean;
}

export async function listInboxThreads(
  context: AppAuthContext,
  filters: InboxFilters = {},
): Promise<InboxThreadListItem[]> {
  assertOrganizationPermission(context.membership.role, "inbox:read");
  if (context.isPreview) return [];
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("mail_threads")
    .select("*")
    .eq("organization_id", context.organization.id)
    .order("is_unread", { ascending: false })
    .order("last_message_at", { ascending: false })
    .limit(100);
  if (filters.classification && filters.classification !== "all") {
    query = query.eq("classification", filters.classification);
  }
  if (filters.priority === "low" || filters.priority === "normal" || filters.priority === "high") {
    query = query.eq("priority", filters.priority);
  }
  if (filters.unread) query = query.eq("is_unread", true);
  const { data: threads, error } = await query;
  if (error) throw new Error("Les conversations n’ont pas pu être chargées.");
  if (!threads?.length) return [];

  const threadIds = threads.map((thread) => thread.id);
  const mailboxIds = Array.from(new Set(threads.map((thread) => thread.mailbox_id)));
  const contactIds = Array.from(
    new Set(threads.flatMap((thread) => (thread.contact_id ? [thread.contact_id] : []))),
  );
  const companyIds = Array.from(
    new Set(threads.flatMap((thread) => (thread.company_id ? [thread.company_id] : []))),
  );
  const [messagesResult, mailboxesResult, contactsResult, companiesResult] = await Promise.all([
    supabase
      .from("messages")
      .select("id, thread_id, direction, body_text, received_at, sent_at, created_at")
      .in("thread_id", threadIds)
      .order("created_at", { ascending: false }),
    supabase.from("mailboxes").select("id, email_address, provider").in("id", mailboxIds),
    contactIds.length
      ? supabase.from("contacts").select("id, full_name").in("id", contactIds)
      : Promise.resolve({ data: [], error: null }),
    companyIds.length
      ? supabase.from("companies").select("id, legal_name, trade_name").in("id", companyIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (
    messagesResult.error ||
    mailboxesResult.error ||
    contactsResult.error ||
    companiesResult.error
  ) {
    throw new Error("Le contexte des conversations est incomplet.");
  }
  const messageThreadById = new Map(
    (messagesResult.data ?? []).flatMap((message) =>
      message.thread_id ? [[message.id, message.thread_id] as const] : [],
    ),
  );
  const { data: stopEvents, error: stopEventsError } = messageThreadById.size
    ? await supabase
        .from("message_events")
        .select("message_id")
        .eq("organization_id", context.organization.id)
        .eq("event_type", "campaign_stopped")
        .in("message_id", Array.from(messageThreadById.keys()))
    : { data: [], error: null };
  if (stopEventsError) throw new Error("Les règles d’arrêt n’ont pas pu être chargées.");
  const stoppedThreads = new Set(
    (stopEvents ?? []).flatMap((event) => {
      const threadId = messageThreadById.get(event.message_id);
      return threadId ? [threadId] : [];
    }),
  );
  const lastMessages = new Map<string, { body_text: string; direction: "inbound" | "outbound" }>();
  for (const message of messagesResult.data ?? []) {
    if (message.thread_id && !lastMessages.has(message.thread_id)) {
      lastMessages.set(message.thread_id, message);
    }
  }
  const mailboxes = new Map((mailboxesResult.data ?? []).map((row) => [row.id, row]));
  const contacts = new Map((contactsResult.data ?? []).map((row) => [row.id, row.full_name]));
  const companies = new Map(
    (companiesResult.data ?? []).map((row) => [row.id, row.trade_name ?? row.legal_name]),
  );
  const needle = filters.query?.trim().toLocaleLowerCase("fr");
  return threads
    .map((thread) => {
      const mailbox = mailboxes.get(thread.mailbox_id);
      const last = lastMessages.get(thread.id);
      return {
        ...thread,
        mailboxAddress: mailbox?.email_address ?? "Boîte inconnue",
        mailboxProvider: mailbox?.provider ?? "mock",
        contactName: thread.contact_id ? (contacts.get(thread.contact_id) ?? null) : null,
        companyName: thread.company_id ? (companies.get(thread.company_id) ?? null) : null,
        lastMessagePreview: last?.body_text.slice(0, 220) ?? "Aucun contenu disponible",
        lastDirection: last?.direction ?? null,
        campaignStopped: stoppedThreads.has(thread.id),
      } satisfies InboxThreadListItem;
    })
    .filter((thread) =>
      needle
        ? [thread.subject, thread.contactName, thread.companyName, thread.lastMessagePreview].some(
            (value) => value?.toLocaleLowerCase("fr").includes(needle),
          )
        : true,
    );
}

export async function getInboxThread(
  context: AppAuthContext,
  threadId: string,
): Promise<InboxThreadDetail | null> {
  assertOrganizationPermission(context.membership.role, "inbox:read");
  if (context.isPreview) return null;
  const supabase = await createSupabaseServerClient();
  const { data: thread, error } = await supabase
    .from("mail_threads")
    .select("*")
    .eq("organization_id", context.organization.id)
    .eq("id", threadId)
    .maybeSingle();
  if (error || !thread) return null;
  const messagesResult = await supabase
    .from("messages")
    .select("*")
    .eq("organization_id", context.organization.id)
    .eq("thread_id", thread.id)
    .order("created_at");
  if (messagesResult.error) {
    throw new Error("Le contenu de cette conversation est incomplet.");
  }
  const messageIds = (messagesResult.data ?? []).map((message) => message.id);
  const [
    mailboxResult,
    eventsResult,
    attachmentsResult,
    companyResult,
    contactResult,
    campaignResult,
    companiesResult,
    contactsResult,
    campaignsResult,
    auditResult,
  ] = await Promise.all([
    supabase.from("mailboxes").select("*").eq("id", thread.mailbox_id).single(),
    messageIds.length
      ? supabase
          .from("message_events")
          .select("*")
          .eq("organization_id", context.organization.id)
          .in("message_id", messageIds)
          .order("occurred_at")
      : Promise.resolve({ data: [], error: null }),
    messageIds.length
      ? supabase
          .from("message_attachments")
          .select("*")
          .eq("organization_id", context.organization.id)
          .in("message_id", messageIds)
      : Promise.resolve({ data: [], error: null }),
    thread.company_id
      ? supabase.from("companies").select("*").eq("id", thread.company_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    thread.contact_id
      ? supabase.from("contacts").select("*").eq("id", thread.contact_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    thread.campaign_id
      ? supabase.from("campaigns").select("*").eq("id", thread.campaign_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("companies")
      .select("id, legal_name, trade_name")
      .eq("organization_id", context.organization.id)
      .is("deleted_at", null)
      .order("normalized_name")
      .limit(200),
    supabase
      .from("contacts")
      .select("id, company_id, full_name")
      .eq("organization_id", context.organization.id)
      .is("deleted_at", null)
      .order("full_name")
      .limit(300),
    supabase
      .from("campaigns")
      .select("id, name")
      .eq("organization_id", context.organization.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("audit_logs")
      .select("*")
      .eq("organization_id", context.organization.id)
      .eq("entity_type", "mail_thread")
      .eq("entity_id", thread.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (mailboxResult.error || !mailboxResult.data || eventsResult.error || attachmentsResult.error) {
    throw new Error("Le contenu de cette conversation est incomplet.");
  }
  return {
    thread,
    mailbox: mailboxResult.data,
    company: companyResult.data,
    contact: contactResult.data,
    campaign: campaignResult.data,
    messages: messagesResult.data ?? [],
    events: eventsResult.data ?? [],
    attachments: attachmentsResult.data ?? [],
    auditLogs: auditResult.data ?? [],
    associationOptions: {
      companies: (companiesResult.data ?? []).map((company) => ({
        id: company.id,
        name: company.trade_name ?? company.legal_name,
      })),
      contacts: (contactsResult.data ?? []).map((contact) => ({
        id: contact.id,
        company_id: contact.company_id,
        name: contact.full_name,
      })),
      campaigns: campaignsResult.data ?? [],
    },
  };
}

export async function requireInboxContext() {
  return requireAppAuthContext();
}
