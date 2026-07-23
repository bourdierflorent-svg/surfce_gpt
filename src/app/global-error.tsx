"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body>
        <main className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
          <div className="max-w-lg text-center">
            <p className="font-data text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Incident isolé
            </p>
            <h1 className="font-display mt-4 text-4xl font-semibold tracking-[-0.045em]">
              SURFCE n’a pas pu terminer cette action.
            </h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Aucune nouvelle action n’a été confirmée. Vous pouvez relancer l’écran en toute
              sécurité.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Réessayer
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
