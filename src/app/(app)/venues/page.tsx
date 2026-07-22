import { ArrowUpRight, Building2, MapPin, Plus, Search, TicketCheck, Users } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { listVenues } from "@/features/venues/server/queries";
import type { VenueStatusFilter } from "@/features/venues/types";
import { can } from "@/lib/permissions/roles";
import { cn } from "@/lib/utils";

interface VenuesPageProps {
  searchParams: Promise<{ q?: string; status?: string }>;
}

function statusFilter(value: string | undefined): VenueStatusFilter {
  return value === "inactive" || value === "all" ? value : "active";
}

function capacityLabel(seated: number | null, standing: number | null): string {
  if (standing !== null && seated !== null) return `${seated} assis · ${standing} debout`;
  if (standing !== null) return `${standing} debout`;
  if (seated !== null) return `${seated} assis`;
  return "Jauge à confirmer";
}

function coordinateLabel(latitude: number | null, longitude: number | null): string {
  if (latitude === null || longitude === null) return "GÉO À CONFIRMER";
  return `${latitude.toFixed(4)}° N · ${longitude.toFixed(4)}° E`;
}

export default async function VenuesPage({ searchParams }: VenuesPageProps) {
  const context = await requireAppAuthContext();
  const params = await searchParams;
  const status = statusFilter(params.status);
  const query = params.q?.trim() ?? "";
  const allVenues = await listVenues(context, { query, status: "all" });
  const venues = allVenues.filter((venue) =>
    status === "all" ? true : status === "active" ? venue.is_active : !venue.is_active,
  );
  const canEdit = can(context.membership.role, "venues:write") && !context.isPreview;
  const activeCount = allVenues.filter((venue) => venue.is_active).length;
  const activeOffers = allVenues.reduce((sum, venue) => sum + venue.activeOfferCount, 0);

  return (
    <div className="mx-auto max-w-[90rem] space-y-7">
      <header className="grid gap-6 border-b border-border pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="font-data text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Registre des lieux · Paris
          </p>
          <h1 className="font-display mt-3 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
            Les établissements, sans zone d’ombre.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Capacités, usages, offres et documents réunis dans un dossier commercial vérifiable.
          </p>
        </div>
        {canEdit ? (
          <Link href="/venues/new" className={cn(buttonVariants(), "h-11")}>
            <Plus className="size-4" aria-hidden="true" />
            Ajouter un établissement
          </Link>
        ) : null}
      </header>

      <section
        aria-label="Résumé du registre"
        className="grid overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-3"
      >
        <div className="border-b border-border p-4 sm:border-b-0 sm:border-r sm:p-5">
          <p className="font-data text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Dossiers actifs
          </p>
          <p className="font-display mt-2 text-3xl font-semibold tracking-[-0.04em]">
            {activeCount}
          </p>
        </div>
        <div className="border-b border-border p-4 sm:border-b-0 sm:border-r sm:p-5">
          <p className="font-data text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Offres actives
          </p>
          <p className="font-display mt-2 text-3xl font-semibold tracking-[-0.04em]">
            {activeOffers}
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="font-data text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Données à consolider
          </p>
          <p className="mt-2 text-sm font-semibold text-foreground">
            {allVenues.filter((venue) => venue.latitude === null).length} géolocalisation(s)
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Aucune information n’est inventée.</p>
        </div>
      </section>

      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          className="flex w-fit rounded-lg border border-border bg-card p-1"
          aria-label="Filtrer par statut"
        >
          {(
            [
              ["active", "Actifs"],
              ["inactive", "Inactifs"],
              ["all", "Tous"],
            ] as const
          ).map(([value, label]) => (
            <Link
              key={value}
              href={`/venues?status=${value}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
              className={cn(
                "rounded-md px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                status === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {label}
            </Link>
          ))}
        </div>
        <form className="relative w-full lg:max-w-sm" action="/venues">
          <input type="hidden" name="status" value={status} />
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <label htmlFor="venue-search" className="sr-only">
            Rechercher un établissement
          </label>
          <input
            id="venue-search"
            name="q"
            defaultValue={query}
            placeholder="Rechercher par nom…"
            autoComplete="off"
            className="h-11 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
          />
        </form>
      </section>

      {venues.length > 0 ? (
        <section
          aria-label="Établissements"
          className="overflow-hidden rounded-xl border border-border bg-card"
        >
          <div className="hidden grid-cols-[4rem_1.5fr_1fr_1fr_7rem_3rem] gap-4 border-b border-border bg-muted/45 px-5 py-3 font-data text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-muted-foreground lg:grid">
            <span>Dossier</span>
            <span>Établissement</span>
            <span>Jauge</span>
            <span>Position</span>
            <span>Offres</span>
            <span className="sr-only">Ouvrir</span>
          </div>
          <div className="divide-y divide-border">
            {venues.map((venue, index) => (
              <Link
                key={venue.id}
                href={`/venues/${venue.id}`}
                className="group relative grid gap-4 px-5 py-5 [content-visibility:auto] transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring lg:grid-cols-[4rem_1.5fr_1fr_1fr_7rem_3rem] lg:items-center"
              >
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 w-1",
                    venue.is_active ? "bg-primary" : "bg-muted-foreground/30",
                  )}
                  aria-hidden="true"
                />
                <span className="font-data text-xs tabular-nums text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display truncate text-xl font-semibold tracking-[-0.035em] group-hover:text-primary">
                      {venue.name}
                    </h2>
                    {!venue.is_active ? <Badge>Inactif</Badge> : null}
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-3.5" aria-hidden="true" />
                    {[venue.venue_type, venue.district, venue.city].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Users className="size-4 text-primary" aria-hidden="true" />
                    {capacityLabel(venue.capacity_seated, venue.capacity_standing)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Min. {venue.minimum_guests ?? "à confirmer"}
                  </p>
                </div>
                <div>
                  <p className="font-data text-[0.7rem] font-semibold tracking-[0.08em] text-muted-foreground">
                    {coordinateLabel(venue.latitude, venue.longitude)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {venue.atmosphere ?? "Ambiance à compléter"}
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <TicketCheck className="size-4 text-primary" aria-hidden="true" />
                    {venue.activeOfferCount} active(s)
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{venue.offerCount} au total</p>
                </div>
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
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-accent text-accent-foreground">
              <Building2 className="size-5" aria-hidden="true" />
            </span>
            <h2 className="font-display mt-5 text-2xl font-semibold tracking-[-0.03em]">
              Aucun dossier dans ce filtre
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Modifiez le statut ou la recherche. Vous pouvez aussi créer un nouvel établissement.
            </p>
            {canEdit ? (
              <Link href="/venues/new" className={cn(buttonVariants(), "mt-5")}>
                <Plus className="size-4" aria-hidden="true" />
                Ajouter un établissement
              </Link>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
