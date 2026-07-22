"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Building2, MapPinned, Save, Settings2, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useForm } from "react-hook-form";

import { FormField } from "@/components/forms/form-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { VENUE_FEATURES, venueFormSchema, type VenueFormInput } from "../schemas";
import { saveVenueAction } from "../server/actions";
import type { Venue } from "../types";

interface VenueFormProps {
  venue?: Venue;
}

function text(value: string | null | undefined): string {
  return value ?? "";
}

function numberText(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

function jsonRecord(value: Venue["features"] | Venue["opening_rules"] | undefined) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function defaultValues(venue?: Venue): VenueFormInput {
  const features = jsonRecord(venue?.features);
  const openingRules = jsonRecord(venue?.opening_rules);

  return {
    name: venue?.name ?? "",
    venue_type: venue?.venue_type ?? "",
    description: text(venue?.description),
    address_line1: text(venue?.address_line1),
    address_line2: text(venue?.address_line2),
    postal_code: text(venue?.postal_code),
    city: venue?.city ?? "Paris",
    country_code: venue?.country_code ?? "FR",
    latitude: numberText(venue?.latitude),
    longitude: numberText(venue?.longitude),
    district: text(venue?.district),
    standing: text(venue?.standing),
    atmosphere: text(venue?.atmosphere),
    capacity_seated: numberText(venue?.capacity_seated),
    capacity_standing: numberText(venue?.capacity_standing),
    minimum_guests: numberText(venue?.minimum_guests),
    minimum_spend: numberText(venue?.minimum_spend),
    currency: venue?.currency ?? "EUR",
    features: Object.fromEntries(
      VENUE_FEATURES.map(([key]) => [key, features[key] === true]),
    ) as VenueFormInput["features"],
    event_types: venue?.event_types.join(", ") ?? "",
    target_sectors: venue?.target_sectors.join(", ") ?? "",
    opening_note: typeof openingRules.note === "string" ? openingRules.note : "",
    internal_contact: text(venue?.internal_contact),
    commercial_terms: text(venue?.commercial_terms),
    is_active: venue?.is_active ?? true,
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
  icon: typeof Building2;
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

export function VenueForm({ venue }: VenueFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const form = useForm<VenueFormInput>({
    resolver: zodResolver(venueFormSchema, undefined, { raw: true }),
    defaultValues: defaultValues(venue),
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
      const result = await saveVenueAction(values, venue?.id);
      if (!result.success) {
        setServerMessage(result.message);
        for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
          form.setError(field as keyof VenueFormInput, { message: messages[0] });
        }
        return;
      }
      router.push(`/venues/${result.id}`);
      router.refresh();
    });
  });

  const cancelHref = venue ? `/venues/${venue.id}` : "/venues";

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-6xl space-y-6" autoComplete="off" noValidate>
      <header className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href={cancelHref}
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Retour
          </Link>
          <p className="font-data text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Registre des lieux / {venue ? "Édition" : "Nouveau dossier"}
          </p>
          <h1 className="font-display mt-2 text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            {venue ? venue.name : "Ajouter un établissement"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Les données commerciales doivent rester vérifiables. Laissez un champ vide plutôt que
            d’ajouter une information incertaine.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href={cancelHref} className={buttonVariants({ variant: "secondary" })}>
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
        icon={Building2}
        title="Identité du lieu"
        description="Les informations qui permettent de reconnaître et positionner l’établissement."
      >
        <FormField htmlFor="name" label="Nom" error={errors.name?.message}>
          <Input id="name" autoComplete="organization" {...form.register("name")} />
        </FormField>
        <FormField htmlFor="venue_type" label="Type" error={errors.venue_type?.message}>
          <Input
            id="venue_type"
            placeholder="Club, restaurant festif…"
            {...form.register("venue_type")}
          />
        </FormField>
        <div className="sm:col-span-2">
          <FormField
            htmlFor="description"
            label="Description"
            optional
            error={errors.description?.message}
          >
            <Textarea
              id="description"
              placeholder="Ex. Un salon feutré adapté aux prises de parole…"
              {...form.register("description")}
            />
          </FormField>
        </div>
        <FormField htmlFor="standing" label="Standing" optional error={errors.standing?.message}>
          <Input id="standing" placeholder="Premium, accessible…" {...form.register("standing")} />
        </FormField>
        <FormField
          htmlFor="atmosphere"
          label="Ambiance"
          optional
          error={errors.atmosphere?.message}
        >
          <Input
            id="atmosphere"
            placeholder="Intimiste, scénique…"
            {...form.register("atmosphere")}
          />
        </FormField>
      </FormSection>

      <FormSection
        icon={MapPinned}
        title="Adresse et coordonnées"
        description="Le point géographique prépare les recherches de proximité de la Phase 3."
      >
        <FormField
          htmlFor="address_line1"
          label="Adresse"
          optional
          error={errors.address_line1?.message}
        >
          <Input
            id="address_line1"
            autoComplete="address-line1"
            {...form.register("address_line1")}
          />
        </FormField>
        <FormField
          htmlFor="address_line2"
          label="Complément"
          optional
          error={errors.address_line2?.message}
        >
          <Input
            id="address_line2"
            autoComplete="address-line2"
            {...form.register("address_line2")}
          />
        </FormField>
        <FormField
          htmlFor="postal_code"
          label="Code postal"
          optional
          error={errors.postal_code?.message}
        >
          <Input id="postal_code" autoComplete="postal-code" {...form.register("postal_code")} />
        </FormField>
        <FormField htmlFor="city" label="Ville" error={errors.city?.message}>
          <Input id="city" autoComplete="address-level2" {...form.register("city")} />
        </FormField>
        <FormField htmlFor="district" label="Quartier" optional error={errors.district?.message}>
          <Input id="district" {...form.register("district")} />
        </FormField>
        <FormField htmlFor="country_code" label="Pays" error={errors.country_code?.message}>
          <Input
            id="country_code"
            className="uppercase"
            maxLength={2}
            {...form.register("country_code")}
          />
        </FormField>
        <FormField
          htmlFor="latitude"
          label="Latitude"
          optional
          description="À renseigner avec la longitude."
          error={errors.latitude?.message}
        >
          <Input
            id="latitude"
            inputMode="decimal"
            placeholder="Ex. 48.856600…"
            {...form.register("latitude")}
          />
        </FormField>
        <FormField htmlFor="longitude" label="Longitude" optional error={errors.longitude?.message}>
          <Input
            id="longitude"
            inputMode="decimal"
            placeholder="Ex. 2.352200…"
            {...form.register("longitude")}
          />
        </FormField>
      </FormSection>

      <FormSection
        icon={Users}
        title="Capacités et seuil commercial"
        description="Les contrôles empêchent qu’un minimum dépasse la capacité disponible."
      >
        <FormField
          htmlFor="capacity_seated"
          label="Capacité assise"
          optional
          error={errors.capacity_seated?.message}
        >
          <Input id="capacity_seated" inputMode="numeric" {...form.register("capacity_seated")} />
        </FormField>
        <FormField
          htmlFor="capacity_standing"
          label="Capacité debout"
          optional
          error={errors.capacity_standing?.message}
        >
          <Input
            id="capacity_standing"
            inputMode="numeric"
            {...form.register("capacity_standing")}
          />
        </FormField>
        <FormField
          htmlFor="minimum_guests"
          label="Minimum de personnes"
          optional
          error={errors.minimum_guests?.message}
        >
          <Input id="minimum_guests" inputMode="numeric" {...form.register("minimum_guests")} />
        </FormField>
        <div className="grid grid-cols-[1fr_6rem] gap-3">
          <FormField
            htmlFor="minimum_spend"
            label="Minimum de consommation"
            optional
            error={errors.minimum_spend?.message}
          >
            <Input id="minimum_spend" inputMode="decimal" {...form.register("minimum_spend")} />
          </FormField>
          <FormField htmlFor="currency" label="Devise" error={errors.currency?.message}>
            <Input
              id="currency"
              className="uppercase"
              maxLength={3}
              {...form.register("currency")}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection
        icon={Sparkles}
        title="Équipement et pertinence"
        description="Ces attributs alimenteront les recommandations sans inventer de promesse commerciale."
      >
        <div className="sm:col-span-2">
          <p className="mb-3 text-sm font-semibold">Équipements disponibles</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {VENUE_FEATURES.map(([key, label]) => (
              <label
                key={key}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border bg-background px-3 text-sm hover:border-primary/35"
              >
                <input
                  type="checkbox"
                  className="size-4 rounded border-input accent-primary"
                  {...form.register(`features.${key}`)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
        <FormField
          htmlFor="event_types"
          label="Catégories d’événements"
          optional
          description="Séparez les valeurs par des virgules."
          error={errors.event_types?.message}
        >
          <Input
            id="event_types"
            placeholder="Ex. Afterwork, Dîner, Showcase…"
            {...form.register("event_types")}
          />
        </FormField>
        <FormField
          htmlFor="target_sectors"
          label="Secteurs privilégiés"
          optional
          description="Séparez les valeurs par des virgules."
          error={errors.target_sectors?.message}
        >
          <Input
            id="target_sectors"
            placeholder="Ex. Conseil, Mode, Tech…"
            {...form.register("target_sectors")}
          />
        </FormField>
      </FormSection>

      <FormSection
        icon={Settings2}
        title="Exploitation"
        description="Contact, disponibilités et conditions internes du dossier."
      >
        <FormField
          htmlFor="internal_contact"
          label="Contact interne"
          optional
          error={errors.internal_contact?.message}
        >
          <Input id="internal_contact" {...form.register("internal_contact")} />
        </FormField>
        <FormField
          htmlFor="opening_note"
          label="Horaires et disponibilités"
          optional
          error={errors.opening_note?.message}
        >
          <Input
            id="opening_note"
            placeholder="Ex. Disponibilités à confirmer…"
            {...form.register("opening_note")}
          />
        </FormField>
        <div className="sm:col-span-2">
          <FormField
            htmlFor="commercial_terms"
            label="Conditions commerciales"
            optional
            error={errors.commercial_terms?.message}
          >
            <Textarea id="commercial_terms" {...form.register("commercial_terms")} />
          </FormField>
        </div>
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background p-4 sm:col-span-2">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            {...form.register("is_active")}
          />
          <span>
            <span className="block text-sm font-semibold">Établissement actif</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Les lieux inactifs restent archivés mais sont exclus du filtre principal.
            </span>
          </span>
        </label>
      </FormSection>

      <footer className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
        <Link
          href={cancelHref}
          className={cn(buttonVariants({ variant: "secondary" }), "sm:min-w-28")}
        >
          Annuler
        </Link>
        <Button type="submit" disabled={isPending} className="sm:min-w-40">
          <Save className="size-4" aria-hidden="true" />
          {isPending ? "Enregistrement…" : "Enregistrer le lieu"}
        </Button>
      </footer>
    </form>
  );
}
