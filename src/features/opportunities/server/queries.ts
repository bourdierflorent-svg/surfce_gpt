import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppAuthContext } from "@/types/auth";
import type {
  ActivityRow,
  AppointmentRow,
  OpportunityRow,
  OpportunityStageRow,
  ProposalRow,
  TaskRow,
} from "@/types/database";

import type {
  OpportunityDetail,
  OpportunityFormOptions,
  OpportunityListItem,
  PipelineSummary,
} from "../types";

const previewOrganizationId = "10000000-0000-0000-0000-000000000001";
const previewOwnerId = "00000000-0000-0000-0000-000000000000";

const previewStages: OpportunityStageRow[] = [
  ["target_detected", "Cible détectée", 10, 5, "open", "slate"],
  ["company_enriched", "Entreprise enrichie", 20, 10, "open", "sky"],
  ["prospect_qualified", "Prospect qualifié", 30, 20, "open", "blue"],
  ["contacted", "Contacté", 40, 30, "open", "indigo"],
  ["engaged", "Engagé", 50, 45, "open", "violet"],
  ["appointment", "Rendez-vous", 60, 60, "open", "amber"],
  ["proposal_sent", "Proposition envoyée", 70, 70, "open", "orange"],
  ["negotiation", "Négociation", 80, 85, "open", "rose"],
  ["event_confirmed", "Événement confirmé", 90, 95, "won", "emerald"],
  ["won", "Gagné", 100, 100, "won", "green"],
  ["lost", "Perdu", 110, 0, "lost", "stone"],
].map(([key, label, position, probability, category, color], index) => ({
  id: `81000000-0000-0000-0000-0000000000${String(index + 1).padStart(2, "0")}`,
  organization_id: previewOrganizationId,
  key: String(key),
  label: String(label),
  position: Number(position),
  default_probability: Number(probability),
  category: category as OpportunityStageRow["category"],
  color: String(color),
  is_active: true,
  created_at: "2026-07-23T09:00:00.000Z",
  updated_at: "2026-07-23T09:00:00.000Z",
}));

function previewStageId(key: string) {
  return previewStages.find((stage) => stage.key === key)!.id;
}

const previewOpportunityRows: Array<
  OpportunityRow & {
    companyName: string;
    contactName: string;
    venueName: string;
    stageKey: string;
  }
