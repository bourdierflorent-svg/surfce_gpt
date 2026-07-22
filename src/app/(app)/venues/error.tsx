"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function VenuesError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto grid min-h-[60vh] max-w-2xl place-items-center text-center">
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-danger/10 text-danger">
          <AlertTriangle className="size-5" aria-hidden="true" />
        </span>
        <h1 className="font-display mt-5 text-3xl font-semibold tracking-[-0.04em]">
          Le registre ne peut pas être chargé
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Vérifiez la connexion à Supabase puis relancez le chargement.
        </p>
        <Button className="mt-5" onClick={reset}>
          <RotateCcw className="size-4" aria-hidden="true" />
          Réessayer
        </Button>
      </div>
    </div>
  );
}
