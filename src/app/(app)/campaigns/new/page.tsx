import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { CampaignBuilder } from "@/features/campaigns/components/campaign-builder";
import { getCampaignFormOptions } from "@/features/campaigns/server/queries";

export default async function NewCampaignPage() {
  const context = await requireAppAuthContext();
  const options = await getCampaignFormOptions(context);

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-2 rounded-sm text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Toutes les campagnes
      </Link>
      <header className="border-b border-border pb-7">
        <p className="font-data text-xs uppercase tracking-[0.18em] text-primary">
          Nouveau manifeste d’envoi
        </p>
        <h1 className="font-display mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
          Composer le cadre avant le message.
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
          Les délais restent paramétrables, le premier message exige une validation et la boîte mock
          ne livre aucun e-mail réel.
        </p>
      </header>
      <CampaignBuilder
        mailboxes={options.mailboxes}
        venues={options.venues}
        offers={options.offers}
      />
    </div>
  );
}
