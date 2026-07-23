import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  FileText,
  Landmark,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import {
  AppointmentComposer,
  ProposalComposer,
  ProposalStatusActions,
  StageMoveForm,
  TaskComposer,
  TaskStatusButton,
} from "@/features/opportunities/components/opportunity-actions";
import {
  getOpportunityDetail,
  listOpportunityStages,
} from "@/features/opportunities/server/queries";
import { can } from "@/lib/permissions/roles";
import type { Json } from "@/types/database";

interface OpportunityPageProps {
  params: Promise<{ opportunityId: string }>;
}

function money(value: number | null, currency: string) {
  if (value === null) return "À définir";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function date(value: string | null, includeTime = false) {
  if (!value) return "À définir";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" as const } : {}),
    timeZone: "Europe/Paris",
  }).format(new Date(value));
}

function record(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function stringArray(value: Json | undefined) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export default async function OpportunityPage({ params }: OpportunityPageProps) {
  const context = await requireAppAuthContext();
  const { opportunityId } = await params;
  const [opportunity, stages] = await Promise.all([
    getOpportunityDetail(context, opportunityId),
    listOpportunityStages(context),
  ]);
  if (!opportunity) notFound();
  const writable = can(context.membership.role, "opportunities:write") && !context.isPreview;
  const amount =
    opportunity.signed_amount ??
    opportunity.proposed_amount ??
    opportunity.estimated_amount ??
    null;
  const weighted = amount === null ? null : amount * (opportunity.probability / 100);
  const objections = Array.isArray(opportunity.objections)
    ? opportunity.objections.filter((item): item is string => typeof item === "string")
    : [];
  const currentPosition = opportunity.stage.position;
  const facts: Array<{ label: string; value: string; icon: LucideIcon }> = [
    { label: "Format", value: opportunity.event_type ?? "À définir", icon: Users },
    {
      label: "Participants",
      value: opportunity.estimated_guests ? `${opportunity.estimated_guests}` : "À définir",
      icon: Users,
    },
    {
      label: "Date souhaitée",
      value: date(opportunity.desired_event_date),
      icon: CalendarDays,
    },
    {
      label: "Clôture estimée",
      value: date(opportunity.expected_close_date),
      icon: Clock3,
    },
  ];

  return (
    <div className="mx-auto max-w-[110rem] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/opportunities"
          className="inline-flex items-center gap-2 rounded-sm text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Retour au pipeline
        </Link>
        <div className="flex flex-wrap gap-2">
          {opportunity.sourceThreadId ? (
            <Link
              href={`/inbox/${opportunity.sourceThreadId}`}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Conversation source
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          ) : null}
          <Link
            href={`/companies/${opportunity.company_id}`}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Fiche entreprise
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <header className="grid gap-5 border-b border-border pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="font-data text-xs uppercase tracking-[0.17em] text-primary">
            {opportunity.companyName} · {opportunity.source}
          </p>
          <h1 className="font-display mt-3 max-w-5xl text-balance text-4xl font-semibold tracking-[-0.05em]">
            {opportunity.title}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {opportunity.contactName ?? "Contact principal à définir"} · Responsable{" "}
            {opportunity.ownerName}
          </p>
        </div>
        <Badge
          className={
            opportunity.stage.category === "won"
              ? "border-success/25 bg-success/10 text-success"
              : opportunity.stage.category === "lost"
                ? "border-muted-foreground/25 bg-muted text-muted-foreground"
                : undefined
          }
        >
          {opportunity.stage.label} · {opportunity.probability}%
        </Badge>
      </header>

      <section
        aria-label="Bande de valeur"
        className="overflow-hidden rounded-xl border border-border bg-foreground text-background"
      >
        <div className="grid sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.5fr]">
          {[
            ["Base de valeur", money(amount, opportunity.currency)],
            ["Probabilité", `${opportunity.probability}%`],
            ["Revenu pondéré", money(weighted, opportunity.currency)],
            [
              "Prochaine action",
              `${opportunity.next_action ?? "À définir"} · ${date(opportunity.next_action_at, true)}`,
            ],
          ].map(([label, value], index) => (
            <div
              key={label}
              className="border-b border-background/15 p-5 last:border-b-0 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0"
            >
              <div className="flex items-center gap-2">
                <span className="font-data grid size-6 place-items-center rounded-full border border-background/30 text-[0.6rem]">
                  {index + 1}
                </span>
                <p className="font-data text-[0.62rem] uppercase tracking-[0.13em] text-background/55">
                  {label}
                </p>
              </div>
              <p className="mt-4 text-sm font-semibold leading-6">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Progression commerciale" className="overflow-x-auto">
        <ol className="flex min-w-max items-start">
          {stages
            .filter((stage) => stage.is_active)
            .map((stage, index, activeStages) => {
              const complete =
                stage.position <= currentPosition && opportunity.stage.category === "open";
              const current = stage.id === opportunity.stage_id;
              return (
                <li key={stage.id} className="flex items-start">
                  <div className="w-32 text-center">
                    <span
                      className={`mx-auto grid size-8 place-items-center rounded-full border ${
                        current
                          ? "border-primary bg-primary text-primary-foreground"
                          : complete
                            ? "border-success bg-success text-white"
                            : "border-border bg-card text-muted-foreground"
                      }`}
                    >
                      {complete ? (
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                      ) : (
                        <span className="font-data text-[0.62rem]">{index + 1}</span>
                      )}
                    </span>
                    <p
                      className={`mt-2 text-[0.68rem] leading-4 ${current ? "font-semibold" : "text-muted-foreground"}`}
                    >
                      {stage.label}
                    </p>
                  </div>
                  {index < activeStages.length - 1 ? (
                    <span
                      className={`mt-4 h-px w-8 ${complete ? "bg-success" : "bg-border"}`}
                      aria-hidden="true"
                    />
                  ) : null}
                </li>
              );
            })}
        </ol>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <main className="min-w-0 space-y-6">
          <section className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {facts.map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-card p-5">
                <Icon className="size-4 text-primary" aria-hidden="true" />
                <p className="mt-3 text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-sm font-semibold">{value}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="font-data text-[0.65rem] uppercase tracking-[0.14em] text-primary">
                Correspondances
              </p>
              <dl className="mt-4 space-y-4 text-sm">
                {[
                  ["Établissement", opportunity.venueName ?? "À recommander"],
                  ["Offre", opportunity.offerName ?? "À définir"],
                  ["Campagne", opportunity.campaignName ?? "Hors campagne"],
                  ["Montant estimé", money(opportunity.estimated_amount, opportunity.currency)],
                  ["Montant proposé", money(opportunity.proposed_amount, opportunity.currency)],
                  ["Montant signé", money(opportunity.signed_amount, opportunity.currency)],
                ].map(([term, description]) => (
                  <div key={term} className="grid grid-cols-[8rem_1fr] gap-3">
                    <dt className="text-muted-foreground">{term}</dt>
                    <dd className="font-semibold">{description}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="font-data text-[0.65rem] uppercase tracking-[0.14em] text-primary">
                Points de vigilance
              </p>
              {objections.length ? (
                <ul className="mt-4 space-y-3 text-sm">
                  {objections.map((objection) => (
                    <li key={objection} className="flex gap-2">
                      <CircleDot
                        className="mt-0.5 size-4 shrink-0 text-warning"
                        aria-hidden="true"
                      />
                      {objection}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">Aucune objection enregistrée.</p>
              )}
              {opportunity.notes ? (
                <p className="mt-5 border-t border-border pt-4 text-sm leading-6">
                  {opportunity.notes}
                </p>
              ) : null}
              {opportunity.loss_reason ? (
                <p className="mt-5 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
                  Motif de perte : {opportunity.loss_reason}
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card">
            <div className="border-b border-border p-5">
              <p className="font-data text-[0.65rem] uppercase tracking-[0.14em] text-primary">
                Tâches et rappels
              </p>
              <h2 className="font-display mt-2 text-2xl font-semibold">Actions à tenir</h2>
            </div>
            <div className="divide-y divide-border">
              {opportunity.tasks.map((task) => (
                <article
                  key={task.id}
                  className="grid gap-3 p-5 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{task.title}</p>
                      <Badge>{task.priority}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {date(task.due_at, true)} · {task.status.replaceAll("_", " ")}
                    </p>
                    {task.description ? (
                      <p className="mt-2 text-sm leading-6">{task.description}</p>
                    ) : null}
                  </div>
                  <TaskStatusButton task={task} disabled={!writable} />
                </article>
              ))}
              {!opportunity.tasks.length ? (
                <p className="p-5 text-sm text-muted-foreground">Aucune tâche planifiée.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card">
            <div className="border-b border-border p-5">
              <p className="font-data text-[0.65rem] uppercase tracking-[0.14em] text-primary">
                Rendez-vous
              </p>
              <h2 className="font-display mt-2 text-2xl font-semibold">Temps commerciaux</h2>
            </div>
            <div className="divide-y divide-border">
              {opportunity.appointments.map((appointment) => (
                <article key={appointment.id} className="grid gap-3 p-5 sm:grid-cols-[auto_1fr]">
                  <div className="grid size-11 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <CalendarDays className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{appointment.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {date(appointment.starts_at, true)} → {date(appointment.ends_at, true)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {appointment.location ?? "Lieu à définir"} · {appointment.status}
                    </p>
                  </div>
                </article>
              ))}
              {!opportunity.appointments.length ? (
                <p className="p-5 text-sm text-muted-foreground">Aucun rendez-vous planifié.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card">
            <div className="border-b border-border p-5">
              <p className="font-data text-[0.65rem] uppercase tracking-[0.14em] text-primary">
                Propositions
              </p>
              <h2 className="font-display mt-2 text-2xl font-semibold">Versions commerciales</h2>
            </div>
            <div className="divide-y divide-border">
              {opportunity.proposals.map((proposal) => {
                const content = record(proposal.content);
                const inclusions = stringArray(content.inclusions);
                return (
                  <article key={proposal.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_auto]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <FileText className="size-4 text-primary" aria-hidden="true" />
                        <p className="text-sm font-semibold">Version {proposal.version}</p>
                        <Badge>{proposal.status}</Badge>
                      </div>
                      <p className="font-display mt-3 text-2xl font-semibold">
                        {money(proposal.amount, proposal.currency)}
                      </p>
                      <p className="mt-2 text-sm leading-6">
                        {typeof content.summary === "string"
                          ? content.summary
                          : "Proposition sans résumé."}
                      </p>
                      {inclusions.length ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {inclusions.join(" · ")}
                        </p>
                      ) : null}
                    </div>
                    <ProposalStatusActions proposal={proposal} disabled={!writable} />
                  </article>
                );
              })}
              {!opportunity.proposals.length ? (
                <p className="p-5 text-sm text-muted-foreground">Aucune proposition créée.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <p className="font-data text-[0.65rem] uppercase tracking-[0.14em] text-primary">
              Historique auditable
            </p>
            <ol className="relative mt-5 space-y-5 before:absolute before:bottom-2 before:left-[0.45rem] before:top-2 before:w-px before:bg-border">
              {opportunity.activities.map((activity) => (
                <li key={activity.id} className="relative grid grid-cols-[1rem_1fr] gap-3">
                  <CircleDot
                    className="z-10 mt-0.5 size-4 bg-card text-primary"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-semibold">{activity.title}</p>
                    {activity.description ? (
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {activity.description}
                      </p>
                    ) : null}
                    <p className="font-data mt-1 text-[0.62rem] uppercase tracking-[0.1em] text-muted-foreground">
                      {date(activity.occurred_at, true)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </main>

        <aside className="space-y-5">
          <section className="rounded-xl border border-border bg-card p-5">
            <p className="font-data text-[0.65rem] uppercase tracking-[0.14em] text-primary">
              Passage d’étape
            </p>
            <div className="mt-4">
              <StageMoveForm
                opportunityId={opportunity.id}
                currentStageId={opportunity.stage_id}
                stages={stages}
                disabled={!writable}
              />
            </div>
          </section>
          <details className="group rounded-xl border border-border bg-card">
            <summary className="cursor-pointer list-none p-5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
              Ajouter une tâche
            </summary>
            <div className="border-t border-border p-5">
              <TaskComposer opportunityId={opportunity.id} disabled={!writable} />
            </div>
          </details>
          <details className="group rounded-xl border border-border bg-card">
            <summary className="cursor-pointer list-none p-5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
              Planifier un rendez-vous
            </summary>
            <div className="border-t border-border p-5">
              <AppointmentComposer opportunityId={opportunity.id} disabled={!writable} />
            </div>
          </details>
          <details className="group rounded-xl border border-border bg-card">
            <summary className="cursor-pointer list-none p-5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
              Créer une proposition
            </summary>
            <div className="border-t border-border p-5">
              <ProposalComposer
                opportunityId={opportunity.id}
                currency={opportunity.currency}
                estimatedGuests={opportunity.estimated_guests}
                eventDate={opportunity.desired_event_date}
                disabled={!writable}
              />
            </div>
          </details>
          <section className="rounded-xl border border-border bg-card p-5">
            <Landmark className="size-4 text-primary" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold">Règle de valeur</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Le revenu pondéré utilise le montant signé, proposé ou estimé disponible, multiplié
              par la probabilité de l’étape.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
