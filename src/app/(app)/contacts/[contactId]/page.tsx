import { ArrowLeft, Building2, Database, MailCheck, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { ContactActions } from "@/features/contacts/components/contact-actions";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { getContactDetail } from "@/features/contacts/server/queries";
import { can } from "@/lib/permissions/roles";

interface ContactPageProps {
  params: Promise<{ contactId: string }>;
}

export default async function ContactPage({ params }: ContactPageProps) {
  const context = await requireAppAuthContext();
  const { contactId } = await params;
  const contact = await getContactDetail(context, contactId);
  if (!contact) notFound();
  const canWrite =
    can(context.membership.role, "contacts:write") &&
    !context.isPreview &&
    (context.membership.role !== "sales" ||
      contact.assigned_to === context.user.id ||
      contact.companyAssignedTo === context.user.id);

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <Link
        href="/contacts"
        className="inline-flex items-center gap-2 rounded-sm text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Tous les contacts
      </Link>

      <header className="grid gap-6 border-b border-border pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="font-data text-xs uppercase tracking-[0.17em] text-primary">
            Contact professionnel · {contact.email_status}
          </p>
          <h1 className="font-display mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
            {contact.full_name}
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            {contact.job_title ?? "Fonction à qualifier"} · {contact.companyName}
          </p>
        </div>
        <Badge
          className={
            contact.do_not_contact ? "border-danger/20 bg-danger/8 text-danger" : undefined
          }
        >
          {contact.do_not_contact ? "Opposition active" : "Contact autorisé"}
        </Badge>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <div className="grid overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-3">
            <div className="border-b border-border p-5 sm:border-b-0 sm:border-r">
              <MailCheck className="size-4 text-primary" aria-hidden="true" />
              <p className="mt-4 break-all text-sm font-semibold">
                {contact.email ?? "Adresse inconnue"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{contact.email_status}</p>
            </div>
            <div className="border-b border-border p-5 sm:border-b-0 sm:border-r">
              <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
              <p className="font-display mt-3 text-3xl font-semibold">
                {Math.round(contact.confidence * 100)} %
              </p>
              <p className="mt-1 text-xs text-muted-foreground">confiance</p>
            </div>
            <div className="p-5">
              <Database className="size-4 text-primary" aria-hidden="true" />
              <p className="mt-4 text-sm font-semibold">
                {contact.latestVerification?.provider ?? "Aucune vérification"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {contact.latestVerification?.mock ? "simulation à coût nul" : "preuve absente"}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 sm:p-7">
            <h2 className="font-display text-2xl font-semibold tracking-[-0.035em]">Contrôles</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              La vérification reste mock. Une opposition bloque atomiquement l’inscription, arrête
              les séquences et annule les messages programmés.
            </p>
            <div className="mt-5">
              <ContactActions
                contactId={contact.id}
                canWrite={canWrite}
                suppressed={contact.do_not_contact}
              />
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-xl border border-border bg-foreground p-5 text-background">
          <p className="font-data text-[0.65rem] uppercase tracking-[0.16em] text-background/60">
            Fiche de contexte
          </p>
          <dl className="mt-5 space-y-5 text-sm">
            <div>
              <dt className="text-xs text-background/55">Entreprise</dt>
              <dd className="mt-1 flex items-center gap-2 font-semibold">
                <Building2 className="size-4" aria-hidden="true" />
                {contact.companyName}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-background/55">Département</dt>
              <dd className="mt-1 font-semibold">{contact.department ?? "Non renseigné"}</dd>
            </div>
            <div>
              <dt className="text-xs text-background/55">Base légale</dt>
              <dd className="mt-1 leading-6">
                {contact.lawful_basis ?? "À documenter avant activation réelle"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-background/55">Tags</dt>
              <dd className="mt-2 flex flex-wrap gap-1.5">
                {contact.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-background/20 px-2 py-1 text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
        </aside>
      </section>
    </div>
  );
}
