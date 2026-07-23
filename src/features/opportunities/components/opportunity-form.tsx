"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import type { OpportunityFormOptions } from "../types";

interface OpportunityFormProps {
  options: OpportunityFormOptions;
  disabled?: boolean;
}

function nullableString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function nullableNumber(formData: FormData, key: string) {
  const value = nullableString(formData, key);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nullableDateTime(formData: FormData, key: string) {
  const value = nullableString(formData, key);
  return value ? new Date(value).toISOString() : null;
}

export function OpportunityForm({ options, disabled }: OpportunityFormProps) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(options.companies[0]?.id ?? "");
  const [venueId, setVenueId] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const contacts = useMemo(
    () => options.contacts.filter((contact) => contact.company_id === companyId),
    [companyId, options.contacts],
  );
  const offers = useMemo(
    () => options.offers.filter((offer) => offer.venue_id === venueId),
    [options.offers, venueId],
  );

  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    setFailed(false);
    const objections = nullableString(formData, "objections")
      ?.split("\n")
      .map((value) => value.trim())
      .filter(Boolean);
    const response = await fetch("/api/opportunities", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        companyId: formData.get("companyId"),
        primaryContactId: nullableString(formData, "primaryContactId"),
        venueId: nullableString(formData, "venueId"),
        offerId: nullableString(formData, "offerId"),
        campaignId: nullableString(formData, "campaignId"),
        ownerId: nullableString(formData, "ownerId"),
        stageId: formData.get("stageId"),
        title: formData.get("title"),
        estimatedAmount: nullableNumber(formData, "estimatedAmount"),
        currency: formData.get("currency"),
        estimatedGuests: nullableNumber(formData, "estimatedGuests"),
        eventType: nullableString(formData, "eventType"),
        desiredEventDate: nullableString(formData, "desiredEventDate"),
        expectedCloseDate: nullableString(formData, "expectedCloseDate"),
        source: formData.get("source"),
        objections: objections ?? [],
        nextAction: nullableString(formData, "nextAction"),
        nextActionAt: nullableDateTime(formData, "nextActionAt"),
        notes: nullableString(formData, "notes"),
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      id?: string;
      error?: string;
    };
    if (!response.ok || !payload.id) {
      setFailed(true);
      setMessage(payload.error ?? "L’opportunité n’a pas pu être créée.");
      setPending(false);
      return;
    }
    router.push(`/opportunities/${payload.id}`);
    router.refresh();
  }

  return (
    <form action={submit} className="space-y-8">
      <fieldset disabled={disabled || pending} className="space-y-8 disabled:opacity-65">
        <section className="grid gap-5 rounded-xl border border-border bg-card p-5 lg:grid-cols-2 lg:p-7">
          <div className="lg:col-span-2">
            <p className="font-data text-[0.65rem] uppercase tracking-[0.14em] text-primary">
              Identité du dossier
            </p>
            <h2 className="font-display mt-2 text-2xl font-semibold">
              Qui, quoi, pourquoi maintenant
            </h2>
          </div>
          <div className="lg:col-span-2">
            <label htmlFor="opportunity-title" className="text-sm font-semibold">
              Titre
            </label>
            <Input
              id="opportunity-title"
              name="title"
              required
              minLength={3}
              maxLength={200}
              autoComplete="off"
              className="mt-2"
              placeholder="Ex. Séminaire équipe produit · 80 personnes…"
            />
          </div>
          <div>
            <label htmlFor="opportunity-company" className="text-sm font-semibold">
              Entreprise
            </label>
            <Select
              id="opportunity-company"
              name="companyId"
              value={companyId}
              onChange={(event) => setCompanyId(event.currentTarget.value)}
              required
              className="mt-2"
            >
              {options.companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="opportunity-contact" className="text-sm font-semibold">
              Contact principal
            </label>
            <Select id="opportunity-contact" name="primaryContactId" className="mt-2">
              <option value="">À définir</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.full_name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="opportunity-owner" className="text-sm font-semibold">
              Commercial
            </label>
            <Select id="opportunity-owner" name="ownerId" className="mt-2">
              {options.owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="opportunity-source" className="text-sm font-semibold">
              Origine
            </label>
            <Select id="opportunity-source" name="source" defaultValue="manual" className="mt-2">
              <option value="manual">Création manuelle</option>
              <option value="referral">Mise en relation</option>
              <option value="event">Événement</option>
              <option value="inbound">Entrant</option>
            </Select>
          </div>
        </section>

        <section className="grid gap-5 rounded-xl border border-border bg-card p-5 lg:grid-cols-3 lg:p-7">
          <div className="lg:col-span-3">
            <p className="font-data text-[0.65rem] uppercase tracking-[0.14em] text-primary">
              Mouvement commercial
            </p>
            <h2 className="font-display mt-2 text-2xl font-semibold">Jalon, valeur et échéance</h2>
          </div>
          <div>
            <label htmlFor="opportunity-stage" className="text-sm font-semibold">
              Étape
            </label>
            <Select id="opportunity-stage" name="stageId" className="mt-2" required>
              {options.stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.label} · {stage.default_probability}%
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="estimated-amount" className="text-sm font-semibold">
              Montant estimé
            </label>
            <Input
              id="estimated-amount"
              name="estimatedAmount"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              autoComplete="off"
              className="mt-2"
              placeholder="Ex. 8 500…"
            />
          </div>
          <div>
            <label htmlFor="opportunity-currency" className="text-sm font-semibold">
              Devise
            </label>
            <Select id="opportunity-currency" name="currency" defaultValue="EUR" className="mt-2">
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="USD">USD</option>
            </Select>
          </div>
          <div>
            <label htmlFor="estimated-guests" className="text-sm font-semibold">
              Participants estimés
            </label>
            <Input
              id="estimated-guests"
              name="estimatedGuests"
              type="number"
              min="1"
              max="100000"
              inputMode="numeric"
              autoComplete="off"
              className="mt-2"
            />
          </div>
          <div>
            <label htmlFor="event-type" className="text-sm font-semibold">
              Type d’événement
            </label>
            <Input
              id="event-type"
              name="eventType"
              maxLength={120}
              autoComplete="off"
              className="mt-2"
              placeholder="Séminaire, cocktail, dîner…"
            />
          </div>
          <div>
            <label htmlFor="desired-event-date" className="text-sm font-semibold">
              Date souhaitée
            </label>
            <Input
              id="desired-event-date"
              name="desiredEventDate"
              type="date"
              autoComplete="off"
              className="mt-2"
            />
          </div>
          <div>
            <label htmlFor="expected-close-date" className="text-sm font-semibold">
              Clôture estimée
            </label>
            <Input
              id="expected-close-date"
              name="expectedCloseDate"
              type="date"
              autoComplete="off"
              className="mt-2"
            />
          </div>
          <div>
            <label htmlFor="opportunity-venue" className="text-sm font-semibold">
              Établissement
            </label>
            <Select
              id="opportunity-venue"
              name="venueId"
              value={venueId}
              onChange={(event) => setVenueId(event.currentTarget.value)}
              className="mt-2"
            >
              <option value="">À recommander</option>
              {options.venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="opportunity-offer" className="text-sm font-semibold">
              Offre
            </label>
            <Select id="opportunity-offer" name="offerId" className="mt-2">
              <option value="">À définir</option>
              {offers.map((offer) => (
                <option key={offer.id} value={offer.id}>
                  {offer.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="opportunity-campaign" className="text-sm font-semibold">
              Campagne
            </label>
            <Select id="opportunity-campaign" name="campaignId" className="mt-2">
              <option value="">Hors campagne</option>
              {options.campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </Select>
          </div>
        </section>

        <section className="grid gap-5 rounded-xl border border-border bg-card p-5 lg:grid-cols-2 lg:p-7">
          <div className="lg:col-span-2">
            <p className="font-data text-[0.65rem] uppercase tracking-[0.14em] text-primary">
              Continuité
            </p>
            <h2 className="font-display mt-2 text-2xl font-semibold">
              Prochaine action et points de vigilance
            </h2>
          </div>
          <div>
            <label htmlFor="next-action" className="text-sm font-semibold">
              Prochaine action
            </label>
            <Input
              id="next-action"
              name="nextAction"
              maxLength={300}
              autoComplete="off"
              className="mt-2"
              placeholder="Ex. Qualifier le budget et la date…"
            />
          </div>
          <div>
            <label htmlFor="next-action-at" className="text-sm font-semibold">
              Échéance
            </label>
            <Input
              id="next-action-at"
              name="nextActionAt"
              type="datetime-local"
              autoComplete="off"
              className="mt-2"
            />
          </div>
          <div>
            <label htmlFor="opportunity-objections" className="text-sm font-semibold">
              Objections, une par ligne
            </label>
            <Textarea
              id="opportunity-objections"
              name="objections"
              rows={5}
              maxLength={3000}
              autoComplete="off"
              className="mt-2"
            />
          </div>
          <div>
            <label htmlFor="opportunity-notes" className="text-sm font-semibold">
              Notes
            </label>
            <Textarea
              id="opportunity-notes"
              name="notes"
              rows={5}
              maxLength={5000}
              autoComplete="off"
              className="mt-2"
            />
          </div>
        </section>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={disabled || pending || !options.companies.length}>
          {pending ? "Création du dossier…" : "Créer l’opportunité"}
        </Button>
        {message ? (
          <p
            className={failed ? "text-sm text-danger" : "text-sm text-muted-foreground"}
            role="alert"
          >
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
