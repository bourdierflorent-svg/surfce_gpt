import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  FileText,
  Link2,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { classificationLabels, inboundClassificationSchema } from "@/features/inbox/classification";
import { MarkThreadReadButton } from "@/features/inbox/components/mark-thread-read-button";
import { ReplyComposer } from "@/features/inbox/components/reply-composer";
import { ThreadAssociationForm } from "@/features/inbox/components/thread-association-form";
import { ThreadClassificationForm } from "@/features/inbox/components/thread-classification-form";
import { ThreadIntelligenceActions } from "@/features/inbox/components/thread-intelligence-actions";
import { suggestedReplyOutputSchema, threadSummaryOutputSchema } from "@/features/inbox/schemas";
import { getInboxThread } from "@/features/inbox/server/queries";
import { asRecord } from "@/features/inbox/types";
import { can } from "@/lib/permissions/roles";
import type { Json, MessageRow } from "@/types/database";

interface InboxThreadPageProps {
  params: Promise<{ threadId: string }>;
}

function formatDate(value: string | null) {
  if (!value) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(value));
}

function address(value: Json) {
  const item = asRecord(value);
  return {
    email: typeof item.email === "string" ? item.email : "Adresse inconnue",
    name: typeof item.name === "string" ? item.name : null,
  };
}

function messageLabel(message: MessageRow) {
  const person = address(message.sender);
  return message.direction === "inbound" ? (person.name ?? person.email) : "Équipe SURFCE";
}

