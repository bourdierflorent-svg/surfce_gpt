"use client";

import { FileUp } from "lucide-react";
import { useRef, useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

import { uploadVenueAssetAction } from "../server/actions";
import type { VenueOffer } from "../types";

interface AssetUploadFormProps {
  offers: VenueOffer[];
  venueId: string;
}

export function AssetUploadForm({ offers, venueId }: AssetUploadFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(null);
    startTransition(async () => {
      const result = await uploadVenueAssetAction(venueId, formData);
      setMessage({ success: result.success, text: result.message });
      if (result.success) formRef.current?.reset();
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      className="rounded-xl border border-dashed border-primary/30 bg-primary/[0.035] p-4 sm:p-5"
    >
      <div className="mb-4 flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
          <FileUp className="size-4" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-sm font-semibold">Ajouter à la galerie</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            JPG, PNG, WebP ou PDF, 10 Mo maximum. Les fichiers restent privés dans Supabase.
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2 text-xs font-semibold">
          Titre
          <Input name="title" required autoComplete="off" placeholder="Ex. Brochure commerciale…" />
        </label>
        <label className="space-y-2 text-xs font-semibold">
          Type
          <Select name="asset_type" defaultValue="image">
            <option value="image">Visuel</option>
            <option value="brochure">Brochure</option>
            <option value="floor_plan">Plan</option>
            <option value="menu">Menu</option>
            <option value="other">Autre</option>
          </Select>
        </label>
        <label className="space-y-2 text-xs font-semibold">
          Offre associée
          <Select name="offer_id" defaultValue="">
            <option value="">Tout l’établissement</option>
            {offers.map((offer) => (
              <option key={offer.id} value={offer.id}>
                {offer.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-2 text-xs font-semibold">
          Fichier
          <Input
            name="file"
            type="file"
            required
            accept="image/jpeg,image/png,image/webp,application/pdf"
          />
        </label>
      </div>
      <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" name="is_public" className="size-4 accent-primary" />
        Fichier utilisable dans les futurs supports publics
      </label>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={isPending}>
          <FileUp className="size-3.5" aria-hidden="true" />
          {isPending ? "Envoi…" : "Ajouter le fichier"}
        </Button>
        {message ? (
          <p
            className={message.success ? "text-xs text-success" : "text-xs text-danger"}
            role="status"
          >
            {message.text}
          </p>
        ) : null}
      </div>
    </form>
  );
}
