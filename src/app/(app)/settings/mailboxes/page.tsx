import { ArrowLeft, CheckCircle2, KeyRound, LockKeyhole, MailCheck, PlugZap } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { getCampaignFormOptions } from "@/features/campaigns/server/queries";
import { MailboxActions } from "@/features/mailboxes/components/mailbox-actions";
import { getMailboxConfigurationStatus, providerLabel } from "@/features/mailboxes/server/service";
import { can } from "@/lib/permissions/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface MailboxesSettingsPageProps {
  searchParams: Promise<{ connected?: string; error?: string }>;
}

function formatDate(value: string | null) {
  if (!value) return "Jamais";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(value));
}

export default async function MailboxesSettingsPage({ searchParams }: MailboxesSettingsPageProps) {
  const context = await requireAppAuthContext();
  const params = await searchParams;
  const writable = can(context.membership.role, "mailboxes:write") && !context.isPreview;
  const configuration = getMailboxConfigurationStatus();
  const mailboxes = context.isPreview
    ? (await getCampaignFormOptions(context)).mailboxes
    : ((
        await (
          await createSupabaseServerClient()
        )
          .from("mailboxes")
          .select("*")
          .eq("organization_id", context.organization.id)
          .order("created_at", { ascending: false })
      ).data ?? []);
  const providers = [
    {
      id: "google" as const,
      name: "Google Workspace",
      description: "Gmail API, historique incrémental et watch Pub/Sub.",
      ready: configuration.google && configuration.encryption,
    },
    {
      id: "microsoft" as const,
      name: "Microsoft 365",
      description: "Microsoft Graph, delta query et notification webhook.",
      ready: configuration.microsoft && configuration.encryption,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <Link
        href="/settings/organization"
        className="inline-flex items-center gap-2 rounded-sm text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Paramètres de l’organisation
      </Link>

      <header className="grid gap-6 border-b border-border pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="font-data text-xs uppercase tracking-[0.17em] text-primary">
            Phase 6 · Connexions chiffrées
          </p>
          <h1 className="font-display mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
            Boîtes de correspondance
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
            Chaque consentement OAuth est lié à votre compte SURFCE. Les tokens sont chiffrés côté
            serveur, puis utilisés pour synchroniser et répondre sans jamais apparaître dans
            l’interface.
          </p>
        </div>
        <Link
          href="/inbox"
          className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Ouvrir les conversations
        </Link>
      </header>

      {params.connected ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-success/20 bg-success/8 p-4 text-sm text-success"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          La boîte est connectée. Sa synchronisation initiale peut maintenant être lancée.
        </div>
      ) : null}
      {params.error ? (
        <div
          role="alert"
          className="rounded-xl border border-danger/20 bg-danger/8 p-4 text-sm text-danger"
        >
          La connexion n’a pas abouti ({params.error.replaceAll("_", " ")}). Vérifiez les variables
          et l’URI de redirection du provider.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        {providers.map((provider) => (
          <article
            key={provider.id}
            className="relative overflow-hidden rounded-xl border border-border bg-card p-6"
          >
            <div className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden="true" />
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-11 place-items-center rounded-full bg-accent text-accent-foreground">
                <PlugZap className="size-5" aria-hidden="true" />
              </span>
              <Badge
                className={
                  provider.ready
                    ? "border-success/20 bg-success/8 text-success"
                    : "border-warning/20 bg-warning/8 text-warning"
                }
              >
                {provider.ready ? "Prêt" : "Configuration requise"}
              </Badge>
            </div>
            <h2 className="font-display mt-6 text-2xl font-semibold">{provider.name}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{provider.description}</p>
            <div className="mt-6">
              {provider.ready && writable ? (
                <Link
                  href={`/api/mailboxes/connect/${provider.id}`}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Connecter {provider.name}
                </Link>
              ) : (
                <span
                  className="inline-flex h-10 cursor-not-allowed items-center justify-center rounded-lg bg-muted px-4 text-sm font-semibold text-muted-foreground"
                  aria-disabled="true"
                >
                  {writable ? "Secrets manquants" : "Lecture seule"}
                </span>
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-3" aria-labelledby="connected-mailboxes-title">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-data text-[0.65rem] uppercase tracking-[0.14em] text-primary">
              Registre
            </p>
            <h2
              id="connected-mailboxes-title"
              className="font-display mt-2 text-2xl font-semibold tracking-[-0.035em]"
            >
              Connexions enregistrées
            </h2>
          </div>
          <span className="font-display text-3xl font-semibold">{mailboxes.length}</span>
        </div>
        {mailboxes.map((mailbox) => (
          <article
            key={mailbox.id}
            className="grid gap-5 rounded-xl border border-border bg-card p-5 lg:grid-cols-[auto_1fr_auto] lg:items-center"
          >
            <span className="grid size-11 place-items-center rounded-full bg-accent text-accent-foreground">
              <MailCheck className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display break-words text-xl font-semibold">
                  {mailbox.display_name}
                </h3>
                <Badge>{mailbox.status}</Badge>
              </div>
              <p className="mt-1 break-all text-sm text-muted-foreground">
                {mailbox.email_address}
              </p>
              <div className="font-data mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.62rem] uppercase tracking-[0.1em] text-muted-foreground">
                <span>{providerLabel(mailbox.provider)}</span>
                <span>Dernière synchro : {formatDate(mailbox.last_sync_at)}</span>
                <span>
                  {mailbox.sent_today}/{mailbox.daily_send_limit} envois
                </span>
                <span>
                  {mailbox.provider === "mock"
                    ? "Aucun token"
                    : mailbox.encrypted_refresh_token
                      ? "Tokens chiffrés"
                      : "Token absent"}
                </span>
              </div>
              {mailbox.last_error_code ? (
                <p className="mt-2 text-xs text-danger">
                  Dernière erreur : {mailbox.last_error_code} · {formatDate(mailbox.last_error_at)}
                </p>
              ) : null}
            </div>
            {writable ? (
              <MailboxActions
                mailboxId={mailbox.id}
                provider={mailbox.provider}
                connected={mailbox.status === "connected"}
              />
            ) : null}
          </article>
        ))}
        {!mailboxes.length ? (
          <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-border bg-card p-8 text-center">
            <div>
              <PlugZap className="mx-auto size-7 text-muted-foreground" aria-hidden="true" />
              <p className="mt-4 font-semibold">Aucune boîte enregistrée</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Configurez un provider ci-dessus ou appliquez le seed de démonstration.
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <div className="grid gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground sm:grid-cols-2">
        <p className="flex items-start gap-3">
          <LockKeyhole className="mt-1 size-4 shrink-0" aria-hidden="true" />
          AES-256-GCM côté serveur, rotation par reconnexion et suppression à la déconnexion.
        </p>
        <p className="flex items-start gap-3">
          <KeyRound className="mt-1 size-4 shrink-0" aria-hidden="true" />
          État OAuth signé, PKCE et callbacks limités aux URI publiques déclarées.
        </p>
      </div>
    </div>
  );
}