> = [
  {
    id: "82000000-0000-0000-0000-000000000001",
    organization_id: previewOrganizationId,
    company_id: "50000000-0000-0000-0000-000000000001",
    primary_contact_id: "70000000-0000-0000-0000-000000000001",
    venue_id: "30000000-0000-0000-0000-000000000001",
    offer_id: "40000000-0000-0000-0000-000000000001",
    campaign_id: "72000000-0000-0000-0000-000000000001",
    owner_id: previewOwnerId,
    stage_id: previewStageId("engaged"),
    title: "Afterwork Studio Huit · 45 personnes",
    probability: 45,
    estimated_amount: 6800,
    proposed_amount: null,
    signed_amount: null,
    currency: "EUR",
    estimated_guests: 45,
    event_type: "Afterwork",
    desired_event_date: "2026-09-18",
    expected_close_date: "2026-08-07",
    source: "inbox",
    objections: [],
    next_action: "Qualifier le format et les horaires",
    next_action_at: "2026-07-24T08:30:00.000Z",
    loss_reason: null,
    notes: "Signal positif issu de la conversation Lina Martin.",
    last_activity_at: "2026-07-23T10:20:00.000Z",
    won_at: null,
    lost_at: null,
    created_at: "2026-07-23T10:20:00.000Z",
    updated_at: "2026-07-23T10:20:00.000Z",
    companyName: "Studio Huit Communication",
    contactName: "Lina Martin",
    venueName: "Little Room",
    stageKey: "engaged",
  },
  {
    id: "82000000-0000-0000-0000-000000000002",
    organization_id: previewOrganizationId,
    company_id: "50000000-0000-0000-0000-000000000002",
    primary_contact_id: "70000000-0000-0000-0000-000000000009",
    venue_id: "30000000-0000-0000-0000-000000000004",
    offer_id: "40000000-0000-0000-0000-000000000004",
    campaign_id: "72000000-0000-0000-0000-000000000002",
    owner_id: previewOwnerId,
    stage_id: previewStageId("appointment"),
    title: "Séminaire Rive Conseil · direction",
    probability: 60,
    estimated_amount: 12400,
    proposed_amount: null,
    signed_amount: null,
    currency: "EUR",
    estimated_guests: 72,
    event_type: "Séminaire",
    desired_event_date: "2026-10-08",
    expected_close_date: "2026-08-21",
    source: "inbox",
    objections: ["Accès transports à confirmer"],
    next_action: "Préparer le rendez-vous découverte",
    next_action_at: "2026-07-23T15:00:00.000Z",
    loss_reason: null,
    notes: null,
    last_activity_at: "2026-07-22T14:00:00.000Z",
    won_at: null,
    lost_at: null,
    created_at: "2026-07-21T09:00:00.000Z",
    updated_at: "2026-07-22T14:00:00.000Z",
    companyName: "Rive Conseil",
    contactName: "Alix Girard",
    venueName: "Atelier des Quais",
    stageKey: "appointment",
  },
  {
    id: "82000000-0000-0000-0000-000000000003",
    organization_id: previewOrganizationId,
    company_id: "50000000-0000-0000-0000-000000000001",
    primary_contact_id: "70000000-0000-0000-0000-000000000003",
    venue_id: "30000000-0000-0000-0000-000000000002",
    offer_id: "40000000-0000-0000-0000-000000000002",
    campaign_id: null,
    owner_id: previewOwnerId,
    stage_id: previewStageId("proposal_sent"),
    title: "Cocktail presse · lancement produit",
    probability: 70,
    estimated_amount: 9800,
    proposed_amount: 10400,
    signed_amount: null,
    currency: "EUR",
    estimated_guests: 90,
    event_type: "Cocktail",
    desired_event_date: "2026-09-29",
    expected_close_date: "2026-07-31",
    source: "manual",
    objections: ["Budget décoration"],
    next_action: "Relancer la proposition v2",
    next_action_at: "2026-07-25T09:00:00.000Z",
    loss_reason: null,
    notes: null,
    last_activity_at: "2026-07-22T08:45:00.000Z",
    won_at: null,
    lost_at: null,
    created_at: "2026-07-15T09:00:00.000Z",
    updated_at: "2026-07-22T08:45:00.000Z",
    companyName: "Studio Huit Communication",
    contactName: "Inès Robert",
    venueName: "Rooftop République",
    stageKey: "proposal_sent",
  },
  {
    id: "82000000-0000-0000-0000-000000000004",
    organization_id: previewOrganizationId,
    company_id: "50000000-0000-0000-0000-000000000002",
    primary_contact_id: "70000000-0000-0000-0000-000000000012",
    venue_id: "30000000-0000-0000-0000-000000000003",
    offer_id: "40000000-0000-0000-0000-000000000003",
    campaign_id: null,
    owner_id: previewOwnerId,
    stage_id: previewStageId("negotiation"),
    title: "Dîner partenaires Rive Conseil",
    probability: 85,
    estimated_amount: 15600,
    proposed_amount: 14900,
    signed_amount: null,
    currency: "EUR",
    estimated_guests: 38,
    event_type: "Dîner",
    desired_event_date: "2026-11-12",
    expected_close_date: "2026-08-14",
    source: "referral",
    objections: ["Privatisation totale demandée"],
    next_action: "Valider la clause d’exclusivité",
    next_action_at: "2026-07-28T10:00:00.000Z",
    loss_reason: null,
    notes: null,
    last_activity_at: "2026-07-20T17:20:00.000Z",
    won_at: null,
    lost_at: null,
    created_at: "2026-07-08T10:00:00.000Z",
    updated_at: "2026-07-20T17:20:00.000Z",
    companyName: "Rive Conseil",
    contactName: "Jade Lambert",
    venueName: "Maison Bastille",
    stageKey: "negotiation",
  },
  {
    id: "82000000-0000-0000-0000-000000000005",
    organization_id: previewOrganizationId,
    company_id: "50000000-0000-0000-0000-000000000001",
    primary_contact_id: "70000000-0000-0000-0000-000000000006",
    venue_id: "30000000-0000-0000-0000-000000000001",
    offer_id: "40000000-0000-0000-0000-000000000001",
    campaign_id: null,
    owner_id: previewOwnerId,
    stage_id: previewStageId("won"),
    title: "Soirée partenaires · rentrée",
    probability: 100,
    estimated_amount: 7200,
    proposed_amount: 7600,
    signed_amount: 7600,
    currency: "EUR",
    estimated_guests: 55,
    event_type: "Soirée",
    desired_event_date: "2026-09-03",
    expected_close_date: "2026-07-18",
    source: "manual",
    objections: [],
    next_action: "Transmettre le dossier de production",
    next_action_at: "2026-07-27T09:00:00.000Z",
    loss_reason: null,
    notes: "Donnée fictive de démonstration.",
    last_activity_at: "2026-07-18T16:00:00.000Z",
    won_at: "2026-07-18T16:00:00.000Z",
    lost_at: null,
    created_at: "2026-06-30T09:00:00.000Z",
    updated_at: "2026-07-18T16:00:00.000Z",
    companyName: "Studio Huit Communication",
    contactName: "Sacha Leroy",
    venueName: "Little Room",
    stageKey: "won",
  },
];

