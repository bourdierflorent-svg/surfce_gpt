import { ArrowDownToLine, CircleAlert, Gauge, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { parseAnalyticsFilters } from "@/features/analytics/schemas";
import { getAnalyticsReport } from "@/features/analytics/server/queries";
import type { AnalyticsOption, BreakdownRow } from "@/features/analytics/types";
import { can } from "@/lib/permissions/roles";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const unitFormatters = {
  count: (value: number) => new Intl.NumberFormat("fr-FR").format(value),
  currency: (value: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value),
  hours: (value: number) =>
    `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value)} h`,
  days: (value: number) =>
    `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value)} j`,
};

function FilterSelect({
  label,
  name,
  options,
  value,
}: {
  label: string;
  name: string;
  options: AnalyticsOption[];
  value?: string;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
      {label}
      <Select name={name} defaultValue={value ?? ""} className="h-10 bg-card text-foreground">
        <option value="">Tous</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </label>
  );
}

function Breakdown({ label, rows }: { label: string; rows: BreakdownRow[] }) {
  const max = Math.max(...rows.map((row) => row.count), 1);
  return (
    <section aria-label={label}>
      <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </h3>
      <div className="mt-3 space-y-3">
        {rows.length ? (
          rows.slice(0, 6).map((row) => (
            <div key={row.key}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-medium">{row.label}</span>
                <span className="font-data text-xs text-muted-foreground">
                  {row.count} · {unitFormatters.currency(row.amount)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max((row.count / max) * 100, 4)}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Aucune donnée sur cette période.</p>
        )}
      </div>
    </section>
  );
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const rawSearchParams = await searchParams;
  const filters = parseAnalyticsFilters(rawSearchParams);
  const context = await requireAppAuthContext();
  const report = await getAnalyticsReport(context, filters);
  const exportParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) exportParams.set(key, value);
  });
  const primaryMetrics = report.metrics.filter((item) =>
    ["revenue", "weighted_revenue", "opportunities", "cost_per_opportunity"].includes(item.key),
  );
  const operatingMetrics = report.metrics.filter(
    (item) =>
      !primaryMetrics.includes(item) &&
      !["avg_response_delay", "avg_cycle_duration"].includes(item.key),
  );
  const durationMetrics = report.metrics.filter((item) =>
    ["avg_response_delay", "avg_cycle_duration"].includes(item.key),
  );
  const monitoring = [
    { label: "Rebonds", value: report.monitoring.bounced, display: report.monitoring.bounced },
    {
      label: "Échecs d’envoi",
      value: report.monitoring.failed,
      display: report.monitoring.failed,
    },
    {
      label: "Providers en échec",
      value: report.monitoring.providerFailures,
      display: report.monitoring.providerFailures,
    },
    {
      label: "Boîtes en erreur",
      value: report.monitoring.mailboxErrors,
      display: report.monitoring.mailboxErrors,
    },
    {
      label: "Tâches en retard",
      value: report.monitoring.overdueTasks,
      display: report.monitoring.overdueTasks,
    },
    {
      label: "Quotas bloqués",
      value: report.monitoring.quotaBlocks,
      display: report.monitoring.quotaBlocks,
    },
    {
      label: "Taux d’erreur providers",
      value: report.monitoring.providerErrorRate,
      display: `${report.monitoring.providerErrorRate.toFixed(1)} %`,
    },
    {
      label: "Durée moyenne providers",
      value: 0,
      display: `${Math.round(report.monitoring.providerAverageDurationMs)} ms`,
    },
  ];
  const hasMonitoringAlert = monitoring.some((item) => item.value > 0);

  return (
    <div className="mx-auto max-w-[1480px] space-y-7">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Phase 8 · Mesure & preuve
          </p>
          <h1 className="mt-2 text-balance font-display text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
            Le signal, du prospect au revenu.
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
            Chaque nombre est borné par une période, un périmètre RLS et une source explicite. Les
            filtres s’appliquent à toute la chaîne de conversion.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>
            {filters.start} → {filters.end}
          </Badge>
          {can(context.membership.role, "analytics:export") ? (
            <a
              href={`/api/analytics/export?${exportParams.toString()}`}
              className={buttonVariants({ variant: "secondary" })}
            >
              <ArrowDownToLine className="size-4" aria-hidden="true" />
              Export CSV audité
            </a>
          ) : null}
        </div>
      </header>

      <details className="group rounded-xl border border-border bg-card" open>
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-primary" aria-hidden="true" />
            Périmètre de lecture
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            11 dimensions · période max. 366 jours
          </span>
        </summary>
        <form
          autoComplete="off"
          className="grid gap-3 border-t border-border p-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6"
        >
          <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
            Du
            <Input type="date" name="start" defaultValue={filters.start} className="h-10 bg-card" />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
            Au
            <Input type="date" name="end" defaultValue={filters.end} className="h-10 bg-card" />
          </label>
          <FilterSelect
            label="Responsable"
            name="owner"
            value={filters.owner}
            options={report.options.owners}
          />
          <FilterSelect
            label="Campagne"
            name="campaign"
            value={filters.campaign}
            options={report.options.campaigns}
          />
          <FilterSelect
            label="Secteur"
            name="sector"
            value={filters.sector}
            options={report.options.sectors}
          />
          <FilterSelect
            label="Zone"
            name="zone"
            value={filters.zone}
            options={report.options.zones}
          />
          <FilterSelect
            label="Lieu"
            name="venue"
            value={filters.venue}
            options={report.options.venues}
          />
          <FilterSelect
            label="Offre"
            name="offer"
            value={filters.offer}
            options={report.options.offers}
          />
          <FilterSelect
            label="Source"
            name="source"
            value={filters.source}
            options={report.options.sources}
          />
          <FilterSelect
            label="Taille"
            name="companySize"
            value={filters.companySize}
            options={report.options.companySizes}
          />
          <FilterSelect
            label="Statut entreprise"
            name="companyStatus"
            value={filters.companyStatus}
            options={report.options.companyStatuses}
          />
          <FilterSelect
            label="Étape"
            name="stage"
            value={filters.stage}
            options={report.options.stages}
          />
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4 xl:col-span-6">
            <button type="submit" className={buttonVariants({ size: "sm" })}>
              Appliquer
            </button>
            <Link href="/analytics" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Réinitialiser
            </Link>
          </div>
        </form>
      </details>

      <section
        aria-labelledby="conversion-title"
        className="overflow-hidden rounded-2xl bg-primary text-primary-foreground"
      >
        <div className="flex flex-col gap-2 border-b border-white/15 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground/65">
              Ligne de conversion
            </p>
            <h2 id="conversion-title" className="mt-1 text-xl font-semibold">
              Volume → passage → résultat
            </h2>
          </div>
          <p className="text-xs text-primary-foreground/65">
            Taux calculé sur l’étape immédiatement précédente
          </p>
        </div>
        <ol className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-9">
          {report.funnel.map((step, index) => (
            <li
              key={step.key}
              className="relative border-b border-r border-white/15 p-4 last:border-r-0 xl:border-b-0"
            >
              <span className="font-data text-2xl font-semibold tracking-tight">{step.value}</span>
              <span className="mt-1 block text-xs text-primary-foreground/72">{step.label}</span>
              {index ? (
                <span className="mt-4 block font-data text-[11px] text-primary-foreground/58">
                  {step.rate === null ? "—" : `${step.rate.toFixed(1)} %`} · base {step.denominator}
                </span>
              ) : (
                <span className="mt-4 block font-data text-[11px] text-primary-foreground/58">
                  base d’entrée
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-label="Indicateurs économiques"
        className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 xl:grid-cols-4"
      >
        {primaryMetrics.map((item) => (
          <article key={item.key} className="bg-card p-5">
            <p className="text-xs font-semibold text-muted-foreground">{item.label}</p>
            <p className="mt-2 font-data text-3xl font-semibold tracking-[-0.04em]">
              {unitFormatters[item.unit](item.value)}
            </p>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              {item.definition} <span className="font-data">[{item.source}]</span>
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader>
            <CardTitle>Preuves opérationnelles</CardTitle>
            <CardDescription>
              Comptages de période, sans cumul historique implicite.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {[...operatingMetrics, ...durationMetrics].map((item) => (
              <article key={item.key} className="bg-card p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium">{item.label}</span>
                  <strong className="font-data text-lg">
                    {unitFormatters[item.unit](item.value)}
                  </strong>
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  {item.definition}
                  <br />
                  <span className="font-data text-[10px]">{item.source}</span>
                </p>
              </article>
            ))}
          </CardContent>
        </Card>

        <Card className={hasMonitoringAlert ? "border-warning/45" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Vigie d’exploitation</CardTitle>
                <CardDescription>
                  Signaux à traiter, jamais noyés dans la conversion.
                </CardDescription>
              </div>
              {hasMonitoringAlert ? (
                <CircleAlert className="size-5 text-warning" aria-hidden="true" />
              ) : (
                <Gauge className="size-5 text-success" aria-hidden="true" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border">
              {monitoring.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-4 py-3 text-sm"
                >
                  <dt className="text-muted-foreground">{item.label}</dt>
                  <dd className="font-data font-semibold">{item.display}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Répartition du pipeline</CardTitle>
          <CardDescription>
            Opportunités créées dans le périmètre et montants associés.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
          <Breakdown label="Étapes" rows={report.breakdowns.stages} />
          <Breakdown label="Responsables" rows={report.breakdowns.owners} />
          <Breakdown label="Sources" rows={report.breakdowns.sources} />
          <Breakdown label="Campagnes" rows={report.breakdowns.campaigns} />
        </CardContent>
      </Card>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
        <span>
          Généré le{" "}
          {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(
            new Date(report.generatedAt),
          )}
        </span>
        <span>Tracking comportemental : désactivé par défaut · export sans colonne sensible</span>
      </footer>
    </div>
  );
}
