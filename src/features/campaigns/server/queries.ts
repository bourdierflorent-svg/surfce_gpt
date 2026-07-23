import { emailGenerationOutputSchema } from "@/features/messages/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppAuthContext } from "@/types/auth";
import type {
  CampaignEnrollmentRow,
  CampaignRow,
  MailboxRow,
  MessageRow,
  SequenceStepRow,
} from "@/types/database";

import type {
  CampaignDetail,
  CampaignEnrollmentDetail,
  CampaignListItem,
  CampaignMessageDetail,
} from "../types";

const previewMailbox: MailboxRow = {
  id: "71000000-0000-0000-0000-000000000001",
  organization_id: "10000000-0000-0000-0000-000000000001",
  user_id: "00000000-0000-0000-0000-000000000000",
  provider: "mock",
  provider_account_id: "mock-surfce-preview",
  email_address: "expediteur@surfce.example",
  display_name: "Équipe événementielle",
  encrypted_access_token: null,
  encrypted_refresh_token: null,
  token_expires_at: null,
  sync_cursor: null,
  watch_expires_at: null,
  status: "connected",
  daily_send_limit: 20,
  sent_today: 1,
  last_sync_at: null,
  created_at: "2026-07-23T08:00:00.000Z",
  updated_at: "2026-07-23T08:00:00.000Z",
};

const previewCampaign: CampaignRow = {
  id: "72000000-0000-0000-0000-000000000001",
  organization_id: "10000000-0000-0000-0000-000000000001",
  name: "Afterwork agences parisiennes",
  description: "Scénario mock à faible volume pour valider le parcours complet.",
  status: "active",
  venue_id: "30000000-0000-0000-0000-000000000001",
  offer_id: "40000000-0000-0000-0000-000000000001",
  mailbox_id: previewMailbox.id,
  segment_definition: { label: "Agences de communication — Paris" },
  language: "fr",
  tone: "directe et commerciale",
  daily_limit: 10,
  send_window: {
    timezone: "Europe/Paris",
    weekdays: [1, 2, 3, 4, 5],
    start: "09:00",
    end: "17:30",
  },
  stop_rules: {
    human_reply: true,
    unsubscribe: true,
    bounce: true,
    do_not_contact: true,
  },
  requires_first_message_approval: true,
  created_by: previewMailbox.user_id,
  approved_by: previewMailbox.user_id,
  approved_at: "2026-07-23T08:10:00.000Z",
  launched_at: "2026-07-23T08:15:00.000Z",
  created_at: "2026-07-23T08:00:00.000Z",
  updated_at: "2026-07-23T08:15:00.000Z",
};

const previewSteps: SequenceStepRow[] = [
  [0, 0, "Premier contact", true],
  [1, 4, "Relance courte", false],
  [2, 9, "Exemple d’offre", false],
  [3, 14, "Fermeture polie", false],
].map(([position, delayDays, instruction, approval]) => ({
  id: `73000000-0000-0000-0000-00000000000${Number(position) + 1}`,
  organization_id: previewCampaign.organization_id,
  campaign_id: previewCampaign.id,
  position: Number(position),
  delay_days: Number(delayDays),
  delay_hours: 0,
  step_type: "email",
  subject_template: null,
  body_template_text: null,
  body_template_html: null,
  ai_instructions: String(instruction),
  requires_approval: Boolean(approval),
  is_active: true,
  created_at: previewCampaign.created_at,
  updated_at: previewCampaign.updated_at,
}));

