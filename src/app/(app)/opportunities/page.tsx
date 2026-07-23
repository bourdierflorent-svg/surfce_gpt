import {
  AlertTriangle,
  ArrowRight,
  Columns3,
  List,
  Plus,
  Settings2,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { PipelineBoard } from "@/features/opportunities/components/pipeline-board";
import {
  getOpportunityFormOptions,
  listOpportunities,
  listOpportunityStages,
  summarizePipeline,
} from "@/features/opportunities/server/queries";
import { can } from "@/lib/permissions/roles";
import { cn } from "@/lib/utils";

interface OpportunitiesPageProps {
  searchParams: Promise<{
    q?: string;
    owner?: string;
    stage?: string;
    view?: string;
  }>;
}

function money(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function date(value: string | null) {
  if (!value) return "À définir";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(new Date(value));
}

function viewHref(params: { q: string; owner: string; stage: string }, view: "board" | "table") {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.owner) query.set("owner", params.owner);
  if (params.stage) query.set("stage", params.stage);
  if (view === "table") query.set("view", "table");
  const value = query.toString();
  return value ? `/opportunities?${value}` : "/opportunities";
}

export default async function OpportunitiesPage({ searchParams }: OpportunitiesPageProps) {
  const context = await requireAppAuthContext();
  const raw = await searchParams;
  const filters = {
    q: raw.q?.trim() ?? "",
    owner: raw.owner ?? "",
    stage: raw.stage ?? "",
  };
  const view = raw.view === "table" ? "table" : "board";
  const [stages, opportunities, options] = await Promise.all([
    listOpportunityStages(context),
    listOpportunities(context, {
      query: filters.q,
      ownerId: filters.owner || undefined,
      stageId: filters.stage || undefined,
    }),
    getOpportunityFormOptions(context),
  ]);
  const summary = summarizePipeline(opportunities);
  const writable = can(context.membership.role, "opportunities:write") && !context.isPreview;

  return (
    <div className="mx-auto max-w-[120rem] space-y-7">
      <header className="grid gap-6 border-b border-border pb-7 xl:grid-cols-[1fr_auto] xl:items-end">
        <div>
          <p className="font-data text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Plan de circulation commerciale · Phase 7
          </p>
          <h1 className="font-display mt-3 max-w-5xl text-balance text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
            La valeur avance quand la prochaine action est nette.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
            Chaque dossier relie un signal, un montant pondéré, un jalon et une action datée. Les
            passages d’étape alimentent automatiquement l’historique commercial.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/opportunities/stages"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Settings2 className="size-4" aria-hidden="true" />
            Configurer les étapes
          </Link>
          <Link
            href="/opportunities/new"
            className={cn(
              "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              !writable && "pointer-events-none opacity-45",
            )}
            aria-disabled={!writable}
          >
            <Plus className="size-4" aria-hidden="true" />
            Nouvelle opportunité
          </Link>
        </div>
      </header>

      <section
        aria-label="Valeur du pipeline"
        className="grid overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-2 xl:grid-cols-4"
      >
        {[
          ["Pipeline ouvert", money(summary.openAmount), "volume non pondéré"],
          ["Revenu pondéré", money(summary.weightedAmount), "montant × probabilité"],
          ["Revenu gagné", money(summary.wonAmount), "dossiers confirmés"],
          [
            "Actions en retard",
            String(summary.overdueActions),
            summary.overdueActions ? "à traiter maintenant" : "aucune alerte",
          ],
        ].map(([label, value, note], index) => (
          <div
            key={label}
            className="border-b border-border p-5 last:border-b-0 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-data text-[0.65rem] uppercase tracking-[0.13em] text-muted-foreground">
                {label}
              </p>
              {index === 1 ? (
                <TrendingUp className="size-4 text-primary" aria-hidden="true" />
              ) : index === 3 && summary.overdueActions ? (
                <AlertTriangle className="size-4 text-danger" aria-hidden="true" />
              ) : null}
            </div>
            <p className="font-display mt-3 text-3xl font-semibold tracking-[-0.04em]">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{note}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-end">
        <form
          action="/opportunities"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[20rem_14rem_14rem_auto]"
        >
          {view === "table" ? <input type="hidden" name="view" value="table" /> : null}
          <div>
            <label htmlFor="pipeline-search" className="text-xs font-semibold">
              Rechercher
            </label>
            <input
              id="pipeline-search"
              name="q"
              defaultValue={filters.q}
              autoComplete="off"
              spellCheck={false}
              placeholder="Dossier, entreprise, contact…"
              className="mt-1.5 h-11 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
            />
          </div>
          <div>
            <label htmlFor="pipeline-owner" className="text-xs font-semibold">
              Commercial
            </label>
            <select
              id="pipeline-owner"
              name="owner"
              defaultValue={filters.owner}
              className="mt-1.5 h-11 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
            >
              <option value="">Toute l’équipe</option>
              {options.owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pipeline-stage" className="text-xs font-semibold">
              Étape
            </label>
            <select
              id="pipeline-stage"
              name="stage"
              defaultValue={filters.stage}
              className="mt-1.5 h-11 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
            >
              <option value="">Toutes les étapes</option>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="h-11 self-end rounded-lg border border-border bg-card px-4 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Appliquer
          </button>
        </form>
        <div className="flex rounded-lg border border-border bg-card p-1">
          <Link
            href={viewHref(filters, "board")}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              view === "board" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
            aria-current={view === "board" ? "page" : undefined}
          >
            <Columns3 className="size-4" aria-hidden="true" />
            Kanban
          </Link>
          <Link
            href={viewHref(filters, "table")}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              view === "table" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
            aria-current={view === "table" ? "page" : undefined}
          >
            <List className="size-4" aria-hidden="true" />
            Tableau
          </Link>
        </div>
      </section>

      {view === "board" ? (
        <PipelineBoard stages={stages} opportunities={opportunities} writable={writable} />
      ) : (
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr_2.5rem] gap-4 border-b border-border bg-muted/45 px-5 py-3 font-data text-[0.64rem] uppercase tracking-[0.12em] text-muted-foreground lg:grid">
            <span>Dossier</span>
            <span>Étape</span>
            <span>Valeur</span>
            <span>Commercial</span>
            <span>Prochaine action</span>
            <span className="sr-only">Ouvrir</span>
          </div>
          <div className="divide-y divide-border">
            {opportunities.map((opportunity) => {
              const amount =
                opportunity.signed_amount ??
                opportunity.proposed_amount ??
                opportunity.estimated_amount ??
                0;
              return (
                <Link
                  key={opportunity.id}
                  href={`/opportunities/${opportunity.id}`}
                  className="group grid gap-4 px-5 py-5 [content-visibility:auto] [contain-intrinsic-size:auto_8rem] hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_2.5rem] lg:items-center"
                >
                  <div>
                    <p className="font-display text-lg font-semibold tracking-[-0.025em] group-hover:text-primary">
                      {opportunity.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {opportunity.companyName}
                      {opportunity.contactName ? ` · ${opportunity.contactName}` : ""}
                    </p>
                  </div>
                  <Badge>{opportunity.stage.label}</Badge>
                  <div>
                    <p className="font-data text-sm font-semibold">{money(amount)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {opportunity.probability}% · {money(amount * (opportunity.probability / 100))}
                    </p>
                  </div>
                  <p className="text-sm">{opportunity.ownerName}</p>
                  <div>
                    <p className="text-sm">{opportunity.next_action ?? "À définir"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {date(opportunity.next_action_at)}
                    </p>
                  </div>
                  <ArrowRight
                    className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
            {!opportunities.length ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                Aucun dossier ne correspond à ces filtres.
              </p>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
