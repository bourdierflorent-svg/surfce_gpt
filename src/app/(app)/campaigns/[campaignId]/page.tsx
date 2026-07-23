import { ArrowLeft, CalendarClock, Check, CircleDot, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { EnrollmentForm } from "@/features/campaigns/components/enrollment-form";
import { RequestActionButton } from "@/features/campaigns/components/request-action-button";
import { getCampaignDetail, getCampaignFormOptions } from "@/features/campaigns/server/queries";
import type { Json } from "@/types/database";

interface CampaignPageProps {
  params: Promise<{ campaignId: string }>;
}

function facts(value: Json): Array<{ fact: string; source_reference: string }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const fact = item.fact;
    const source = item.source_reference;
    return typeof fact === "string" && typeof source === "string"
      ? [{ fact, source_reference: source }]
      : [];
  });
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(value));
}

const statusLabels = {
  draft: "Brouillon",
  pending_approval: "À valider",
  approved: "Approuvée",
  scheduled: "Planifiée",
  active: "Active",
  paused: "En pause",
  completed: "Terminée",
  cancelled: "Annulée",
} as const;

export default async function CampaignPage({ params }: CampaignPageProps) {
  const context = await requireAppAuthContext();
  const { campaignId } = await params;
  const [campaign, options] = await Promise.all([
    getCampaignDetail(context, campaignId),
    getCampaignFormOptions(context),
  ]);
  if (!campaign) notFound();
  const enrolledContactIds = new Set(campaign.enrollments.map((row) => row.contact_id));
  const availableContacts = options.contacts.filter(
    (contact) => !enrolledContactIds.has(contact.id),
  );
  const firstMessage = campaign.messages.find((message) => message.stepPosition === 0);
  const sentCount = campaign.messages.filter((message) => message.status === "sent_mock").length;
  const suppressedCount = campaign.enrollments.filter(
    (enrollment) =>
      enrollment.status === "stopped" && enrollment.stop_reason?.includes("suppression"),
  ).length;
  const controlStages = [
    {
      label: "Preuves",
      value: campaign.enrollments.length
        ? `${campaign.enrollments.length} contact(s)`
        : "À inscrire",
      complete: campaign.enrollments.length > 0,
    },
    {
      label: "Variantes",
      value: campaign.messages.length ? `${campaign.messages.length} brouillon(s)` : "À générer",
      complete: campaign.messages.length > 0,
    },
    {
      label: "Validation",
      value: campaign.approved_at ? formatDate(campaign.approved_at) : "Feu vert requis",
      complete: Boolean(campaign.approved_at),
    },
    {
      label: "Expédition",
      value: sentCount ? `${sentCount} envoi(s) mock` : "Aucun envoi réel",
      complete: sentCount > 0,
    },
  ];

  return (
    <div className="mx-auto max-w-[94rem] space-y-7">
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-2 rounded-sm text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Toutes les campagnes
      </Link>

      <header className="grid gap-6 border-b border-border pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="font-data text-xs uppercase tracking-[0.17em] text-primary">
            Manifeste d’envoi · {campaign.mailbox.provider}
          </p>
          <h1 className="font-display mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
            {campaign.name}
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
            {campaign.description ?? "Objectif à préciser."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{statusLabels[campaign.status]}</Badge>
          <Badge className="border-success/20 bg-success/8 text-success">Mock · 0 €</Badge>
        </div>
      </header>

      <section
        aria-label="Rail de contrôle de la campagne"
        className="overflow-hidden rounded-xl border border-border bg-foreground text-background"
      >
        <div className="grid lg:grid-cols-4">
          {controlStages.map((stage, index) => (
            <div
              key={stage.label}
              className="relative border-b border-background/15 p-5 last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`grid size-7 place-items-center rounded-full border ${
                    stage.complete
                      ? "border-background bg-background text-foreground"
                      : "border-background/35 text-background/60"
                  }`}
                >
                  {stage.complete ? (
                    <Check className="size-3.5" aria-hidden="true" />
                  ) : (
                    <span className="font-data text-[0.6rem]">{index + 1}</span>
                  )}
                </span>
                <p className="font-data text-[0.65rem] uppercase tracking-[0.14em] text-background/55">
                  {stage.label}
                </p>
              </div>
              <p className="mt-4 text-sm font-semibold">{stage.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-data text-[0.65rem] uppercase tracking-[0.14em] text-primary">
                  01 · Destinataires
                </p>
                <h2 className="font-display mt-2 text-2xl font-semibold tracking-[-0.035em]">
                  Inscription avec contrôle atomique
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Une adresse invalide, un contact opposé, une société bloquée ou un domaine
                  supprimé empêche l’inscription.
                </p>
              </div>
              <span className="font-display text-3xl font-semibold">
                {campaign.enrollments.length}
              </span>
            </div>
            <div className="mt-5">
              <EnrollmentForm
                campaignId={campaign.id}
                contacts={availableContacts}
                disabled={!["draft", "pending_approval"].includes(campaign.status)}
              />
            </div>
            <div className="mt-5 divide-y divide-border border-y border-border">
              {campaign.enrollments.length ? (
                campaign.enrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div>
                      <p className="text-sm font-semibold">{enrollment.contactName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {enrollment.companyName} · {enrollment.contactEmail}
                      </p>
                    </div>
                    <Badge>{enrollment.status}</Badge>
                  </div>
                ))
              ) : (
                <p className="py-5 text-sm text-muted-foreground">
                  Aucun contact inscrit. Seules les adresses vérifiées sont proposées.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-data text-[0.65rem] uppercase tracking-[0.14em] text-primary">
                  02 · Message
                </p>
                <h2 className="font-display mt-2 text-2xl font-semibold tracking-[-0.035em]">
                  Aperçu fondé sur des faits référencés
                </h2>
              </div>
              {["draft", "pending_approval"].includes(campaign.status) ? (
                <RequestActionButton
                  endpoint={`/api/campaigns/${campaign.id}/preview`}
                  label="Générer 3 variantes"
                  pendingLabel="Génération…"
                  body={{ idempotencyKey: `ui-${campaign.id}-${campaign.updated_at}` }}
                />
              ) : null}
            </div>

            {firstMessage ? (
              <article className="mt-6 overflow-hidden rounded-xl border border-border">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/45 px-5 py-3">
                  <div>
                    <p className="font-data text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground">
                      Variante retenue · {firstMessage.variant_label}
                    </p>
                    <p className="mt-1 text-sm font-semibold">{firstMessage.subject}</p>
                  </div>
                  <Badge>{firstMessage.status}</Badge>
                </div>
                <div className="grid lg:grid-cols-[minmax(0,1fr)_18rem]">
                  <pre className="whitespace-pre-wrap p-5 font-sans text-sm leading-7">
                    {firstMessage.body_text}
                  </pre>
                  <aside className="border-t border-border bg-muted/25 p-5 lg:border-l lg:border-t-0">
                    <p className="font-data text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground">
                      Preuves utilisées
                    </p>
                    <ul className="mt-4 space-y-4">
                      {facts(firstMessage.personalization_facts).length ? (
                        facts(firstMessage.personalization_facts).map((fact) => (
                          <li
                            key={`${fact.source_reference}:${fact.fact}`}
                            className="text-xs leading-5"
                          >
                            <span className="font-medium">{fact.fact}</span>
                            <span className="font-data mt-1 block break-all text-[0.58rem] text-muted-foreground">
                              {fact.source_reference}
                            </span>
                          </li>
                        ))
                      ) : (
                        <li className="text-xs leading-5 text-muted-foreground">
                          Aucun fait de personnalisation : copie volontairement générique.
                        </li>
                      )}
                    </ul>
                  </aside>
                </div>
              </article>
            ) : (
              <div className="mt-6 grid min-h-52 place-items-center rounded-xl border border-dashed border-border bg-muted/20 p-7 text-center">
                <div>
                  <Mail className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold">Aucun brouillon généré</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Inscrivez un contact, puis générez l’aperçu obligatoire.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-5 sm:p-7">
            <p className="font-data text-[0.65rem] uppercase tracking-[0.14em] text-primary">
              03 · Journal d’expédition
            </p>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[46rem] text-left text-sm">
                <thead className="font-data text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="pb-3 pr-4">Étape</th>
                    <th className="pb-3 pr-4">Contact</th>
                    <th className="pb-3 pr-4">Créneau</th>
                    <th className="pb-3 pr-4">État</th>
                    <th className="pb-3 text-right">Contrôle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {campaign.messages.map((message) => (
                    <tr key={message.id}>
                      <td className="py-4 pr-4 font-data text-xs">
                        J+
                        {campaign.steps.find((step) => step.id === message.sequence_step_id)
                          ?.delay_days ?? 0}
                      </td>
                      <td className="py-4 pr-4 font-semibold">{message.contactName}</td>
                      <td className="py-4 pr-4 text-muted-foreground">
                        {formatDate(message.scheduled_at)}
                      </td>
                      <td className="py-4 pr-4">
                        <Badge>{message.status}</Badge>
                      </td>
                      <td className="py-4 text-right">
                        {message.status === "scheduled" ? (
                          <RequestActionButton
                            endpoint="/api/messages/send"
                            label="Traiter si dû"
                            pendingLabel="Contrôle…"
                            body={{ messageId: message.id }}
                            variant="secondary"
                          />
                        ) : message.status === "approved" ||
                          message.status === "pending_approval" ? (
                          <RequestActionButton
                            endpoint="/api/messages/send-test"
                            label="Test mock"
                            pendingLabel="Test…"
                            body={{ messageId: message.id }}
                            variant="secondary"
                          />
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!campaign.messages.length ? (
                <p className="py-6 text-sm text-muted-foreground">Aucun message dans le journal.</p>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="font-data text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
              Commandes
            </p>
            <div className="mt-5 space-y-4">
              {campaign.status === "pending_approval" ? (
                <RequestActionButton
                  endpoint={`/api/campaigns/${campaign.id}/approve`}
                  label="Approuver les premiers messages"
                  pendingLabel="Validation…"
                />
              ) : null}
              {campaign.status === "approved" ? (
                <RequestActionButton
                  endpoint={`/api/campaigns/${campaign.id}/launch`}
                  label="Planifier et lancer"
                  pendingLabel="Planification…"
                />
              ) : null}
              {campaign.status === "active" ? (
                <RequestActionButton
                  endpoint={`/api/campaigns/${campaign.id}/pause`}
                  label="Mettre en pause"
                  pendingLabel="Mise en pause…"
                  variant="secondary"
                />
              ) : null}
              {campaign.status === "draft" ? (
                <p className="text-sm leading-6 text-muted-foreground">
                  Inscrivez les contacts, puis générez les variantes pour ouvrir la validation.
                </p>
              ) : null}
              <Link
                href={`/campaigns/${campaign.id}/edit`}
                className="inline-flex rounded-sm text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Voir la configuration
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-foreground p-5 text-background">
            <p className="font-data text-[0.65rem] uppercase tracking-[0.14em] text-background/55">
              Séquence
            </p>
            <div className="relative mt-5 before:absolute before:bottom-4 before:left-[0.45rem] before:top-3 before:w-px before:bg-background/20">
              {campaign.steps.map((step) => (
                <div
                  key={step.id}
                  className="relative grid grid-cols-[1rem_1fr] gap-3 pb-6 last:pb-0"
                >
                  <CircleDot
                    className="z-10 mt-0.5 size-4 bg-foreground text-background"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-data text-[0.62rem] text-background/55">
                      {step.position === 0 ? "J0" : `J+${step.delay_days}`}
                      {step.delay_hours ? ` · +${step.delay_hours} h` : ""}
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {step.ai_instructions ?? `Étape ${step.position + 1}`}
                    </p>
                    {step.requires_approval ? (
                      <p className="mt-1 text-xs text-background/55">Validation requise</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <p className="font-data text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
              Garde-fous actifs
            </p>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex gap-3">
                <ShieldCheck className="mt-0.5 size-4 text-success" aria-hidden="true" />
                Opposition avant chaque envoi
              </li>
              <li className="flex gap-3">
                <Mail className="mt-0.5 size-4 text-primary" aria-hidden="true" />
                Boîte {campaign.mailbox.status} · {campaign.mailbox.sent_today}/
                {campaign.mailbox.daily_send_limit}
              </li>
              <li className="flex gap-3">
                <CalendarClock className="mt-0.5 size-4 text-primary" aria-hidden="true" />
                Europe/Paris · 09:00–17:30
              </li>
            </ul>
            {suppressedCount ? (
              <p className="mt-4 rounded-lg bg-danger/8 p-3 text-xs font-semibold text-danger">
                {suppressedCount} inscription(s) arrêtée(s) par opposition.
              </p>
            ) : null}
          </div>
        </aside>
      </section>
    </div>
  );
}
