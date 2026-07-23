import { ArrowLeft, LockKeyhole } from "lucide-react";
import Link from "next/link";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { StageConfigurationForm } from "@/features/opportunities/components/stage-configuration-form";
import { listOpportunityStages } from "@/features/opportunities/server/queries";

export default async function OpportunityStagesPage() {
  const context = await requireAppAuthContext();
  const stages = await listOpportunityStages(context);
  const writable =
    !context.isPreview && ["admin", "sales_manager"].includes(context.membership.role);

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <Link
        href="/opportunities"
        className="inline-flex items-center gap-2 rounded-sm text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Retour au pipeline
      </Link>
      <header className="grid gap-5 border-b border-border pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="font-data text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Configuration organisation
          </p>
          <h1 className="font-display mt-3 text-balance text-4xl font-semibold tracking-[-0.05em]">
            Les jalons portent la probabilité du pipeline.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Renommez une étape, ajustez sa probabilité ou masquez-la pour les nouveaux dossiers. Les
            positions et étapes terminales restent protégées afin de préserver l’historique.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
          <LockKeyhole className="size-4" aria-hidden="true" />
          Admin ou responsable commercial
        </div>
      </header>
      {!writable ? (
        <p className="rounded-lg border border-warning/25 bg-warning/10 p-4 text-sm">
          Cette configuration est visible mais non modifiable avec votre rôle ou en mode aperçu.
        </p>
      ) : null}
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="hidden grid-cols-[5rem_1fr_9rem_8rem_auto] gap-3 border-b border-border bg-muted/45 px-5 py-3 font-data text-[0.64rem] uppercase tracking-[0.12em] text-muted-foreground lg:grid">
          <span>Position</span>
          <span>Libellé</span>
          <span>Probabilité</span>
          <span>Visibilité</span>
          <span>Action</span>
        </div>
        {stages.map((stage) => (
          <StageConfigurationForm key={stage.id} stage={stage} disabled={!writable} />
        ))}
      </section>
    </div>
  );
}
