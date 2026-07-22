"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CalendarDays, CircleDollarSign, Save, TicketCheck, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useForm } from "react-hook-form";

import { FormField } from "@/components/forms/form-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { offerFormSchema, type OfferFormInput } from "../schemas";
import { saveOfferAction } from "../server/actions";
import type { VenueOffer } from "../types";

const days = [
  [1, "Lundi"],
  [2, "Mardi"],
  [3, "Mercredi"],
  [4, "Jeudi"],
  [5, "Vendredi"],
  [6, "Samedi"],
  [0, "Dimanche"],
] as const;

function text(value: string | null | undefined): string {
  return value ?? "";
}

function numberText(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

function jsonList(value: VenueOffer["inclusions"] | undefined): string {
  if (!Array.isArray(value)) return "";
  return value.filter((item): item is string => typeof item === "string").join(", ");
}

function defaultValues(offer?: VenueOffer): OfferFormInput {
  return {
    name: offer?.name ?? "",
    event_type: offer?.event_type ?? "",
    short_description: text(offer?.short_description),
    description: text(offer?.description),
    min_guests: numberText(offer?.min_guests),
    max_guests: numberText(offer?.max_guests),
    minimum_budget: numberText(offer?.minimum_budget),
    indicative_price: numberText(offer?.indicative_price),
    currency: offer?.currency ?? "EUR",
    duration_minutes: numberText(offer?.duration_minutes),
    available_days: offer?.available_days ?? [],
    available_time_start: text(offer?.available_time_start?.slice(0, 5)),
    available_time_end: text(offer?.available_time_end?.slice(0, 5)),
    inclusions: jsonList(offer?.inclusions),
    options: jsonList(offer?.options),
    commission_rate: numberText(offer?.commission_rate),
    terms: text(offer?.terms),
    valid_from: text(offer?.valid_from),
    valid_until: text(offer?.valid_until),
    is_active: offer?.is_active ?? true,
  };
}

function FormSection({
  children,
  description,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: typeof TicketCheck;
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <header className="flex gap-4 border-b border-border bg-muted/35 px-5 py-4 sm:px-6">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold tracking-[-0.02em]">{title}</h2>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
        </div>
      </header>
      <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">{children}</div>
    </section>
  );
}

interface OfferFormProps {
  offer?: VenueOffer;
  venueId: string;
  venueName: string;
}

export function OfferForm({ offer, venueId, venueName }: OfferFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const form = useForm<OfferFormInput>({
    resolver: zodResolver(offerFormSchema, undefined, { raw: true }),
    defaultValues: defaultValues(offer),
  });
  const { errors } = form.formState;

  useEffect(() => {
    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      if (form.formState.isDirty && !isPending) event.preventDefault();
    }
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [form.formState.isDirty, isPending]);

  const onSubmit = form.handleSubmit((values) => {
    setServerMessage(null);
    startTransition(async () => {
      const result = await saveOfferAction(venueId, values, offer?.id);
      if (!result.success) {
        setServerMessage(result.message);
        return;
      }
      router.push(`/venues/${venueId}`);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-6xl space-y-6" autoComplete="off" noValidate>
      <header className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href={`/venues/${venueId}`}
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {venueName}
          </Link>
          <p className="font-data text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Catalogue d’offres / {offer ? "Édition" : "Nouveau format"}
          </p>
          <h1 className="font-display mt-2 text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            {offer ? offer.name : "Créer une offre"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Décrivez un format vendable sans transformer une hypothèse en engagement commercial.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href={`/venues/${venueId}`} className={buttonVariants({ variant: "secondary" })}>
            Annuler
          </Link>
          <Button type="submit" disabled={isPending}>
            <Save className="size-4" aria-hidden="true" />
            {isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </header>

      {serverMessage ? (
        <div
          className="rounded-lg border border-danger/25 bg-danger/8 px-4 py-3 text-sm text-danger"
          role="alert"
        >
          {serverMessage}
        </div>
      ) : null}

      <FormSection
        icon={TicketCheck}
        title="Promesse de l’offre"
        description="Un nom explicite, un usage et une description compréhensible par l’équipe commerciale."
      >
        <FormField htmlFor="name" label="Nom" error={errors.name?.message}>
          <Input
            id="name"
            placeholder="Ex. Afterwork 20 à 50 personnes…"
            {...form.register("name")}
          />
        </FormField>
        <FormField htmlFor="event_type" label="Type d’événement" error={errors.event_type?.message}>
          <Input id="event_type" placeholder="Ex. Afterwork…" {...form.register("event_type")} />
        </FormField>
        <div className="sm:col-span-2">
          <FormField
            htmlFor="short_description"
            label="Résumé"
            optional
            error={errors.short_description?.message}
          >
            <Input id="short_description" maxLength={280} {...form.register("short_description")} />
          </FormField>
        </div>
        <div className="sm:col-span-2">
          <FormField
            htmlFor="description"
            label="Description"
            optional
            error={errors.description?.message}
          >
            <Textarea id="description" {...form.register("description")} />
          </FormField>
        </div>
      </FormSection>

      <FormSection
        icon={Users}
        title="Jauge et durée"
        description="Les plages incohérentes sont bloquées avant l’enregistrement."
      >
        <FormField
          htmlFor="min_guests"
          label="Minimum de personnes"
          optional
          error={errors.min_guests?.message}
        >
          <Input id="min_guests" inputMode="numeric" {...form.register("min_guests")} />
        </FormField>
        <FormField
          htmlFor="max_guests"
          label="Maximum de personnes"
          optional
          error={errors.max_guests?.message}
        >
          <Input id="max_guests" inputMode="numeric" {...form.register("max_guests")} />
        </FormField>
        <FormField
          htmlFor="duration_minutes"
          label="Durée en minutes"
          optional
          error={errors.duration_minutes?.message}
        >
          <Input
            id="duration_minutes"
            inputMode="numeric"
            placeholder="Ex. 180…"
            {...form.register("duration_minutes")}
          />
        </FormField>
        <div />
      </FormSection>

      <FormSection
        icon={CircleDollarSign}
        title="Cadre commercial"
        description="Les montants restent indicatifs tant qu’ils ne sont pas validés."
      >
        <FormField
          htmlFor="minimum_budget"
          label="Budget minimum"
          optional
          error={errors.minimum_budget?.message}
        >
          <Input id="minimum_budget" inputMode="decimal" {...form.register("minimum_budget")} />
        </FormField>
        <FormField
          htmlFor="indicative_price"
          label="Prix indicatif"
          optional
          error={errors.indicative_price?.message}
        >
          <Input id="indicative_price" inputMode="decimal" {...form.register("indicative_price")} />
        </FormField>
        <FormField
          htmlFor="commission_rate"
          label="Commission (%)"
          optional
          error={errors.commission_rate?.message}
        >
          <Input id="commission_rate" inputMode="decimal" {...form.register("commission_rate")} />
        </FormField>
        <FormField htmlFor="currency" label="Devise" error={errors.currency?.message}>
          <Input id="currency" className="uppercase" maxLength={3} {...form.register("currency")} />
        </FormField>
        <FormField
          htmlFor="inclusions"
          label="Inclus dans l’offre"
          optional
          description="Séparez les éléments par des virgules."
          error={errors.inclusions?.message}
        >
          <Input
            id="inclusions"
            placeholder="Ex. Espace réservé, Accueil dédié…"
            {...form.register("inclusions")}
          />
        </FormField>
        <FormField
          htmlFor="options"
          label="Options"
          optional
          description="Séparez les éléments par des virgules."
          error={errors.options?.message}
        >
          <Input
            id="options"
            placeholder="Ex. DJ, Cocktail dînatoire…"
            {...form.register("options")}
          />
        </FormField>
        <div className="sm:col-span-2">
          <FormField htmlFor="terms" label="Conditions" optional error={errors.terms?.message}>
            <Textarea id="terms" {...form.register("terms")} />
          </FormField>
        </div>
      </FormSection>

      <FormSection
        icon={CalendarDays}
        title="Disponibilité"
        description="Jours, horaires et période de validité de ce format."
      >
        <div className="sm:col-span-2">
          <p className="mb-3 text-sm font-semibold">Jours applicables</p>
          <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {days.map(([value, label]) => (
              <label
                key={value}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm hover:border-primary/35"
              >
                <input
                  type="checkbox"
                  value={value}
                  className="size-4 accent-primary"
                  {...form.register("available_days", { valueAsNumber: true })}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
        <FormField
          htmlFor="available_time_start"
          label="Heure de début"
          optional
          error={errors.available_time_start?.message}
        >
          <Input id="available_time_start" type="time" {...form.register("available_time_start")} />
        </FormField>
        <FormField
          htmlFor="available_time_end"
          label="Heure de fin"
          optional
          error={errors.available_time_end?.message}
        >
          <Input id="available_time_end" type="time" {...form.register("available_time_end")} />
        </FormField>
        <FormField
          htmlFor="valid_from"
          label="Valide à partir du"
          optional
          error={errors.valid_from?.message}
        >
          <Input id="valid_from" type="date" {...form.register("valid_from")} />
        </FormField>
        <FormField
          htmlFor="valid_until"
          label="Valide jusqu’au"
          optional
          error={errors.valid_until?.message}
        >
          <Input id="valid_until" type="date" {...form.register("valid_until")} />
        </FormField>
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background p-4 sm:col-span-2">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            {...form.register("is_active")}
          />
          <span>
            <span className="block text-sm font-semibold">Offre active</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Une offre inactive reste dans l’historique sans être proposée.
            </span>
          </span>
        </label>
      </FormSection>

      <footer className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
        <Link href={`/venues/${venueId}`} className={buttonVariants({ variant: "secondary" })}>
          Annuler
        </Link>
        <Button type="submit" disabled={isPending} className="sm:min-w-40">
          <Save className="size-4" aria-hidden="true" />
          {isPending ? "Enregistrement…" : "Enregistrer l’offre"}
        </Button>
      </footer>
    </form>
  );
}
