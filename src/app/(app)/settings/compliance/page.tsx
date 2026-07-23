import { ArrowRight, CheckCircle2, Clock3, DatabaseZap, FileKey2, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import {
  ComplianceSettingsForm,
  PrivacyRequestForm,
  RetentionSimulationButton,
} from "@/features/compliance/components/compliance-actions";
import { getComplianceCenter } from "@/features/compliance/server/queries";
import { can } from "@/lib/permissions/roles";
import type { Json } from "@/types/database";

function reportValue(report: Json, key: string) {
  if (!report || typeof report !== "object" || Array.isArray(report)) return 0;
  const value = report[key];
  return typeof value === "number" ? value : 0;
}

export default async function CompliancePage() {
  const context = await requireAppAuthContext();
  const center = await getComplianceCenter(context);
  const canWrite = can(context.membership.role, "compliance:write") && !context.isPreview;
  const canSimulate = can(context.membership.role, "retention:simulate") && !context.isPreview;
  const canProcess = can(context.membership.role, "privacy:write") && !context.isPreview;
  const diagnostics = [
    ["Contacts actifs", center.diagnostics.activeContacts, "Périmètre courant"],
    ["Base légale absente", center.diagnostics.missingLawfulBasis, "À documenter"],
    ["Oppositions", center.diagnostics.suppressedContacts, "Preuve conservée"],
    ["Candidats rétention", center.diagnostics.deletionCandidates, "Selon la politique"],
    ["Sources documentées", center.diagnostics.documentedSources, "Contacts couverts"],
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Gouvernance des données
          </p>
          <h1 className="mt-2 text-balance font-display text-4xl font-semibold tracking-[-0.04em]">
            Conformité, avec preuve.
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
            Base légale, opposition, rétention et droits des personnes sont configurés par
            organisation. Les actions sensibles sont bornées, auditées et minimisent les données.
          </p>
        </div>
        <Link
          href="/settings/audit"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Consulter le journal d’audit
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </header>

      <section
        aria-label="Diagnostic de conformité"
        className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 xl:grid-cols-5"
      >
        {diagnostics.map(([label, value, note]) => (
          <article key={String(label)} className="bg-card p-4">
            <p className="text-xs font-semibold text-muted-foreground">{label}</p>
            <p className="mt-2 font-data text-3xl font-semibold">{value}</p>
            <p className="mt-3 text-xs text-muted-foreground">{note}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Politique de conservation</CardTitle>
                <CardDescription>
                  Les durées s’appliquent au prochain traitement planifié.
                </CardDescription>
              </div>
              <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent>
            <ComplianceSettingsForm settings={center.settings} canWrite={canWrite} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Contrôle avant exécution</CardTitle>
                <CardDescription>
                  La simulation compte les lignes éligibles sans les modifier.
                </CardDescription>
              </div>
              <DatabaseZap className="size-5 text-primary" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <RetentionSimulationButton canSimulate={canSimulate} />
            <div className="border-t border-border pt-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Derniers rapports
              </h3>
              <div className="mt-3 space-y-3">
                {center.retentionRuns.length ? (
                  center.retentionRuns.slice(0, 5).map((run) => (
                    <article key={run.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Badge>{run.mode === "simulation" ? "Simulation" : "Exécution"}</Badge>
                          <span className="text-xs text-muted-foreground">{run.status}</span>
                        </div>
                        <time
                          className="font-data text-[10px] text-muted-foreground"
                          dateTime={run.created_at}
                        >
                          {new Intl.DateTimeFormat("fr-FR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          }).format(new Date(run.created_at))}
                        </time>
                      </div>
                      <p className="mt-3 font-data text-xs leading-5 text-muted-foreground">
                        {reportValue(run.report, "contacts")} contacts ·{" "}
                        {reportValue(run.report, "messages")} messages ·{" "}
                        {reportValue(run.report, "provider_jobs")} journaux providers
                      </p>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune simulation enregistrée.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Droits des personnes</CardTitle>
                <CardDescription>
                  Export d’accès, anonymisation ou suppression après vérification de l’identité.
                </CardDescription>
              </div>
              <FileKey2 className="size-5 text-primary" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent>
            <PrivacyRequestForm contacts={center.contacts} canProcess={canProcess} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Garde-fous actifs</CardTitle>
            <CardDescription>Invariants appliqués par la base et les services.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {[
                "RLS par organisation sur réglages, exports, rétention et demandes.",
                "Opposition globale conservée avant toute anonymisation.",
                "Séquences actives stoppées lors d’une demande ou d’une rétention.",
                "Tokens OAuth chiffrés et absents des exports.",
                "Tracking comportemental désactivé par défaut.",
                "Exécution de rétention réservée au service planifié.",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6">
                  <CheckCircle2 className="mt-1 size-4 shrink-0 text-success" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Traçabilité récente</CardTitle>
              <CardDescription>
                Métadonnées uniquement : aucun fichier exporté ni contenu personnel dupliqué.
              </CardDescription>
            </div>
            <Clock3 className="size-5 text-primary" aria-hidden="true" />
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Exports
            </h3>
            <ul className="mt-3 divide-y divide-border">
              {center.exports.slice(0, 5).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <span>
                    {item.export_type} · {item.row_count} ligne(s)
                  </span>
                  <time
                    className="font-data text-[10px] text-muted-foreground"
                    dateTime={item.created_at}
                  >
                    {new Intl.DateTimeFormat("fr-FR").format(new Date(item.created_at))}
                  </time>
                </li>
              ))}
              {!center.exports.length ? (
                <li className="py-3 text-sm text-muted-foreground">Aucun export.</li>
              ) : null}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Demandes
            </h3>
            <ul className="mt-3 divide-y divide-border">
              {center.privacyRequests.slice(0, 5).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <span>
                    {item.request_type} · {item.status}
                  </span>
                  <time
                    className="font-data text-[10px] text-muted-foreground"
                    dateTime={item.created_at}
                  >
                    {new Intl.DateTimeFormat("fr-FR").format(new Date(item.created_at))}
                  </time>
                </li>
              ))}
              {!center.privacyRequests.length ? (
                <li className="py-3 text-sm text-muted-foreground">Aucune demande.</li>
              ) : null}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
