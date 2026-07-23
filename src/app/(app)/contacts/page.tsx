import { ArrowUpRight, ContactRound, MailCheck, Search, ShieldOff } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { listContacts } from "@/features/contacts/server/queries";
import { cn } from "@/lib/utils";
import type { ContactStatus } from "@/types/database";

const statusLabels: Record<ContactStatus, string> = {
  to_verify: "À vérifier",
  valid: "Valide",
  risky: "Risqué",
  invalid: "Invalide",
  left_company: "A quitté l’entreprise",
  wrong_person: "Mauvais interlocuteur",
  do_not_contact: "Ne pas contacter",
};

interface ContactsPageProps {
  searchParams: Promise<{ q?: string; status?: string }>;
}

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const context = await requireAppAuthContext();
  const params = await searchParams;
  const status =
    params.status && params.status in statusLabels ? (params.status as ContactStatus) : "all";
  const query = params.q?.trim() ?? "";
  const contacts = await listContacts(context, { query, status });
  const validCount = contacts.filter((contact) => contact.email_status === "valid").length;
  const suppressedCount = contacts.filter((contact) => contact.do_not_contact).length;

  return (
    <div className="mx-auto max-w-[90rem] space-y-7">
      <header className="grid gap-6 border-b border-border pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="font-data text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Répertoire professionnel · Preuves et opposition
          </p>
          <h1 className="font-display mt-3 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
            Une adresse n’est exploitable que lorsque son statut est lisible.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Chaque contact garde sa fonction, sa source, son niveau de confiance et son droit à ne
            plus être contacté.
          </p>
        </div>
        <Link
          href="/campaigns/new"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Préparer une campagne
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </header>

      <section
        aria-label="État du répertoire"
        className="grid overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-3"
      >
        <div className="border-b border-border p-5 sm:border-b-0 sm:border-r">
          <ContactRound className="size-4 text-primary" aria-hidden="true" />
          <p className="font-display mt-3 text-3xl font-semibold tracking-[-0.04em]">
            {contacts.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">contacts dans ce filtre</p>
        </div>
        <div className="border-b border-border p-5 sm:border-b-0 sm:border-r">
          <MailCheck className="size-4 text-success" aria-hidden="true" />
          <p className="font-display mt-3 text-3xl font-semibold tracking-[-0.04em]">
            {validCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">adresses valides</p>
        </div>
        <div className="p-5">
          <ShieldOff className="size-4 text-danger" aria-hidden="true" />
          <p className="font-display mt-3 text-3xl font-semibold tracking-[-0.04em]">
            {suppressedCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">oppositions actives</p>
        </div>
      </section>

      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex max-w-full overflow-x-auto rounded-lg border border-border bg-card p-1">
          {(["all", "to_verify", "valid", "risky", "do_not_contact"] as const).map((value) => (
            <Link
              key={value}
              href={`/contacts?status=${value}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                status === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {value === "all" ? "Tous" : statusLabels[value]}
            </Link>
          ))}
        </div>
        <form action="/contacts" className="relative w-full lg:max-w-sm">
          <input type="hidden" name="status" value={status} />
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <label htmlFor="contact-search" className="sr-only">
            Rechercher un contact
          </label>
          <input
            id="contact-search"
            name="q"
            autoComplete="off"
            defaultValue={query}
            placeholder="Nom ou fonction…"
            className="h-11 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
          />
        </form>
      </section>

      {contacts.length ? (
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="hidden grid-cols-[3rem_1.15fr_1fr_0.9fr_0.7fr_3rem] gap-4 border-b border-border bg-muted/45 px-5 py-3 font-data text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-muted-foreground lg:grid">
            <span>N°</span>
            <span>Contact</span>
            <span>Entreprise</span>
            <span>Adresse</span>
            <span>Statut</span>
            <span className="sr-only">Ouvrir</span>
          </div>
          <div className="divide-y divide-border">
            {contacts.map((contact, index) => (
              <Link
                key={contact.id}
                href={`/contacts/${contact.id}`}
                className="group grid gap-4 px-5 py-5 hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring lg:grid-cols-[3rem_1.15fr_1fr_0.9fr_0.7fr_3rem] lg:items-center"
              >
                <span className="font-data text-xs tabular-nums text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="break-words font-display text-xl font-semibold tracking-[-0.035em] group-hover:text-primary">
                    {contact.full_name}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {contact.job_title ?? "Fonction à qualifier"}
                  </p>
                </div>
                <p className="min-w-0 break-words text-sm font-medium">{contact.companyName}</p>
                <div>
                  <p className="break-all text-sm">{contact.email ?? "Adresse inconnue"}</p>
                  <p className="font-data mt-1 text-[0.62rem] uppercase tracking-[0.1em] text-muted-foreground">
                    {contact.email_status} · {Math.round(contact.confidence * 100)} %
                  </p>
                </div>
                <Badge
                  className={
                    contact.do_not_contact ? "border-danger/20 bg-danger/8 text-danger" : undefined
                  }
                >
                  {statusLabels[contact.contact_status]}
                </Badge>
                <span className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:border-primary group-hover:text-primary">
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="grid min-h-72 place-items-center rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <div>
            <ContactRound className="mx-auto size-7 text-muted-foreground" aria-hidden="true" />
            <h2 className="font-display mt-4 text-2xl font-semibold">
              Aucun contact dans ce filtre
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Modifiez la recherche ou importez des contacts fictifs de démonstration.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
