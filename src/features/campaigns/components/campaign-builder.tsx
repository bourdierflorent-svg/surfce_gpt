"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { MailboxRow } from "@/types/database";

interface CampaignBuilderProps {
  mailboxes: MailboxRow[];
  venues: Array<{ id: string; name: string }>;
  offers: Array<{ id: string; venue_id: string; name: string }>;
}

const defaultSteps = [
  { position: 0, delayDays: 0, label: "Premier contact", requiresApproval: true },
  { position: 1, delayDays: 4, label: "Relance courte", requiresApproval: false },
  { position: 2, delayDays: 9, label: "Exemple d’offre", requiresApproval: false },
  { position: 3, delayDays: 14, label: "Fermeture polie", requiresApproval: false },
];

export function CampaignBuilder({ mailboxes, venues, offers }: CampaignBuilderProps) {
  const router = useRouter();
  const [venueId, setVenueId] = useState(venues[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const visibleOffers = offers.filter((offer) => offer.venue_id === venueId);

  async function submit(formData: FormData) {
    setPending(true);
    setError("");
    const response = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        description: formData.get("description") || null,
        venueId: formData.get("venueId") || null,
        offerId: formData.get("offerId") || null,
        mailboxId: formData.get("mailboxId"),
        language: "fr",
        tone: formData.get("tone"),
        dailyLimit: Number(formData.get("dailyLimit")),
        sendWindow: {
          timezone: "Europe/Paris",
          weekdays: [1, 2, 3, 4, 5],
          start: formData.get("start"),
          end: formData.get("end"),
        },
        stopRules: {
          humanReply: true,
          unsubscribe: true,
          bounce: true,
          doNotContact: true,
        },
        steps: defaultSteps.map((step) => ({
          position: step.position,
          delayDays: step.delayDays,
          delayHours: 0,
          aiInstructions: step.label,
          requiresApproval: step.requiresApproval,
        })),
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      campaignId?: string;
      error?: string;
    };
    if (!response.ok || !payload.campaignId) {
      setPending(false);
      setError(payload.error ?? "La campagne n’a pas pu être créée.");
      return;
    }
    router.push(`/campaigns/${payload.campaignId}`);
    router.refresh();
  }

  return (
    <form action={submit} className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6 rounded-xl border border-border bg-card p-5 sm:p-7">
        <div>
          <label htmlFor="campaign-name" className="text-sm font-semibold">
            Nom de la campagne
          </label>
          <Input
            id="campaign-name"
            name="name"
            autoComplete="off"
            required
            minLength={3}
            placeholder="Ex. Afterwork agences parisiennes…"
            className="mt-2"
          />
        </div>
        <div>
          <label htmlFor="campaign-description" className="text-sm font-semibold">
            Objectif
          </label>
          <Textarea
            id="campaign-description"
            name="description"
            autoComplete="off"
            placeholder="Ex. Proposer un premier échange autour d’un format afterwork…"
            className="mt-2"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="campaign-venue" className="text-sm font-semibold">
              Établissement
            </label>
            <Select
              id="campaign-venue"
              name="venueId"
              value={venueId}
              onChange={(event) => setVenueId(event.target.value)}
              className="mt-2"
            >
              <option value="">Aucun établissement</option>
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="campaign-offer" className="text-sm font-semibold">
              Offre
            </label>
            <Select id="campaign-offer" name="offerId" className="mt-2">
              <option value="">Aucune offre</option>
              {visibleOffers.map((offer) => (
                <option key={offer.id} value={offer.id}>
                  {offer.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="campaign-mailbox" className="text-sm font-semibold">
              Expéditeur mock
            </label>
            <Select id="campaign-mailbox" name="mailboxId" required className="mt-2">
              {mailboxes.map((mailbox) => (
                <option key={mailbox.id} value={mailbox.id}>
                  {mailbox.display_name} · {mailbox.email_address}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="campaign-tone" className="text-sm font-semibold">
              Ton
            </label>
            <Select
              id="campaign-tone"
              name="tone"
              defaultValue="directe et commerciale"
              className="mt-2"
            >
              <option>directe et commerciale</option>
              <option>premium et événementielle</option>
              <option>relationnelle et personnalisée</option>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="daily-limit" className="text-sm font-semibold">
              Limite / jour
            </label>
            <Input
              id="daily-limit"
              name="dailyLimit"
              type="number"
              inputMode="numeric"
              min={1}
              max={100}
              defaultValue={10}
              className="mt-2"
            />
          </div>
          <div>
            <label htmlFor="send-start" className="text-sm font-semibold">
              Début
            </label>
            <Input id="send-start" name="start" type="time" defaultValue="09:00" className="mt-2" />
          </div>
          <div>
            <label htmlFor="send-end" className="text-sm font-semibold">
              Fin
            </label>
            <Input id="send-end" name="end" type="time" defaultValue="17:30" className="mt-2" />
          </div>
        </div>
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending || mailboxes.length === 0}>
          {pending ? "Création…" : "Créer le brouillon"}
        </Button>
      </div>

      <aside className="h-fit rounded-xl border border-border bg-foreground p-5 text-background lg:sticky lg:top-24">
        <p className="font-data text-[0.65rem] uppercase tracking-[0.16em] text-background/60">
          Séquence contrôlée
        </p>
        <div className="relative mt-5 space-y-0 before:absolute before:bottom-4 before:left-[0.46rem] before:top-4 before:w-px before:bg-background/25">
          {defaultSteps.map((step) => (
            <div
              key={step.position}
              className="relative grid grid-cols-[1rem_1fr] gap-3 pb-6 last:pb-0"
            >
              <span className="mt-1 size-2.5 rounded-full border-2 border-foreground bg-background" />
              <div>
                <p className="font-data text-[0.65rem] text-background/55">
                  {step.position === 0 ? "J0" : `J+${step.delayDays}`}
                </p>
                <p className="mt-1 text-sm font-semibold">{step.label}</p>
                {step.requiresApproval ? (
                  <p className="mt-1 text-xs text-background/60">Validation humaine obligatoire</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 border-t border-background/15 pt-4 text-xs leading-5 text-background/65">
          Jours ouvrés uniquement · Europe/Paris · arrêt sur opposition · coût mock 0 €.
        </p>
      </aside>
    </form>
  );
}
