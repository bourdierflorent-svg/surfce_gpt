"use client";

import { CircleAlert, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="mx-auto grid min-h-[65vh] max-w-2xl place-items-center px-6 text-center">
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-danger/10 text-danger">
          <CircleAlert className="size-5" aria-hidden="true" />
        </span>
        <p className="font-data mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Action non terminée
        </p>
        <h1 className="font-display mt-3 text-4xl font-semibold tracking-[-0.045em]">
          Les données n’ont pas pu être chargées.
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Rien de nouveau n’a été confirmé. Réessayez ; si le problème persiste, relevez
          l’identifiant de requête affiché par votre navigateur ou dans les journaux Vercel.
        </p>
        <Button type="button" className="mt-6" onClick={reset}>
          <RotateCcw className="size-4" aria-hidden="true" />
          Réessayer
        </Button>
      </div>
    </section>
  );
}
