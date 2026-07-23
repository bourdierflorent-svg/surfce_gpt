import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { OpportunityForm } from "@/features/opportunities/components/opportunity-form";
import { getOpportunityFormOptions } from "@/features/opportunities/server/queries";
import { can } from "@/lib/permissions/roles";

export default async function NewOpportunityPage() {
  const context = await requireAppAuthContext();
  const options = await getOpportunityFormOptions(context);
  const writable = can(context.membership.role, "opportunities:write") && !context.isPreview;
  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <Link
        href="/opportunities"
        className="inline-flex items-center gap-2 rounded-sm text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Retour au pipeline
      </Link>
      <header className="border-b border-border pb-7">
        <p className="font-data text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Nouveau dossier commercial
        </p>
        <h1 className="font-display mt-3 text-balance text-4xl font-semibold tracking-[-0.05em]">
          Donner une valeur et une prochaine action au signal.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Le montant pondéré sera calculé à partir de l’étape choisie. Chaque modification future
          restera visible dans l’historique.
        </p>
      </header>
      {!writable ? (
        <p className="rounded-lg border border-warning/25 bg-warning/10 p-4 text-sm">
          Le mode aperçu et les rôles en lecture seule ne peuvent pas créer de dossier.
        </p>
      ) : null}
      <OpportunityForm options={options} disabled={!writable} />
    </div>
  );
}
