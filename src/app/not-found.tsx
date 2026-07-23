import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
      <div className="max-w-lg text-center">
        <SearchX className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
        <p className="font-data mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Dossier introuvable
        </p>
        <h1 className="font-display mt-3 text-4xl font-semibold tracking-[-0.045em]">
          Cette page n’existe pas ou n’est plus disponible.
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Vérifiez le lien ou revenez au tableau de bord. Aucun traitement n’a été lancé.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Retour au tableau de bord
        </Link>
      </div>
    </main>
  );
}