export default async function InboxThreadPage({ params }: InboxThreadPageProps) {
  const context = await requireAppAuthContext();
  const { threadId } = await params;
  const detail = await getInboxThread(context, threadId);
  if (!detail) notFound();
  const writable = can(context.membership.role, "inbox:write") && !context.isPreview;
  const latestInbound = detail.messages.findLast((message) => message.direction === "inbound");
  const summary = threadSummaryOutputSchema.safeParse(detail.thread.summary_data).data;
  const suggestion = suggestedReplyOutputSchema.safeParse(detail.thread.suggested_reply).data;
  const parsedClassification = inboundClassificationSchema.safeParse(detail.thread.classification);
  const classification = parsedClassification.success ? parsedClassification.data : "unknown";
  const campaignStopped = detail.events.some((event) => event.event_type === "campaign_stopped");
  const responseLine = [
    {
      label: "Entrée",
      value: latestInbound ? formatDate(latestInbound.received_at) : "En attente",
      complete: Boolean(latestInbound),
    },
    {
      label: "Signal",
      value: classificationLabels[classification],
      complete: classification !== "unknown",
    },
    {
      label: "Protection",
      value: campaignStopped
        ? "Séquence arrêtée"
        : detail.thread.campaign_id
          ? "Surveillance active"
          : "Hors campagne",
      complete: campaignStopped || !detail.thread.campaign_id,
    },
    {
      label: "Action",
      value: suggestion ? "Réponse préparée" : "À décider",
      complete: Boolean(suggestion),
    },
  ];

  return (
    <div className="mx-auto max-w-[100rem] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/inbox"
          className="inline-flex items-center gap-2 rounded-sm text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Toutes les conversations
        </Link>
        {detail.thread.is_unread && writable ? (
          <MarkThreadReadButton threadId={detail.thread.id} />
        ) : null}
      </div>

      <header className="grid gap-5 border-b border-border pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="font-data text-xs uppercase tracking-[0.17em] text-primary">
            {detail.mailbox.provider} · {detail.mailbox.email_address}
          </p>
          <h1 className="font-display mt-3 max-w-5xl text-balance text-4xl font-semibold tracking-[-0.05em]">
            {detail.thread.subject ?? "(Sans objet)"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {detail.contact?.full_name ?? "Contact à rapprocher"}
            {detail.company ? ` · ${detail.company.trade_name ?? detail.company.legal_name}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{classificationLabels[classification]}</Badge>
          <Badge
            className={
              detail.thread.priority === "high"
                ? "border-danger/20 bg-danger/8 text-danger"
                : undefined
            }
          >
            Priorité {detail.thread.priority}
          </Badge>
        </div>
      </header>

      <section
        aria-label="Ligne de réponse"
        className="overflow-hidden rounded-xl border border-border bg-foreground text-background"
      >
        <div className="grid sm:grid-cols-2 xl:grid-cols-4">
          {responseLine.map((stage, index) => (
            <div
              key={stage.label}
              className="border-b border-background/15 p-5 last:border-b-0 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0"
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
                    <CheckCircle2 className="size-3.5" aria-hidden="true" />
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

      <section className="grid gap-6 xl:grid-cols-[17rem_minmax(0,1fr)_23rem]">
        <aside className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="font-data text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
              Correspondances
            </p>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Contact</dt>
                <dd className="mt-1 font-semibold">{detail.contact?.full_name ?? "Non associé"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Entreprise</dt>
                <dd className="mt-1 font-semibold">
                  {detail.company?.trade_name ?? detail.company?.legal_name ?? "Non associée"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Campagne</dt>
                <dd className="mt-1 font-semibold">{detail.campaign?.name ?? "Hors campagne"}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <p className="font-data text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
              Registre d’événements
            </p>
            <ol className="relative mt-5 space-y-5 before:absolute before:bottom-2 before:left-[0.45rem] before:top-2 before:w-px before:bg-border">
              {detail.events.slice(-8).map((event) => (
                <li key={event.id} className="relative grid grid-cols-[1rem_1fr] gap-3">
                  <CircleDot
                    className="z-10 mt-0.5 size-4 bg-card text-primary"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-xs font-semibold">{event.event_type.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-[0.68rem] text-muted-foreground">
                      {formatDate(event.occurred_at)}
                    </p>
                  </div>
                </li>
              ))}
              {!detail.events.length ? (
                <li className="text-xs leading-5 text-muted-foreground">
                  Aucun événement provider.
                </li>
              ) : null}
            </ol>
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <p className="font-data text-[0.65rem] uppercase tracking-[0.14em] text-primary">
                  Fil central
                </p>
                <h2 className="font-display mt-1 text-2xl font-semibold tracking-[-0.035em]">
                  {detail.messages.length} message(s)
                </h2>
              </div>
              <Mail className="size-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="space-y-4 p-4 sm:p-6">
              {detail.messages.map((message) => {
                const sender = address(message.sender);
                const attachments = detail.attachments.filter(
                  (attachment) => attachment.message_id === message.id,
                );
                return (
                  <article
                    key={message.id}
                    className={`max-w-[92%] rounded-xl border p-5 ${
                      message.direction === "inbound"
                        ? "border-primary/20 bg-primary/[0.045]"
                        : "ml-auto border-border bg-muted/45"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="flex items-center gap-2 text-sm font-semibold">
                          {message.direction === "inbound" ? (
                            <ArrowDownLeft className="size-4 text-primary" aria-hidden="true" />
                          ) : (
                            <ArrowUpRight
                              className="size-4 text-muted-foreground"
                              aria-hidden="true"
                            />
                          )}
                          {messageLabel(message)}
                        </p>
                        <p className="mt-1 break-all text-xs text-muted-foreground">
                          {sender.email}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge>{message.status}</Badge>
                        <p className="mt-1 text-[0.68rem] text-muted-foreground">
                          {formatDate(message.received_at ?? message.sent_at ?? message.created_at)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm font-semibold">{message.subject}</p>
                    <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">
                      {message.body_text || "Message sans version texte."}
                    </div>
                    {attachments.length ? (
                      <ul className="mt-4 flex flex-wrap gap-2">
                        {attachments.map((attachment) => (
                          <li
                            key={attachment.id}
                            className="inline-flex max-w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs"
                          >
                            <FileText className="size-3.5 shrink-0" aria-hidden="true" />
                            <span className="truncate">{attachment.file_name}</span>
                            <span className="text-muted-foreground">
                              {Math.ceil(attachment.size_bytes / 1024)} ko
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-data text-[0.65rem] uppercase tracking-[0.14em] text-primary">
                  Répondre dans le fil
                </p>
                <h2 className="font-display mt-2 text-2xl font-semibold tracking-[-0.035em]">
                  Validation humaine avant envoi
                </h2>
              </div>
              <ArrowUpRight className="size-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="mt-5">
              <ReplyComposer
                key={detail.thread.suggested_reply_generated_at ?? "manual"}
                threadId={detail.thread.id}
                defaultSubject={
                  suggestion?.subject ??
                  (detail.thread.subject?.startsWith("Re:")
                    ? detail.thread.subject
                    : `Re: ${detail.thread.subject ?? "(Sans objet)"}`)
                }
                defaultBody={suggestion?.bodyText ?? ""}
                disabled={!writable || !latestInbound}
              />
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" aria-hidden="true" />
              <p className="font-data text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                Intelligence du fil
              </p>
            </div>
            <p className="mt-4 text-sm leading-6">
              {summary?.summary ?? detail.thread.summary ?? "Aucun résumé généré."}
            </p>
            {summary ? (
              <dl className="mt-5 grid gap-3 border-t border-border pt-4 text-xs">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Besoin</dt>
                  <dd className="text-right font-medium">{summary.need ?? "Inconnu"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Date</dt>
                  <dd className="text-right font-medium">{summary.date ?? "Inconnue"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Participants</dt>
                  <dd className="text-right font-medium">
                    {summary.participantCount ?? "Inconnu"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Budget</dt>
                  <dd className="text-right font-medium">{summary.budget ?? "Inconnu"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Confiance</dt>
                  <dd className="text-right font-medium">
                    {Math.round(summary.confidence * 100)} %
                  </dd>
                </div>
              </dl>
            ) : null}
            <div className="mt-5">
              <ThreadIntelligenceActions threadId={detail.thread.id} disabled={!writable} />
            </div>
          </div>

          {latestInbound ? (
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="font-data text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                Qualification humaine
              </p>
              <div className="mt-4">
                <ThreadClassificationForm
                  messageId={latestInbound.id}
                  classification={detail.thread.classification}
                  priority={detail.thread.priority}
                  disabled={!writable}
                />
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Link2 className="size-4 text-primary" aria-hidden="true" />
              <p className="font-data text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                Rapprochement manuel
              </p>
            </div>
            <div className="mt-4">
              <ThreadAssociationForm
                threadId={detail.thread.id}
                current={{
                  companyId: detail.thread.company_id,
                  contactId: detail.thread.contact_id,
                  campaignId: detail.thread.campaign_id,
                }}
                options={detail.associationOptions}
                disabled={!writable}
              />
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-border bg-muted/25 p-5">
            <p className="font-data text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
              Phase 7
            </p>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <CalendarClock className="size-4" aria-hidden="true" />
                Créer une tâche · bientôt
              </p>
              <p className="flex items-center gap-2">
                <ShieldCheck className="size-4" aria-hidden="true" />
                Ouvrir une opportunité · bientôt
              </p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
