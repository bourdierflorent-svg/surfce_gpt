import { Filter, Fingerprint } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { auditFiltersSchema } from "@/features/compliance/schemas";
import { getAuditLedger } from "@/features/compliance/server/queries";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AuditPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const flat = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
  const parsed = auditFiltersSchema.safeParse(flat);
  const filters = parsed.success ? parsed.data : {};
  const context = await requireAppAuthContext();
  const ledger = await getAuditLedger(context, filters);

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
          Registre immuable
        </p>
        <h1 className="mt-2 text-balance font-display text-4xl font-semibold tracking-[-0.04em]">
          Journal d’audit
        </h1>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
          Qui a fait quoi, sur quelle entité et à quel moment. Les changements sont résumés sans
          réafficher les valeurs personnelles.
        </p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-primary" aria-hidden="true" />
            <CardTitle>Filtrer le registre</CardTitle>
          </div>
          <CardDescription>
            Les résultats sont limités aux 100 événements les plus récents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form autoComplete="off" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
              Action
              <Select name="action" defaultValue={filters.action ?? ""}>
                <option value="">Toutes</option>
                {ledger.actions.map((action) => (
                  <option key={action}>{action}</option>
                ))}
              </Select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
              Entité
              <Select name="entityType" defaultValue={filters.entityType ?? ""}>
                <option value="">Toutes</option>
                {ledger.entityTypes.map((entity) => (
                  <option key={entity}>{entity}</option>
                ))}
              </Select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
              Acteur
              <Select name="actor" defaultValue={filters.actor ?? ""}>
                <option value="">Tous</option>
                {ledger.actors.map((actor) => (
                  <option key={actor.id} value={actor.id}>
                    {actor.label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
              Du
              <Input name="start" type="date" defaultValue={filters.start ?? ""} />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
              Au
              <Input name="end" type="date" defaultValue={filters.end ?? ""} />
            </label>
            <button
              type="submit"
              className={buttonVariants({ size: "sm", className: "sm:col-span-2 lg:col-span-1" })}
            >
              Appliquer
            </button>
          </form>
        </CardContent>
      </Card>

      <section aria-label="Événements d’audit" className="space-y-3">
        {ledger.entries.map((entry) => (
          <article
            key={entry.id}
            className="grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-[12rem_1fr_auto] md:items-center"
          >
            <div>
              <time className="font-data text-xs text-muted-foreground" dateTime={entry.created_at}>
                {new Intl.DateTimeFormat("fr-FR", {
                  dateStyle: "short",
                  timeStyle: "medium",
                }).format(new Date(entry.created_at))}
              </time>
              <p className="mt-1 truncate text-sm font-semibold">{entry.actorLabel}</p>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{entry.action}</Badge>
                <span className="font-data text-xs text-muted-foreground">{entry.entity_type}</span>
              </div>
              <p className="mt-2 truncate text-xs text-muted-foreground">
                Champs modifiés :{" "}
                {entry.changedFields.length
                  ? entry.changedFields.join(", ")
                  : "métadonnées de création"}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Fingerprint className="size-4" aria-hidden="true" />
              <span className="font-data">{entry.entity_id?.slice(0, 8) ?? "système"}</span>
            </div>
          </article>
        ))}
        {!ledger.entries.length ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Aucun événement ne correspond à ces filtres.
            </CardContent>
          </Card>
        ) : null}
      </section>
    </div>
  );
}
