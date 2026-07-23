import { ArrowLeft, LockKeyhole, MailCheck, PlugZap } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { getCampaignFormOptions } from "@/features/campaigns/server/queries";

export default async function MailboxesSettingsPage() {
  const context = await requireAppAuthContext();
  const { mailboxes } = await getCampaignFormOptions(context);

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <Link
        href="/settings/organization"
        className="inline-flex items-center gap-2 rounded-sm text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Paramètres de l’organisation
      </Link>
      <header className="border-b border-border pb-7">
        <p className="font-data text-xs uppercase tracking-[0.17em] text-primary">
          Phase 5 · Connexion simulée
        </p>
        <h1 className="font-display mt-3 text-4xl font-semibold tracking-[-0.05em]">
          Boîtes d’expédition
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
          Aucune autorisation Gmail ou Microsoft n’est demandée. La boîte mock produit des
          identifiants déterministes sans livrer d’e-mail.
        </p>
      </header>
      <section className="space-y-3">
        {mailboxes.map((mailbox) => (
          <article
            key={mailbox.id}
            className="grid gap-5 rounded-xl border border-border bg-card p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center"
          >
            <span className="grid size-11 place-items-center rounded-full bg-accent text-accent-foreground">
              <MailCheck className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-xl font-semibold">{mailbox.display_name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{mailbox.email_address}</p>
              <p className="font-data mt-2 text-[0.62rem] uppercase tracking-[0.11em] text-muted-foreground">
                {mailbox.provider} · aucun token stocké
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge>{mailbox.status}</Badge>
              <span className="text-xs text-muted-foreground">
                {mailbox.sent_today}/{mailbox.daily_send_limit}
              </span>
            </div>
          </article>
        ))}
        {!mailboxes.length ? (
          <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-border bg-card p-8 text-center">
            <div>
              <PlugZap className="mx-auto size-7 text-muted-foreground" aria-hidden="true" />
              <p className="mt-4 font-semibold">Aucune boîte mock initialisée</p>
              <p className="mt-2 text-sm text-muted-foreground">Appliquez le seed de Phase 5.</p>
            </div>
          </div>
        ) : null}
      </section>
      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
        <LockKeyhole className="mt-1 size-4 shrink-0" aria-hidden="true" />
        Les tokens OAuth, la synchronisation et les webhooks appartiennent à la Phase 6.
      </div>
    </div>
  );
}
