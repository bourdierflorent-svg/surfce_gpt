import type {
  AppointmentRow,
  CampaignEnrollmentRow,
  CampaignRow,
  CompanyRow,
  ContactRow,
  MailThreadRow,
  MailboxRow,
  MessageRow,
  OpportunityRow,
  OpportunityStageRow,
  ProposalRow,
  ProviderJobRow,
  TaskRow,
} from "@/types/database";

import type { AnalyticsFilters } from "./schemas";
import type { AnalyticsMetric, AnalyticsOption, AnalyticsReport, BreakdownRow } from "./types";

interface NamedEntity {
  id: string;
  name: string;
}

interface NamedProfile {
  id: string;
  full_name: string | null;
  email: string;
}

export interface AnalyticsDataset {
  companies: CompanyRow[];
  contacts: ContactRow[];
  campaigns: CampaignRow[];
  enrollments: CampaignEnrollmentRow[];
  threads: MailThreadRow[];
  messages: MessageRow[];
  opportunities: OpportunityRow[];
  stages: OpportunityStageRow[];
  appointments: AppointmentRow[];
  proposals: ProposalRow[];
  providerJobs: ProviderJobRow[];
  tasks: TaskRow[];
  mailboxes: MailboxRow[];
  profiles: NamedProfile[];
  venues: NamedEntity[];
  offers: NamedEntity[];
}

function asTime(value: string | null | undefined) {
  return value ? new Date(value).getTime() : Number.NaN;
}

function inPeriod(value: string | null | undefined, start: number, end: number) {
  const time = asTime(value);
  return Number.isFinite(time) && time >= start && time <= end;
}