export async function listCampaigns(context: AppAuthContext): Promise<CampaignListItem[]> {
  if (context.isPreview) {
    return [
      {
        ...previewCampaign,
        mailboxAddress: previewMailbox.email_address,
        enrollmentCount: 2,
        sentCount: 1,
      },
    ];
  }
  const supabase = await createSupabaseServerClient();
  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("organization_id", context.organization.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Impossible de charger les campagnes.");

  const ids = (campaigns ?? []).map((campaign) => campaign.id);
  const mailboxIds = Array.from(new Set((campaigns ?? []).map((campaign) => campaign.mailbox_id)));
  const [mailboxes, enrollments, messages] = await Promise.all([
    mailboxIds.length
      ? supabase.from("mailboxes").select("id, email_address").in("id", mailboxIds)
      : Promise.resolve({ data: [], error: null }),
    ids.length
      ? supabase.from("campaign_enrollments").select("campaign_id").in("campaign_id", ids)
      : Promise.resolve({ data: [], error: null }),
    ids.length
      ? supabase
          .from("messages")
          .select("campaign_id")
          .in("campaign_id", ids)
          .eq("status", "sent_mock")
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (mailboxes.error || enrollments.error || messages.error) {
    throw new Error("Impossible de calculer l’état des campagnes.");
  }
  const addresses = new Map(
    (mailboxes.data ?? []).map((mailbox) => [mailbox.id, mailbox.email_address]),
  );
  const enrollmentCounts = new Map<string, number>();
  for (const row of enrollments.data ?? []) {
    if (!row.campaign_id) continue;
    enrollmentCounts.set(row.campaign_id, (enrollmentCounts.get(row.campaign_id) ?? 0) + 1);
  }
  const sentCounts = new Map<string, number>();
  for (const row of messages.data ?? []) {
    if (!row.campaign_id) continue;
    sentCounts.set(row.campaign_id, (sentCounts.get(row.campaign_id) ?? 0) + 1);
  }
  return (campaigns ?? []).map((campaign) => ({
    ...campaign,
    mailboxAddress: addresses.get(campaign.mailbox_id) ?? "Boîte indisponible",
    enrollmentCount: enrollmentCounts.get(campaign.id) ?? 0,
    sentCount: sentCounts.get(campaign.id) ?? 0,
  }));
}

export async function getCampaignDetail(
  context: AppAuthContext,
  campaignId: string,
): Promise<CampaignDetail | null> {
  if (context.isPreview && campaignId === previewCampaign.id) {
    const enrollment: CampaignEnrollmentDetail = {
      id: "74000000-0000-0000-0000-000000000001",
      organization_id: previewCampaign.organization_id,
      campaign_id: previewCampaign.id,
      company_id: "50000000-0000-0000-0000-000000000001",
      contact_id: "70000000-0000-0000-0000-000000000001",
      status: "active",
      current_step: 0,
      next_send_at: "2026-07-27T09:07:00.000Z",
      last_sent_at: "2026-07-23T08:17:00.000Z",
      stopped_at: null,
      stop_reason: null,
      personalization_snapshot: { verified: true },
      created_at: previewCampaign.created_at,
      updated_at: previewCampaign.updated_at,
      contactName: "Lina Martin",
      contactEmail: "lina.martin@studio-huit.example",
      companyName: "Studio Huit Communication",
    };
    const message: CampaignMessageDetail = {
      id: "75000000-0000-0000-0000-000000000001",
      organization_id: previewCampaign.organization_id,
      thread_id: null,
      campaign_id: previewCampaign.id,
      enrollment_id: enrollment.id,
      sequence_step_id: previewSteps[0]!.id,
      provider_message_id: "mock_message_preview",
      deduplication_key: "preview-first",
      direction: "outbound",
      sender: { email: previewMailbox.email_address },
      recipients: [{ email: enrollment.contactEmail }],
      cc: [],
      bcc: [],
      subject: "Afterwork 20 à 50 personnes pour votre équipe",
      body_text:
        "Bonjour Lina,\n\nVotre agence est située à Paris. Je vous contacte avec une proposition simple : un afterwork chez Little Room.\n\nSouhaitez-vous recevoir les grandes lignes ?\n\nSi ce sujet n’est pas pertinent, dites-le-moi et je ne vous recontacterai pas.",
      body_html: "<p>Bonjour Lina,</p><p>Une proposition simple et vérifiée.</p>",
      variant_label: "Directe",
      personalization_facts: [
        { fact: "Entreprise située à Paris", source_reference: "source-preview" },
      ],
      risk_flags: [],
      scheduled_at: "2026-07-23T08:17:00.000Z",
      sent_at: "2026-07-23T08:17:00.000Z",
      received_at: null,
      status: "sent_mock",
      approved_by: previewMailbox.user_id,
      approved_at: "2026-07-23T08:10:00.000Z",
      error_code: null,
      error_message: null,
      classification: null,
      ai_summary: null,
      headers: { mock: true },
      created_at: previewCampaign.created_at,
      updated_at: previewCampaign.updated_at,
      contactName: enrollment.contactName,
      stepPosition: 0,
    };
    return {
      ...previewCampaign,
      mailbox: previewMailbox,
      venueName: "Little Room",
      offerName: "Afterwork 20 à 50 personnes",
      steps: previewSteps,
      enrollments: [enrollment],
      messages: [message],
      latestGeneration: null,
    };
  }
  if (context.isPreview) return null;

  const supabase = await createSupabaseServerClient();
  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("organization_id", context.organization.id)
    .eq("id", campaignId)
    .maybeSingle();
  if (error) throw new Error("Impossible de charger cette campagne.");
  if (!campaign) return null;

  const [mailboxResult, stepsResult, enrollmentsResult, messagesResult, generationResult] =
    await Promise.all([
      supabase
        .from("mailboxes")
        .select("*")
        .eq("organization_id", context.organization.id)
        .eq("id", campaign.mailbox_id)
        .single(),
      supabase
        .from("sequence_steps")
        .select("*")
        .eq("organization_id", context.organization.id)
        .eq("campaign_id", campaign.id)
        .order("position"),
      supabase
        .from("campaign_enrollments")
        .select("*")
        .eq("organization_id", context.organization.id)
        .eq("campaign_id", campaign.id)
        .order("created_at"),
      supabase
        .from("messages")
        .select("*")
        .eq("organization_id", context.organization.id)
        .eq("campaign_id", campaign.id)
        .order("created_at"),
      supabase
        .from("ai_runs")
        .select("output")
        .eq("organization_id", context.organization.id)
        .eq("entity_type", "campaign")
        .eq("entity_id", campaign.id)
        .eq("run_type", "campaign_email_generation")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
  if (
    mailboxResult.error ||
    stepsResult.error ||
    enrollmentsResult.error ||
    messagesResult.error ||
    generationResult.error
  ) {
    throw new Error("Impossible de charger le détail opérationnel de cette campagne.");
  }

  const enrollments = enrollmentsResult.data ?? [];
  const contactIds = Array.from(new Set(enrollments.map((row) => row.contact_id)));
  const companyIds = Array.from(new Set(enrollments.map((row) => row.company_id)));
  const [contactsResult, companiesResult, venueResult, offerResult] = await Promise.all([
    contactIds.length
      ? supabase.from("contacts").select("id, full_name, email").in("id", contactIds)
      : Promise.resolve({ data: [], error: null }),
    companyIds.length
      ? supabase.from("companies").select("id, trade_name, legal_name").in("id", companyIds)
      : Promise.resolve({ data: [], error: null }),
    campaign.venue_id
      ? supabase.from("venues").select("name").eq("id", campaign.venue_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    campaign.offer_id
      ? supabase.from("venue_offers").select("name").eq("id", campaign.offer_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (contactsResult.error || companiesResult.error || venueResult.error || offerResult.error) {
    throw new Error("Impossible de résoudre les destinataires de la campagne.");
  }
  const contacts = new Map((contactsResult.data ?? []).map((row) => [row.id, row]));
  const companies = new Map((companiesResult.data ?? []).map((row) => [row.id, row]));
  const stepPositions = new Map((stepsResult.data ?? []).map((row) => [row.id, row.position]));
  const enrollmentById = new Map(enrollments.map((row) => [row.id, row]));

  return {
    ...campaign,
    mailbox: mailboxResult.data,
    venueName: venueResult.data?.name ?? null,
    offerName: offerResult.data?.name ?? null,
    steps: stepsResult.data ?? [],
    enrollments: enrollments.map((row: CampaignEnrollmentRow) => {
      const contact = contacts.get(row.contact_id);
      const company = companies.get(row.company_id);
      return {
        ...row,
        contactName: contact?.full_name ?? "Contact indisponible",
        contactEmail: contact?.email ?? null,
        companyName: company?.trade_name ?? company?.legal_name ?? "Entreprise indisponible",
      };
    }),
    messages: (messagesResult.data ?? []).map((row: MessageRow) => {
      const enrollment = row.enrollment_id ? enrollmentById.get(row.enrollment_id) : null;
      const contact = enrollment ? contacts.get(enrollment.contact_id) : null;
      return {
        ...row,
        contactName: contact?.full_name ?? "Contact indisponible",
        stepPosition: row.sequence_step_id ? (stepPositions.get(row.sequence_step_id) ?? 0) : 0,
      };
    }),
    latestGeneration:
      emailGenerationOutputSchema.safeParse(generationResult.data?.output).data ?? null,
  };
}

export async function getCampaignFormOptions(context: AppAuthContext) {
  if (context.isPreview) {
    return {
      mailboxes: [previewMailbox],
      venues: [{ id: previewCampaign.venue_id!, name: "Little Room" }],
      offers: [
        {
          id: previewCampaign.offer_id!,
          venue_id: previewCampaign.venue_id!,
          name: "Afterwork 20 à 50 personnes",
        },
      ],
      contacts: [],
    };
  }
  const supabase = await createSupabaseServerClient();
  const [mailboxes, venues, offers, contacts] = await Promise.all([
    supabase
      .from("mailboxes")
      .select("*")
      .eq("organization_id", context.organization.id)
      .eq("status", "connected")
      .order("display_name"),
    supabase
      .from("venues")
      .select("id, name")
      .eq("organization_id", context.organization.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("venue_offers")
      .select("id, venue_id, name")
      .eq("organization_id", context.organization.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("contacts")
      .select("id, full_name, email, company_id, email_status, do_not_contact")
      .eq("organization_id", context.organization.id)
      .eq("email_status", "valid")
      .eq("do_not_contact", false)
      .is("deleted_at", null)
      .order("full_name"),
  ]);
  if (mailboxes.error || venues.error || offers.error || contacts.error) {
    throw new Error("Impossible de charger les options de campagne.");
  }
  return {
    mailboxes: mailboxes.data ?? [],
    venues: venues.data ?? [],
    offers: offers.data ?? [],
    contacts: contacts.data ?? [],
  };
}
