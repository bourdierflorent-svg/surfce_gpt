import { ArrowUpRight, Building2, Database, MapPin, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { PaginationNav } from "@/components/ui/pagination-nav";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { listCompanies } from "@/features/companies/server/queries";
import { COMPANY_STATUS_LABELS } from "@/features/companies/types";
import { parsePage } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import type { CompanyStatus } from "@/types/database";

interface CompaniesPageProps {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}

function selectedStatus(value?: string): CompanyStatus | "all" {
  return value && value in COMPANY_STATUS_LABELS ? (value as CompanyStatus) : "all";
}

export default async function CompaniesPage({ searchParams }: CompaniesPageProps) {
  const context = await requireAppAuthContext();
  const params = await searchParams;
  const status = selectedStatus(params.status);
  const query = params.q?.trim() ?? "";
  const result = await listCompanies(context, { query, status, page: parsePage(params.page) });
  const companies = result.items;
  const qualifiedCount = companies.filter(
    (company) => (company.qualification_score ?? 0) >= 70,
  ).length;

  return (
    <div className="mx-auto max-w-[90rem] space-y-7">
      <header className="grid gap-6 border-b border-border pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="font-data text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Registre entreprises · Sources lisibles
          </p>
          <h1 className="font-display mt-3 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
            Chaque cible garde la trace de son origine.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Entreprises importées depuis l’Explorer, dédupliquées avant création et qualifiables par
            l’équipe.
          </p>
        </div>
        <Link
          href="/explore"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <MapPin className="size-4" aria-hidden="true" />
          Ouvrir l’Explorer
        </Link>
      </header>

      <section
        aria-label="Résumé des entreprises"
        className="grid overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-3"
      >
        <div className="border-b border-border p-5 sm:border-b-0 sm:border-r">
          <Building2 className="size-4 text-primary" aria-hidden="true" />
          <p className="font-display mt-3 text-3xl font-semibold tracking-[-0.04em]">
            {result.total}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">dans ce filtre</p>
        </div>
        <div className="border-b border-border p-5 sm:border-b-0 sm:border-r">
          <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
          <p className="font-display mt-3 text-3xl font-semibold tracking-[-0.04em]">
            {qualifiedCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">score ≥ 70 sur cette page</p>
        </div>
        <div className="p-5">
          <Database className="size-4 text-primary" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold">Provenance conservée</p>
          <p className="mt-1 text-xs text-muted-foreground">
            provider, collecte, confiance et valeur brute
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          className="flex max-w-full overflow-x-auto rounded-lg border border-border bg-card p-1"
          aria-label="Filtrer par statut"
        >
          {(["all", "discovered", "qualified", "contacted", "opportunity"] as const).map(
            (value) => (
              <Link
                key={value}
                href={`/companies?status=${value}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  status === value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {value === "all" ? "Toutes" : COMPANY_STATUS_LABELS[value]}
              </Link>
            ),
          )}
        </div>
        <form className="relative w-full lg:max-w-sm" action="/companies">
          <input type="hidden" name="status" value={status} />
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <label htmlFor="company-search" className="sr-only">
            Rechercher une entreprise
          </label>
          <input
            id="company-search"
            name="q"
            defaultValue={query}
            placeholder="Nom d’entreprise…"
            autoComplete="off"
            className="h-11 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
          />
        </form>
      </section>

      {companies.length > 0 ? (
        <section
          aria-label="Entreprises"
          className="overflow-hidden rounded-xl border border-border bg-card"
        >
          <div className="hidden grid-cols-[3rem_1.4fr_0.8fr_0.65fr_0.55fr_3rem] gap-4 border-b border-border bg-muted/45 px-5 py-3 font-data text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-muted-foreground lg:grid">
            <span>N°</span>
            <span>Entreprise</span>
            <span>Zone</span>
            <span>Statut</span>
            <span>Score</span>
            <span className="sr-only">Ouvrir</span>
          </div>
          <div className="divide-y divide-border">
            {companies.map((company, index) => (
              <Link
                key={company.id}
                href={`/companies/${company.id}`}
                className="group relative grid gap-4 px-5 py-5 [content-visibility:auto] hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring lg:grid-cols-[3rem_1.4fr_0.8fr_0.65fr_0.55fr_3rem] lg:items-center"
              >
                <span className="absolute inset-y-0 left-0 w-1 bg-primary/70" aria-hidden="true" />
                <span className="font-data text-xs tabular-nums text-muted-foreground">
                  {String(result.offset + index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <h2 className="font-display truncate text-xl font-semibold tracking-[-0.035em] group-hover:text-primary">
                    {company.trade_name ?? company.legal_name}
                  </h2>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {company.subsector ?? company.sector ?? "Activité à qualifier"} ·{" "}
                    {company.employee_range ?? "taille inconnue"}
                  </p>
                  <p className="font-data mt-2 text-[0.62rem] uppercase tracking-[0.11em] text-muted-foreground">
                    Source · {company.sourceProvider ?? "manuelle"}
                  </p>
                </div>
                <p className="flex items-center gap-2 text-sm">
                  <MapPin className="size-3.5 text-primary" aria-hidden="true" />
                  {company.district ?? company.city}
                </p>
                <Badge>{COMPANY_STATUS_LABELS[company.status]}</Badge>
                <span className="font-display text-2xl font-semibold tabular-nums">
                  {company.qualification_score ?? "—"}
                  <span className="text-xs text-muted-foreground">/100</span>
                </span>
                <span className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:border-primary group-hover:text-primary">
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="grid min-h-80 place-items-center rounded-xl border border-dashed border-border bg-card px-6 text-center">
          <div className="max-w-md py-12">
            <Building2 className="mx-auto size-7 text-muted-foreground" aria-hidden="true" />
            <h2 className="font-display mt-5 text-2xl font-semibold tracking-[-0.03em]">
              Aucune entreprise dans ce filtre
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Modifiez la recherche ou importez une société fictive depuis l’Explorer.
            </p>
            <Link
              href="/explore"
              className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Explorer la carte
            </Link>
          </div>
        </section>
      )}
      <PaginationNav
        pathname="/companies"
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        params={{ q: query || undefined, status }}
      />
    </div>
  );
}