function optionRows(values: Array<[string | null | undefined, string | null | undefined]>) {
  return [
    ...new Map(
      values.filter(([value]) => value).map(([value, label]) => [value!, label || value!]),
    ),
  ]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

function groupRows(
  items: OpportunityRow[],
  key: (item: OpportunityRow) => string | null,
  labels: Map<string, string>,
): BreakdownRow[] {
  const groups = new Map<string, BreakdownRow>();
  for (const item of items) {
    const groupKey = key(item) ?? "non-renseigne";
    const current = groups.get(groupKey) ?? {
      key: groupKey,
      label: labels.get(groupKey) ?? "Non renseigné",
      count: 0,
      amount: 0,
    };
    current.count += 1;
    current.amount += item.signed_amount ?? item.proposed_amount ?? item.estimated_amount ?? 0;
    groups.set(groupKey, current);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || b.amount - a.amount);
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function metric(
  key: string,
  label: string,
  value: number,
  unit: AnalyticsMetric["unit"],
  definition: string,
  source: string,
): AnalyticsMetric {
  return { key, label, value, unit, definition, source };
}

export function buildAnalyticsReport(
  dataset: AnalyticsDataset,
  filters: AnalyticsFilters,
  isPreview = false,
): AnalyticsReport {
  const start = new Date(`${filters.start}T00:00:00.000Z`).getTime();
  const end = new Date(`${filters.end}T23:59:59.999Z`).getTime();
  const stageById = new Map(dataset.stages.map((stage) => [stage.id, stage]));
  const threadById = new Map(dataset.threads.map((thread) => [thread.id, thread]));
  const enrollmentById = new Map(dataset.enrollments.map((item) => [item.id, item]));

  const companyDimensionScope = dataset.companies.filter(
    (company) =>
      (!filters.sector || company.sector === filters.sector) &&
      (!filters.zone || company.city === filters.zone || company.district === filters.zone) &&
      (!filters.companySize || company.employee_range === filters.companySize) &&
      (!filters.companyStatus || company.status === filters.companyStatus),
  );
  const dimensionCompanyIds = new Set(companyDimensionScope.map((company) => company.id));

  const directOpportunities = dataset.opportunities.filter(
    (item) =>
      dimensionCompanyIds.has(item.company_id) &&
      (!filters.stage || item.stage_id === filters.stage) &&
      (!filters.venue || item.venue_id === filters.venue) &&
      (!filters.offer || item.offer_id === filters.offer) &&
      (!filters.source || item.source === filters.source) &&
      (!filters.campaign || item.campaign_id === filters.campaign) &&
      (!filters.owner || item.owner_id === filters.owner),
  );

  const hasOpportunityFilter = Boolean(
    filters.stage ||
    filters.venue ||
    filters.offer ||
    filters.source ||
    filters.campaign ||
    filters.owner,
  );
  const enrollmentCompanyIds = new Set(
    dataset.enrollments
      .filter((item) => !filters.campaign || item.campaign_id === filters.campaign)
      .map((item) => item.company_id),
  );
  const opportunityCompanyIds = new Set(directOpportunities.map((item) => item.company_id));
  const scopedCompanies = companyDimensionScope.filter(
    (company) =>
      !hasOpportunityFilter ||
      opportunityCompanyIds.has(company.id) ||
      (filters.campaign ? enrollmentCompanyIds.has(company.id) : false) ||
      (filters.owner ? company.assigned_to === filters.owner : false),
  );
  const companyIds = new Set(scopedCompanies.map((company) => company.id));
  const scopedContactIds = new Set(
    dataset.contacts.filter((item) => companyIds.has(item.company_id)).map((item) => item.id),
  );

  const opportunities = directOpportunities.filter(
    (item) => companyIds.has(item.company_id) && inPeriod(item.created_at, start, end),
  );
  const contacts = dataset.contacts.filter(
    (item) => companyIds.has(item.company_id) && inPeriod(item.created_at, start, end),
  );
  const messages = dataset.messages.filter((message) => {
    const thread = message.thread_id ? threadById.get(message.thread_id) : undefined;
    const enrollment = message.enrollment_id
      ? enrollmentById.get(message.enrollment_id)
      : undefined;
    const companyId = thread?.company_id ?? enrollment?.company_id;
    const campaignId = message.campaign_id ?? thread?.campaign_id ?? enrollment?.campaign_id;
    const eventAt = message.sent_at ?? message.received_at ?? message.created_at;
    return (
      Boolean(companyId && companyIds.has(companyId)) &&
      (!filters.campaign || campaignId === filters.campaign) &&
      inPeriod(eventAt, start, end)
    );
  });
  const outbound = messages.filter((message) => message.direction === "outbound");
  const delivered = outbound.filter((message) =>
    ["sent", "sent_mock", "delivered"].includes(message.status),
  );
  const replies = messages.filter((message) => message.direction === "inbound");
  const positiveReplies = replies.filter((message) =>
    ["positive", "interested", "appointment_request"].includes(message.classification ?? ""),
  );
  const appointments = dataset.appointments.filter(
    (item) =>
      Boolean(item.company_id && companyIds.has(item.company_id)) &&
      inPeriod(item.created_at, start, end),
  );
  const opportunityIds = new Set(opportunities.map((item) => item.id));
  const proposals = dataset.proposals.filter(
    (item) => opportunityIds.has(item.opportunity_id) && inPeriod(item.created_at, start, end),
  );
  const won = opportunities.filter((item) => stageById.get(item.stage_id)?.category === "won");
  const lost = opportunities.filter((item) => stageById.get(item.stage_id)?.category === "lost");
  const open = opportunities.filter((item) => stageById.get(item.stage_id)?.category === "open");
  const providerJobs = dataset.providerJobs.filter(
    (item) =>
      inPeriod(item.completed_at ?? item.created_at, start, end) &&
      (!item.entity_id || companyIds.has(item.entity_id) || scopedContactIds.has(item.entity_id)),
  );
  const enrichments = providerJobs.filter(
    (item) => item.status === "completed" && /enrich|contact|registry|website/.test(item.job_type),
  );

  const responseDelays: number[] = [];
  for (const reply of replies) {
    if (!reply.thread_id) continue;
    const replyAt = asTime(reply.received_at ?? reply.created_at);
    const previous = outbound
      .filter(
        (message) =>
          message.thread_id === reply.thread_id &&
          asTime(message.sent_at ?? message.created_at) <= replyAt,
      )
      .sort((a, b) => asTime(b.sent_at ?? b.created_at) - asTime(a.sent_at ?? a.created_at))[0];
    if (previous) {
      responseDelays.push((replyAt - asTime(previous.sent_at ?? previous.created_at)) / 3_600_000);
    }
  }
  const cycleDurations = [...won, ...lost]
    .map((item) => {
      const closedAt = item.won_at ?? item.lost_at ?? item.updated_at;
      return (asTime(closedAt) - asTime(item.created_at)) / 86_400_000;
    })
    .filter((value) => value >= 0);
  const revenue = won.reduce(
    (sum, item) => sum + (item.signed_amount ?? item.proposed_amount ?? item.estimated_amount ?? 0),
    0,
  );
  const weightedRevenue = open.reduce(
    (sum, item) => sum + (item.estimated_amount ?? 0) * (item.probability / 100),
    0,
  );
  const totalCost = providerJobs.reduce((sum, job) => sum + job.estimated_cost, 0);

  const metrics = [
    metric(
      "prospects",
      "Prospects",
      scopedCompanies.filter((item) => inPeriod(item.created_at, start, end)).length,
      "count",
      "Entreprises entrées dans le périmètre pendant la période.",
      "companies.created_at",
    ),
    metric(
      "enrichments",
      "Enrichissements",
      enrichments.length,
      "count",
      "Traitements d’enrichissement terminés.",
      "provider_jobs.status",
    ),
    metric(
      "contacts",
      "Contacts",
      contacts.length,
      "count",
      "Contacts créés pour les entreprises filtrées.",
      "contacts.created_at",
    ),
    metric(
      "messages",
      "Messages",
      outbound.length,
      "count",
      "Messages sortants créés.",
      "messages",
    ),
    metric(
      "delivered",
      "Délivrés",
      delivered.length,
      "count",
      "Messages sortants envoyés ou confirmés délivrés.",
      "messages.status",
    ),
    metric("replies", "Réponses", replies.length, "count", "Messages entrants reçus.", "messages"),
    metric(
      "positive_replies",
      "Réponses positives",
      positiveReplies.length,
      "count",
      "Réponses classées positives, intéressées ou demande de rendez-vous.",
      "messages.classification",
    ),
    metric(
      "appointments",
      "Rendez-vous",
      appointments.length,
      "count",
      "Rendez-vous créés.",
      "appointments.created_at",
    ),
    metric(
      "opportunities",
      "Opportunités",
      opportunities.length,
      "count",
      "Opportunités créées.",
      "opportunities.created_at",
    ),
    metric(
      "proposals",
      "Propositions",
      proposals.length,
      "count",
      "Propositions créées sur les opportunités de la période.",
      "proposals.created_at",
    ),
    metric(
      "won",
      "Gagnées",
      won.length,
      "count",
      "Opportunités en étape gagnée.",
      "opportunity_stages",
    ),
    metric(
      "lost",
      "Perdues",
      lost.length,
      "count",
      "Opportunités en étape perdue.",
      "opportunity_stages",
    ),
    metric(
      "revenue",
      "Revenu signé",
      revenue,
      "currency",
      "Montant signé des opportunités gagnées.",
      "opportunities",
    ),
    metric(
      "weighted_revenue",
      "Revenu pondéré",
      weightedRevenue,
      "currency",
      "Montant estimé des opportunités ouvertes multiplié par leur probabilité.",
      "opportunities",
    ),
    metric(
      "cost_per_opportunity",
      "Coût / opportunité",
      opportunities.length ? totalCost / opportunities.length : 0,
      "currency",
      "Coût estimé des traitements divisé par les opportunités créées.",
      "provider_jobs ÷ opportunities",
    ),
    metric(
      "avg_response_delay",
      "Délai de réponse",
      average(responseDelays),
      "hours",
      "Temps moyen entre le dernier message sortant et la réponse entrante.",
      "messages.sent_at → received_at",
    ),
    metric(
      "avg_cycle_duration",
      "Cycle moyen",
      average(cycleDurations),
      "days",
      "Temps moyen entre création et clôture gagnée ou perdue.",
      "opportunities.created_at → closed_at",
    ),
  ];

  const funnelValues: Array<[string, string, number]> = [
    [
      "prospects",
      "Prospects",
      scopedCompanies.filter((item) => inPeriod(item.created_at, start, end)).length,
    ],
    ["contacts", "Contacts", contacts.length],
    ["messages", "Messages", outbound.length],
    ["delivered", "Délivrés", delivered.length],
    ["replies", "Réponses", replies.length],
    ["positive", "Positives", positiveReplies.length],
    ["opportunities", "Opportunités", opportunities.length],
    ["appointments", "Rendez-vous", appointments.length],
    ["won", "Gagnées", won.length],
  ];
  const funnel = funnelValues.map(([key, label, value], index) => {
    const denominator = index ? (funnelValues[index - 1]?.[2] ?? null) : null;
    return {
      key,
      label,
      value,
      denominator,
      rate: denominator ? (value / denominator) * 100 : null,
    };
  });

  const stageLabels = new Map(dataset.stages.map((item) => [item.id, item.label]));
  const ownerLabels = new Map(
    dataset.profiles.map((item) => [item.id, item.full_name ?? item.email]),
  );
  const campaignLabels = new Map(dataset.campaigns.map((item) => [item.id, item.name]));
  const sourceLabels = new Map(
    [...new Set(dataset.opportunities.map((item) => item.source))].map((value) => [value, value]),
  );
  const names = (items: NamedEntity[]): AnalyticsOption[] =>
    optionRows(items.map((item) => [item.id, item.name]));

  return {
    filters,
    generatedAt: new Date().toISOString(),
    isPreview,
    metrics,
    funnel,
    breakdowns: {
      stages: groupRows(opportunities, (item) => item.stage_id, stageLabels),
      owners: groupRows(opportunities, (item) => item.owner_id, ownerLabels),
      sources: groupRows(opportunities, (item) => item.source, sourceLabels),
      campaigns: groupRows(opportunities, (item) => item.campaign_id, campaignLabels),
    },
    monitoring: {
      bounced: messages.filter((item) => item.status === "bounced").length,
      failed: messages.filter((item) => item.status === "failed").length,
      providerFailures: providerJobs.filter((item) => item.status === "failed").length,
      mailboxErrors: dataset.mailboxes.filter((item) => item.status === "error").length,
      overdueTasks: dataset.tasks.filter(
        (item) =>
          (!item.company_id || companyIds.has(item.company_id)) &&
          (!filters.owner || item.assigned_to === filters.owner) &&
          item.status !== "completed" &&
          item.status !== "cancelled" &&
          Boolean(item.due_at && asTime(item.due_at) < Date.now()),
      ).length,
    },
    options: {
      owners: optionRows(dataset.profiles.map((item) => [item.id, item.full_name ?? item.email])),
      campaigns: optionRows(dataset.campaigns.map((item) => [item.id, item.name])),
      sectors: optionRows(dataset.companies.map((item) => [item.sector, item.sector])),
      zones: optionRows(
        dataset.companies.flatMap((item) => [
          [item.city, item.city],
          [item.district, item.district],
        ]),
      ),
      venues: names(dataset.venues),
      offers: names(dataset.offers),
      sources: optionRows(dataset.opportunities.map((item) => [item.source, item.source])),
      companySizes: optionRows(
        dataset.companies.map((item) => [item.employee_range, item.employee_range]),
      ),
      companyStatuses: optionRows(dataset.companies.map((item) => [item.status, item.status])),
      stages: optionRows(dataset.stages.map((item) => [item.id, item.label])),
    },
  };
}

export const ANALYTICS_EXPORT_COLUMNS = [
  "indicateur",
  "valeur",
  "unite",
  "definition",
  "source",
] as const;

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function reportToCsv(report: AnalyticsReport) {
  const rows = [
    [...ANALYTICS_EXPORT_COLUMNS],
    ...report.metrics.map((item) => [
      item.label,
      Number(item.value.toFixed(2)),
      item.unit,
      item.definition,
      item.source,
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