function previewList(): OpportunityListItem[] {
  return previewOpportunityRows.map((row, index) => {
    const stage = previewStages.find((item) => item.key === row.stageKey)!;
    return {
      ...row,
      stage,
      ownerName: "Florent Bourdier",
      openTaskCount: index < 4 ? 1 : 0,
      overdueTaskCount: index === 1 ? 1 : 0,
    };
  });
}

function amountBasis(opportunity: OpportunityRow) {
  return (
    opportunity.signed_amount ?? opportunity.proposed_amount ?? opportunity.estimated_amount ?? 0
  );
}

export function summarizePipeline(items: OpportunityListItem[]): PipelineSummary {
  return items.reduce<PipelineSummary>(
    (summary, item) => {
      const amount = amountBasis(item);
      if (item.stage.category === "open") {
        summary.openAmount += amount;
        summary.weightedAmount += amount * (item.probability / 100);
      }
      if (item.stage.category === "won") {
        summary.wonAmount += item.signed_amount ?? amount;
      }
      summary.overdueActions += item.overdueTaskCount;
      return summary;
    },
    { openAmount: 0, weightedAmount: 0, wonAmount: 0, overdueActions: 0 },
  );
}

export async function listOpportunityStages(
  context: AppAuthContext,
): Promise<OpportunityStageRow[]> {
  if (context.isPreview) return previewStages;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("opportunity_stages")
    .select("*")
    .eq("organization_id", context.organization.id)
    .order("position");
  if (error) throw new Error("Impossible de charger les étapes du pipeline.");
  return data ?? [];
}

