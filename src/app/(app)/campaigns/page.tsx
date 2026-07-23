import { ArrowUpRight, CalendarClock, Megaphone, Send, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { listCampaigns } from "@/features/campaigns/server/queries";

const statusLabels = {
  draft: "Brouillon",
  pending_approval: "À valider",
  approved: "Approuvée",
  scheduled: "Planifiée",
  active: "Active",
  paused: "En pause",
  completed: "Terminée",
  cancelled: "Annulée",
} as const;

export default async function CampaignsPage() {
  const context = await requireAppAuthContext();
  const campaigns = await listCampaigns(context);

  return (
    <div className="mx-auto max-w-[90rem] space-y-7">
      <header className="grid gap-6 border-b border-border pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="font-data text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Bureau d’expédition · Faible volume
          </p>
          <h1 className="font-display mt-3 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
            Chaque message avance avec sa preuve et son feu vert.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Génération mock, validation humaine, créneaux ouvrés et opposition atomique avant tout
            envoi simulé.
          </p>
        </div>
        <Link
          href="/campaigns/new"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Nouvelle campagne
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </header>

      <section className="grid overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-3">
        <div className="border-b border-border p-5 sm:border-b-0 sm:border-r">
          <Megaphone className="size-4 text-primary" aria-hidden="true" />
          <p className="font-display mt-3 text-3xl font-semibold">{campaigns.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">campagnes</p>
        </div>
        <div className="border-b border-border p-5 sm:border-b-0 sm:border-r">
          <Send className="size-4 text-primary" aria-hidden="true" />
          <p className="font-display mt-3 text-3xl font-semibold">
            {campaigns.reduce((sum, campaign) => sum + campaign.sentCount, 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">envois mock dédupliqués</p>
        </div>
        <div className="p-5">
          <ShieldCheck className="size-4 text-success" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold">Arrêt avant livraison</p>
          <p className="mt-1 text-xs text-muted-foreground">e-mail, contact, société et domaine</p>
        </div>
      </section>

      {campaigns.length ? (
        <section className="space-y-3">
          {campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/campaigns/${campaign.id}`}
              className="group grid gap-5 rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:grid-cols-[1.2fr_0.8fr_0.6fr_auto] lg:items-center"
            >
              <div className="min-w-0">
                <p className="font-data text-[0.65rem] uppercase tracking-[0.13em] text-muted-foreground">
                  {campaign.language} · {campaign.tone}
                </p>
                <h2 className="break-words font-display mt-2 text-2xl font-semibold tracking-[-0.04em] group-hover:text-primary">
                  {campaign.name}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {campaign.description ?? "Objectif à préciser"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expéditeur</p>
                <p className="mt-1 break-all text-sm font-semibold">{campaign.mailboxAddress}</p>
              </div>
              <div className="flex gap-5">
                <div>
                  <p className="font-display text-2xl font-semibold">{campaign.enrollmentCount}</p>
                  <p className="text-xs text-muted-foreground">contacts</p>
                </div>
                <div>
                  <p className="font-display text-2xl font-semibold">{campaign.sentCount}</p>
                  <p className="text-xs text-muted-foreground">envoyés</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge>{statusLabels[campaign.status]}</Badge>
                <span className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground group-hover:border-primary group-hover:text-primary">
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <section className="grid min-h-72 place-items-center rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <div>
            <CalendarClock className="mx-auto size-7 text-muted-foreground" aria-hidden="true" />
            <h2 className="font-display mt-4 text-2xl font-semibold">Aucune campagne</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Commencez par un brouillon à faible volume.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
