import { ArrowLeft, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { getCampaignDetail } from "@/features/campaigns/server/queries";

interface EditCampaignPageProps {
  params: Promise<{ campaignId: string }>;
}

export default async function EditCampaignPage({ params }: EditCampaignPageProps) {
  const context = await requireAppAuthContext();
  const { campaignId } = await params;
  const campaign = await getCampaignDetail(context, campaignId);
  if (!campaign) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <Link
        href={`/campaigns/${campaign.id}`}
        className="inline-flex items-center gap-2 rounded-sm text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Retour au manifeste
      </Link>
      <header className="border-b border-border pb-7">
        <p className="font-data text-xs uppercase tracking-[0.17em] text-primary">
          Configuration figée et vérifiable
        </p>
        <h1 className="font-display mt-3 text-4xl font-semibold tracking-[-0.05em]">
          {campaign.name}
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
          La Phase 5 expose la configuration et protège les messages déjà générés. La modification
          avancée des modèles viendra après le parcours mock complet.
        </p>
      </header>
      <section className="grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold">Cadre d’envoi</h2>
            <LockKeyhole className="size-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Expéditeur</dt>
              <dd className="mt-1 font-semibold">{campaign.mailbox.email_address}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Ton</dt>
              <dd className="mt-1 font-semibold">{campaign.tone}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Limite quotidienne</dt>
              <dd className="mt-1 font-semibold">{campaign.daily_limit}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Statut</dt>
              <dd className="mt-2">
                <Badge>{campaign.status}</Badge>
              </dd>
            </div>
          </dl>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-2xl font-semibold">Délais paramétrés</h2>
          <ol className="mt-5 space-y-4">
            {campaign.steps.map((step) => (
              <li
                key={step.id}
                className="flex items-center justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {step.ai_instructions ?? `Étape ${step.position + 1}`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Position {step.position}</p>
                </div>
                <span className="font-data text-xs">
                  {step.position === 0 ? "J0" : `J+${step.delay_days}`}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