export async function listOpportunities(
  context: AppAuthContext,
  filters: { query?: string; ownerId?: string; stageId?: string } = {},
): Promise<OpportunityListItem[]> {
  if (context.isPreview) {
    const normalized = filters.query?.toLocaleLowerCase("fr") ?? "";
    return previewList().filter(
      (item) =>
        (!filters.ownerId || item.owner_id === filters.ownerId) &&
        (!filters.stageId || item.stage_id === filters.stageId) &&
        (!normalized ||
          `${item.title} ${item.companyName} ${item.contactName ?? ""}`
            .toLocaleLowerCase("fr")
            .includes(normalized)),
    );
  }

  const supabase = await createSupabaseServerClient();
  let request = supabase
    .from("opportunities")
    .select("*")
    .eq("organization_id", context.organization.id)
    .order("updated_at", { ascending: false })
    .limit(300);
  if (filters.ownerId) request = request.eq("owner_id", filters.ownerId);
  if (filters.stageId) request = request.eq("stage_id", filters.stageId);
  const { data: opportunities, error } = await request;
  if (error) throw new Error("Impossible de charger les opportunités.");

  const rows = opportunities ?? [];
  const stageIds = Array.from(new Set(rows.map((row) => row.stage_id)));
  const companyIds = Array.from(new Set(rows.map((row) => row.company_id)));
  const contactIds = Array.from(
    new Set(rows.map((row) => row.primary_contact_id).filter((id): id is string => Boolean(id))),
  );
  const venueIds = Array.from(
    new Set(rows.map((row) => row.venue_id).filter((id): id is string => Boolean(id))),
  );
  const ownerIds = Array.from(new Set(rows.map((row) => row.owner_id)));
  const opportunityIds = rows.map((row) => row.id);

  const [stages, companies, contacts, venues, owners, tasks] = await Promise.all([
    stageIds.length
      ? supabase.from("opportunity_stages").select("*").in("id", stageIds)
      : Promise.resolve({ data: [], error: null }),
    companyIds.length
      ? supabase.from("companies").select("id, legal_name, trade_name").in("id", companyIds)
      : Promise.resolve({ data: [], error: null }),
    contactIds.length
      ? supabase.from("contacts").select("id, full_name").in("id", contactIds)
      : Promise.resolve({ data: [], error: null }),
    venueIds.length
      ? supabase.from("venues").select("id, name").in("id", venueIds)
      : Promise.resolve({ data: [], error: null }),
    ownerIds.length
      ? supabase.from("profiles").select("id, full_name, email").in("id", ownerIds)
      : Promise.resolve({ data: [], error: null }),
    opportunityIds.length
      ? supabase
          .from("tasks")
          .select("opportunity_id, status, due_at")
          .in("opportunity_id", opportunityIds)
          .in("status", ["todo", "in_progress"])
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (
    stages.error ||
    companies.error ||
    contacts.error ||
    venues.error ||
    owners.error ||
    tasks.error
  ) {
    throw new Error("Impossible de résoudre les correspondances du pipeline.");
  }

  const stageMap = new Map((stages.data ?? []).map((row) => [row.id, row]));
  const companyMap = new Map(
    (companies.data ?? []).map((row) => [row.id, row.trade_name ?? row.legal_name]),
  );
  const contactMap = new Map((contacts.data ?? []).map((row) => [row.id, row.full_name]));
  const venueMap = new Map((venues.data ?? []).map((row) => [row.id, row.name]));
  const ownerMap = new Map((owners.data ?? []).map((row) => [row.id, row.full_name ?? row.email]));
  const taskCounts = new Map<string, { open: number; overdue: number }>();
  const now = Date.now();
  for (const task of tasks.data ?? []) {
    if (!task.opportunity_id) continue;
    const counts = taskCounts.get(task.opportunity_id) ?? { open: 0, overdue: 0 };
    counts.open += 1;
    if (task.due_at && new Date(task.due_at).getTime() < now) counts.overdue += 1;
    taskCounts.set(task.opportunity_id, counts);
  }

  const normalized = filters.query?.toLocaleLowerCase("fr") ?? "";
  return rows
    .map((row) => ({
      ...row,
      stage: stageMap.get(row.stage_id)!,
      companyName: companyMap.get(row.company_id) ?? "Entreprise indisponible",
      contactName: row.primary_contact_id ? (contactMap.get(row.primary_contact_id) ?? null) : null,
      venueName: row.venue_id ? (venueMap.get(row.venue_id) ?? null) : null,
      ownerName: ownerMap.get(row.owner_id) ?? "Commercial indisponible",
      openTaskCount: taskCounts.get(row.id)?.open ?? 0,
      overdueTaskCount: taskCounts.get(row.id)?.overdue ?? 0,
    }))
    .filter(
      (row) =>
        row.stage &&
        (!normalized ||
          `${row.title} ${row.companyName} ${row.contactName ?? ""}`
            .toLocaleLowerCase("fr")
            .includes(normalized)),
    );
}

export async function getOpportunityDetail(
  context: AppAuthContext,
  opportunityId: string,
): Promise<OpportunityDetail | null> {
  if (context.isPreview) {
    const item = previewList().find((row) => row.id === opportunityId);
    if (!item) return null;
    const task: TaskRow = {
      id: "83000000-0000-0000-0000-000000000001",
      organization_id: previewOrganizationId,
      company_id: item.company_id,
      contact_id: item.primary_contact_id,
      opportunity_id: item.id,
      assigned_to: previewOwnerId,
      created_by: previewOwnerId,
      title: item.next_action ?? "Qualifier le besoin",
      description: null,
      priority: item.overdueTaskCount ? "high" : "normal",
      status: "todo",
      due_at: item.next_action_at,
      completed_at: null,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
    const activities: ActivityRow[] = [
      {
        id: "84000000-0000-0000-0000-000000000001",
        organization_id: previewOrganizationId,
        company_id: item.company_id,
        contact_id: item.primary_contact_id,
        opportunity_id: item.id,
        user_id: previewOwnerId,
        activity_type: "opportunity_created",
        title: "Opportunité créée",
        description:
          item.source === "inbox" ? "Créée depuis une réponse qualifiée." : "Création manuelle.",
        occurred_at: item.created_at,
        metadata: { preview: true },
        created_at: item.created_at,
      },
    ];
    const appointment: AppointmentRow[] =
      item.stage.key === "appointment"
        ? [
            {
              id: "85000000-0000-0000-0000-000000000001",
              organization_id: previewOrganizationId,
              company_id: item.company_id,
              contact_id: item.primary_contact_id,
              opportunity_id: item.id,
              owner_id: previewOwnerId,
              title: "Rendez-vous découverte",
              description: "Valider le format, la jauge et le budget.",
              starts_at: "2026-07-24T13:00:00.000Z",
              ends_at: "2026-07-24T13:45:00.000Z",
              location: "Visioconférence",
              external_calendar_id: null,
              status: "planned",
              created_at: item.updated_at,
              updated_at: item.updated_at,
            },
          ]
        : [];
    const proposal: ProposalRow[] = item.proposed_amount
      ? [
          {
            id: "86000000-0000-0000-0000-000000000001",
            organization_id: previewOrganizationId,
            opportunity_id: item.id,
            venue_id: item.venue_id,
            offer_id: item.offer_id,
            version: 1,
            status: item.stage.key === "won" ? "accepted" : "sent",
            amount: item.proposed_amount,
            currency: item.currency,
            guest_count: item.estimated_guests,
            event_date: item.desired_event_date,
            content: { summary: "Proposition fictive SURFCE", inclusions: ["Privatisation"] },
            storage_path: null,
            sent_at: item.updated_at,
            accepted_at: item.stage.key === "won" ? item.won_at : null,
            rejected_at: null,
            created_by: previewOwnerId,
            created_at: item.updated_at,
            updated_at: item.updated_at,
          },
        ]
      : [];
    return {
      ...item,
      activities,
      tasks: [task],
      appointments: appointment,
      proposals: proposal,
      campaignName: item.campaign_id ? "Afterwork agences parisiennes" : null,
      offerName: item.offer_id ? "Offre événementielle fictive" : null,
      sourceThreadId: item.source === "inbox" ? "75000000-0000-0000-0000-000000000001" : null,
    };
  }

  const items = await listOpportunities(context);
  const item = items.find((row) => row.id === opportunityId);
  if (!item) return null;
  const supabase = await createSupabaseServerClient();
  const [activities, tasks, appointments, proposals, campaign, offer, thread] = await Promise.all([
    supabase
      .from("activities")
      .select("*")
      .eq("organization_id", context.organization.id)
      .eq("opportunity_id", opportunityId)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("*")
      .eq("organization_id", context.organization.id)
      .eq("opportunity_id", opportunityId)
      .order("due_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("appointments")
      .select("*")
      .eq("organization_id", context.organization.id)
      .eq("opportunity_id", opportunityId)
      .order("starts_at", { ascending: false }),
    supabase
      .from("proposals")
      .select("*")
      .eq("organization_id", context.organization.id)
      .eq("opportunity_id", opportunityId)
      .order("version", { ascending: false }),
    item.campaign_id
      ? supabase.from("campaigns").select("name").eq("id", item.campaign_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    item.offer_id
      ? supabase.from("venue_offers").select("name").eq("id", item.offer_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("mail_threads")
      .select("id")
      .eq("organization_id", context.organization.id)
      .eq("opportunity_id", opportunityId)
      .maybeSingle(),
  ]);
  if (
    activities.error ||
    tasks.error ||
    appointments.error ||
    proposals.error ||
    campaign.error ||
    offer.error ||
    thread.error
  ) {
    throw new Error("Impossible de charger le dossier d’opportunité.");
  }
  return {
    ...item,
    activities: activities.data ?? [],
    tasks: tasks.data ?? [],
    appointments: appointments.data ?? [],
    proposals: proposals.data ?? [],
    campaignName: campaign.data?.name ?? null,
    offerName: offer.data?.name ?? null,
    sourceThreadId: thread.data?.id ?? null,
  };
}

export async function getOpportunityFormOptions(
  context: AppAuthContext,
): Promise<OpportunityFormOptions> {
  if (context.isPreview) {
    return {
      stages: previewStages,
      companies: [
        {
          id: "50000000-0000-0000-0000-000000000001",
          name: "Studio Huit Communication",
          assigned_to: previewOwnerId,
        },
        {
          id: "50000000-0000-0000-0000-000000000002",
          name: "Rive Conseil",
          assigned_to: previewOwnerId,
        },
      ],
      contacts: [
        {
          id: "70000000-0000-0000-0000-000000000001",
          company_id: "50000000-0000-0000-0000-000000000001",
          full_name: "Lina Martin",
        },
        {
          id: "70000000-0000-0000-0000-000000000009",
          company_id: "50000000-0000-0000-0000-000000000002",
          full_name: "Alix Girard",
        },
      ],
      venues: [
        { id: "30000000-0000-0000-0000-000000000001", name: "Little Room" },
        { id: "30000000-0000-0000-0000-000000000004", name: "Atelier des Quais" },
      ],
      offers: [
        {
          id: "40000000-0000-0000-0000-000000000001",
          venue_id: "30000000-0000-0000-0000-000000000001",
          name: "Afterwork 20 à 50 personnes",
        },
      ],
      campaigns: [
        { id: "72000000-0000-0000-0000-000000000001", name: "Afterwork agences parisiennes" },
      ],
      owners: [{ id: previewOwnerId, name: "Florent Bourdier" }],
    };
  }

  const supabase = await createSupabaseServerClient();
  const [stages, companies, contacts, venues, offers, campaigns, memberships] = await Promise.all([
    supabase
      .from("opportunity_stages")
      .select("*")
      .eq("organization_id", context.organization.id)
      .eq("is_active", true)
      .order("position"),
    supabase
      .from("companies")
      .select("id, legal_name, trade_name, assigned_to")
      .eq("organization_id", context.organization.id)
      .is("deleted_at", null)
      .order("legal_name"),
    supabase
      .from("contacts")
      .select("id, company_id, full_name")
      .eq("organization_id", context.organization.id)
      .is("deleted_at", null)
      .order("full_name"),
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
      .from("campaigns")
      .select("id, name")
      .eq("organization_id", context.organization.id)
      .order("name"),
    supabase
      .from("memberships")
      .select("user_id")
      .eq("organization_id", context.organization.id)
      .eq("is_active", true)
      .in("role", ["admin", "sales_manager", "sales"]),
  ]);
  if (
    stages.error ||
    companies.error ||
    contacts.error ||
    venues.error ||
    offers.error ||
    campaigns.error ||
    memberships.error
  ) {
    throw new Error("Impossible de charger les options du dossier commercial.");
  }
  const ownerIds = (memberships.data ?? []).map((row) => row.user_id);
  const { data: profiles, error: profilesError } = ownerIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", ownerIds)
    : { data: [], error: null };
  if (profilesError) throw new Error("Impossible de charger les commerciaux.");

  return {
    stages: stages.data ?? [],
    companies: (companies.data ?? []).map((row) => ({
      id: row.id,
      name: row.trade_name ?? row.legal_name,
      assigned_to: row.assigned_to,
    })),
    contacts: contacts.data ?? [],
    venues: venues.data ?? [],
    offers: offers.data ?? [],
    campaigns: campaigns.data ?? [],
    owners: (profiles ?? []).map((row) => ({
      id: row.id,
      name: row.full_name ?? row.email,
    })),
  };
}
