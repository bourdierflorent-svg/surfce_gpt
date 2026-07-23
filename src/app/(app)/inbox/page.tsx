import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleCheck,
  MailOpen,
  Search,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { classificationLabels, inboundClassificationSchema } from "@/features/inbox/classification";
import { listInboxThreads } from "@/features/inbox/server/queries";
import { cn } from "@/lib/utils";

interface InboxPageProps {
  searchParams: Promise<{
    q?: string;
    classification?: string;
    priority?: string;
    unread?: string;
  }>;
}

function formatDate(value: string | null) {
  if (!value) return "Aucune date";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(value));
}

function filterHref(
  params: { query: string; classification: string; priority: string; unread: boolean },
  update: Partial<{ classification: string; priority: string; unread: boolean }>,
) {
  const next = { ...params, ...update };
  const query = new URLSearchParams();
  if (next.query) query.set("q", next.query);
  if (next.classification !== "all") query.set("classification", next.classification);
  if (next.priority !== "all") query.set("priority", next.priority);
  if (next.unread) query.set("unread", "1");
  const value = query.toString();
  return value ? `/inbox?${value}` : "/inbox";
}

export default async function InboxPage({ searchParams }: InboxPageProps) {
  const context = await requireAppAuthContext();
  const raw = await searchParams;
  const classification = inboundClassificationSchema.safeParse(raw.classification).success
    ? raw.classification!
    : "all";
  const priority = ["low", "normal", "high"].includes(raw.priority ?? "") ? raw.priority! : "all";
  const query = raw.q?.trim() ?? "";
  const unread = raw.unread === "1";
  const filters = { query, classification, priority, unread };
  const threads = await listInboxThreads(context, filters);
  const unreadCount = threads.filter((thread) => thread.is_unread).length;
  const stoppedCount = threads.filter((thread) => thread.campaignStopped).length;
  const positiveCount = threads.filter((thread) =>
    ["interested", "asks_information", "asks_price", "asks_callback"].includes(
      thread.classification ?? "",
    ),
  ).length;

  return (
    <div className="mx-auto max-w-[96rem] space-y-7">
      <header className="grid gap-6 border-b border-border pb-7 xl:grid-cols-[1fr_auto] xl:items-end">
        <div>
          <p className="font-data text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Table de correspondance · réponses entrantes
          </p>
          <h1 className="font-display mt-3 max-w-5xl text-balance text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
            Chaque réponse devient un signal, puis une décision traçable.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
            SURFCE réunit les fils Gmail, Microsoft et mock, qualifie l’intention et coupe les
            relances dès qu’une réponse humaine est reçue.
          </p>
        </div>
        <Link
          href="/settings/mailboxes"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Gérer les connexions
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </header>

      <section
        aria-label="État des réponses"
        className="grid overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-3"
      >
        <div className="border-b border-border p-5 sm:border-b-0 sm:border-r">
          <MailOpen className="size-4 text-primary" aria-hidden="true" />
          <p className="font-display mt-3 text-3xl font-semibold tracking-[-0.04em]">
            {unreadCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">conversation(s) à lire</p>
        </div>
        <div className="border-b border-border p-5 sm:border-b-0 sm:border-r">
          <CircleCheck className="size-4 text-success" aria-hidden="true" />
          <p className="font-display mt-3 text-3xl font-semibold tracking-[-0.04em]">
            {positiveCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">signal(aux) commercial(aux)</p>
        </div>
        <div className="p-5">
          <ShieldCheck className="size-4 text-success" aria-hidden="true" />
          <p className="font-display mt-3 text-3xl font-semibold tracking-[-0.04em]">
            {stoppedCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">séquence(s) arrêtée(s)</p>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-center">
        <div className="flex max-w-full overflow-x-auto rounded-lg border border-border bg-card p-1">
          {[
            ["all", "Tous"],
            ["interested", "Intéressés"],
            ["asks_information", "Informations"],
            ["asks_price", "Prix"],
            ["not_interested", "Refus"],
            ["unsubscribe", "Opposition"],
          ].map(([value, label]) => (
            <Link
              key={value}
              href={filterHref(filters, { classification: value })}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                classification === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={filterHref(filters, {
              priority: priority === "high" ? "all" : "high",
            })}
            className={cn(
              "inline-flex h-11 items-center justify-center rounded-lg border px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              priority === "high"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-muted",
            )}
            aria-current={priority === "high" ? "page" : undefined}
          >
            Priorité haute
          </Link>
          <Link
            href={filterHref(filters, { unread: !unread })}
            className={cn(
              "inline-flex h-11 items-center justify-center rounded-lg border px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              unread
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-muted",
            )}
            aria-current={unread ? "page" : undefined}
          >
            Non lues uniquement
          </Link>
          <form action="/inbox" className="relative min-w-0 sm:w-80">
            {classification !== "all" ? (
              <input type="hidden" name="classification" value={classification} />
            ) : null}
            {priority !== "all" ? <input type="hidden" name="priority" value={priority} /> : null}
            {unread ? <input type="hidden" name="unread" value="1" /> : null}
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <label htmlFor="inbox-search" className="sr-only">
              Rechercher une conversation
            </label>
            <input
              id="inbox-search"
              name="q"
              autoComplete="off"
              spellCheck={false}
              defaultValue={query}
              placeholder="Sujet, contact, entreprise…"
              className="h-11 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
            />
          </form>
        </div>
      </section>

      {threads.length ? (
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="hidden grid-cols-[2.2fr_1fr_1fr_1fr_2.5rem] gap-4 border-b border-border bg-muted/45 px-5 py-3 font-data text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-muted-foreground lg:grid">
            <span>Conversation</span>
            <span>Signal</span>
            <span>Protection</span>
            <span>Dernier mouvement</span>
            <span className="sr-only">Ouvrir</span>
          </div>
          <div className="divide-y divide-border">
            {threads.map((thread) => {
              const parsed = inboundClassificationSchema.safeParse(thread.classification);
              const label = parsed.success
                ? classificationLabels[parsed.data]
                : classificationLabels.unknown;
              return (
                <Link
                  key={thread.id}
                  href={`/inbox/${thread.id}`}
                  className="group grid gap-4 px-5 py-5 [content-visibility:auto] [contain-intrinsic-size:auto_9rem] hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring lg:grid-cols-[2.2fr_1fr_1fr_1fr_2.5rem] lg:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {thread.is_unread ? (
                        <span
                          className="size-2 shrink-0 rounded-full bg-primary"
                          aria-label="Non lue"
                        />
                      ) : null}
                      <p className="truncate font-display text-xl font-semibold tracking-[-0.035em] group-hover:text-primary">
                        {thread.subject ?? "(Sans objet)"}
                      </p>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {thread.contactName ?? "Contact à rapprocher"}
                      {thread.companyName ? ` · ${thread.companyName}` : ""}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm leading-6">
                      {thread.lastMessagePreview}
                    </p>
                  </div>
                  <div>
                    <Badge
                      className={
                        thread.priority === "high"
                          ? "border-danger/20 bg-danger/8 text-danger"
                          : undefined
                      }
                    >
                      {label}
                    </Badge>
                    <p className="font-data mt-2 text-[0.62rem] uppercase tracking-[0.1em] text-muted-foreground">
                      priorité {thread.priority}
                    </p>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <ShieldCheck
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        thread.campaignStopped ? "text-success" : "text-muted-foreground",
                      )}
                      aria-hidden="true"
                    />
                    <span>
                      {thread.campaignStopped
                        ? "Séquence arrêtée"
                        : thread.campaign_id
                          ? "Arrêt surveillé"
                          : "Hors campagne"}
                    </span>
                  </div>
                  <div>
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {thread.lastDirection === "inbound" ? (
                        <ArrowDownLeft className="size-4 text-primary" aria-hidden="true" />
                      ) : (
                        <ArrowUpRight className="size-4 text-muted-foreground" aria-hidden="true" />
                      )}
                      {thread.lastDirection === "inbound" ? "Réponse reçue" : "Réponse envoyée"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(thread.last_message_at)}
                    </p>
                  </div>
                  <span className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:border-primary group-hover:text-primary motion-reduce:transition-none">
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="grid min-h-72 place-items-center rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <div>
            <MailOpen className="mx-auto size-7 text-muted-foreground" aria-hidden="true" />
            <h2 className="font-display mt-4 text-2xl font-semibold">
              Aucune conversation dans ce filtre
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Connectez une boîte, lancez une synchronisation ou élargissez les critères.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
