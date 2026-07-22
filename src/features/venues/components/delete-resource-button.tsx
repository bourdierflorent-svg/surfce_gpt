"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { deleteOfferAction, deleteVenueAction, deleteVenueAssetAction } from "../server/actions";

type DeleteResourceButtonProps =
  | { kind: "venue"; venueId: string }
  | { kind: "offer"; offerId: string; venueId: string }
  | { kind: "asset"; assetId: string; venueId: string };

const labels = {
  venue: "Supprimer le lieu",
  offer: "Supprimer",
  asset: "Retirer",
} as const;

const confirmations = {
  venue:
    "Supprimer cet établissement effacera aussi ses offres et ses fichiers. Cette action est définitive.",
  offer: "Supprimer cette offre et ses fichiers associés ? Cette action est définitive.",
  asset: "Retirer définitivement ce fichier de la galerie ?",
} as const;

export function DeleteResourceButton(props: DeleteResourceButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function remove() {
    if (!window.confirm(confirmations[props.kind])) return;
    setMessage(null);
    startTransition(async () => {
      const result =
        props.kind === "venue"
          ? await deleteVenueAction(props.venueId)
          : props.kind === "offer"
            ? await deleteOfferAction(props.venueId, props.offerId)
            : await deleteVenueAssetAction(props.venueId, props.assetId);

      if (!result.success) {
        setMessage(result.message);
        return;
      }

      if (props.kind === "venue") {
        router.push("/venues");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={remove}
        disabled={isPending}
        className="text-danger hover:bg-danger/8 hover:text-danger"
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
        {isPending ? "Suppression…" : labels[props.kind]}
      </Button>
      {message ? (
        <p className="mt-2 max-w-64 text-xs text-danger" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
