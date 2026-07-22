import {
  ArrowLeft,
  CalendarDays,
  Download,
  FileText,
  ImageIcon,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  TicketCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { AssetUploadForm } from "@/features/venues/components/asset-upload-form";
import { DeleteResourceButton } from "@/features/venues/components/delete-resource-button";
import { VENUE_FEATURES } from "@/features/venues/schemas";
import { getVenueDetail } from "@/features/venues/server/queries";
import type { VenueOffer } from "@/features/venues/types";
import { can } from "@/lib/permissions/roles";
import { cn } from "@/lib/utils";
import type { Json } from "@/types/database";

interface VenuePageProps {
  params: Promise<{ venueId: string }>;
}

const dayLabels: Record<number, string> = {
  0: "dim",
  1: "lun",
  2: "mar",
  3: "mer",
  4: "jeu",
  5: "ven",
  6: "sam",
};

function money(value: number | null, currency: string): string {
  if (value === null) return "À confirmer";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function jsonRecord(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function jsonList(value: Json): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function OfferRow({
  canEdit,
  offer,
  venueId,
}: {
  canEdit: boolean;
  offer: VenueOffer;
  venueId: string;
}) {
  const inclusions = jsonList(offer.inclusions);

  return (
    <article className="grid gap-5 border-b border-border px-5 py-5 last:border-b-0 lg:grid-cols-[1.3fr_0.65fr_0.65fr_auto] lg:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-xl font-semibold tracking-[-0.035em]">{offer.name}</h3>
          <Badge>{offer.is_active ? "Active" : "Inactive"}</Badge>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {offer.short_description ?? "Résumé commercial à compléter."}
        </p>
        {inclusions.length > 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">Inclus : {inclusions.join(" · ")}</p>
        ) : null}
      </div>
      <div>
        <p className="font-data text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Jauge
        </p>
        <p className="mt-2 text-sm font-semibold">
          {offer.min_guests ?? "—"} à {offer.max_guests ?? "—"} personnes
        </p>
      </div>
      <div>
        <p className="font-data text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Budget minimum
        </p>
        <p className="mt-2 text-sm font-semibold">{money(offer.minimum_budget, offer.currency)}</p>
        {offer.available_days.length > 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {offer.available_days.map((day) => dayLabels[day]).join(" · ")}
          </p>
        ) : null}
      </div>
      {canEdit ? (
        <div className="flex items-center gap-1 lg:justify-end">
          <Link
            href={`/venues/${venueId}/offers/${offer.id}/edit`}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            Modifier
          </Link>
          <DeleteResourceButton kind="offer" venueId={venueId} offerId={offer.id} />
        </div>
      ) : null}
    </article>
  );
}

export default async function VenuePage({ params }: VenuePageProps) {
  const context = await requireAppAuthContext();
  const { venueId } = await params;
  const venue = await getVenueDetail(context, venueId);
  if (!venue) notFound();

  const canEdit = can(context.membership.role, "venues:write") && !context.isPreview;
  const featureRecord = jsonRecord(venue.features);
  const activeFeatures = VENUE_FEATURES.filter(([key]) => featureRecord[key] === true);
  const openingRules = jsonRecord(venue.opening_rules);
  const openingNote = typeof openingRules.note === "string" ? openingRules.note : null;
  const coordinates =
    venue.latitude !== null && venue.longitude !== null
      ? `${venue.latitude.toFixed(6)}, ${venue.longitude.toFixed(6)}`
      : "À confirmer";
  const metrics: Array<{ icon: LucideIcon; label: string; value: number | string }> = [
    { label: "Capacité assise", value: venue.capacity_seated ?? "—", icon: Users },
    { label: "Capacité debout", value: venue.capacity_standing ?? "—", icon: Users },
    { label: "Minimum invités", value: venue.minimum_guests ?? "—", icon: TicketCheck },
    {
      label: "Minimum commercial",
      value: money(venue.minimum_spend, venue.currency),
      icon: Sparkles,
    },
  ];

  return (
    <div className="mx-auto max-w-[90rem] space-y-8">
      <header className="grid overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-[1.55fr_0.45fr]">
        <div className="p-6 sm:p-8 lg:p-10">
          <Link
            href="/venues"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Registre des lieux
          </Link>
          <div className="mt-10 flex flex-wrap items-center gap-2">
            <Badge>{venue.is_active ? "Actif" : "Inactif"}</Badge>
            <span className="font-data text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {venue.venue_type}
            </span>
          </div>
          <h1 className="font-display mt-4 text-balance text-5xl font-semibold tracking-[-0.065em] sm:text-6xl lg:text-7xl">
            {venue.name}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
            {venue.description ?? "Description du lieu à compléter."}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {canEdit ? (
              <Link href={`/venues/${venue.id}/edit`} className={buttonVariants()}>
                <Pencil className="size-4" aria-hidden="true" />
                Modifier le dossier
              </Link>
            ) : null}
            {canEdit ? <DeleteResourceButton kind="venue" venueId={venue.id} /> : null}
          </div>
        </div>
        <div className="relative flex min-h-72 flex-col justify-between overflow-hidden bg-[#102a43] p-6 text-white sm:p-8 lg:min-h-full">
          <div
            className="absolute -right-16 top-1/2 size-64 -translate-y-1/2 rounded-full border border-white/10"
            aria-hidden="true"
          />
          <div
            className="absolute -right-4 top-1/2 size-40 -translate-y-1/2 rounded-full border border-white/10"
            aria-hidden="true"
          />
          <div className="relative">
            <p className="font-data text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/55">
              Passeport lieu
            </p>
            <p className="font-data mt-3 text-xs tracking-[0.08em] text-white/85">
              PAR / {venue.slug.toUpperCase()}
            </p>
          </div>
          <div className="relative space-y-5">
            <div>
              <p className="font-data text-[0.62rem] uppercase tracking-[0.16em] text-white/45">
                Coordonnées
              </p>
              <p className="font-data mt-2 text-sm">{coordinates}</p>
            </div>
            <div className="h-px bg-white/15" />
            <div className="grid grid-cols-2 gap-5">
              <div>
                <p className="font-data text-[0.62rem] uppercase tracking-[0.16em] text-white/45">
                  Ville
                </p>
                <p className="mt-2 text-sm font-semibold">{venue.city}</p>
              </div>
              <div>
                <p className="font-data text-[0.62rem] uppercase tracking-[0.16em] text-white/45">
                  Quartier
                </p>
                <p className="mt-2 text-sm font-semibold">{venue.district ?? "À confirmer"}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section
        aria-label="Capacité et positionnement"
        className="grid overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map(({ icon: Icon, label, value }, index) => (
          <div
            key={label}
            className={cn("p-5", index < 3 && "border-b border-border sm:border-r xl:border-b-0")}
          >
            <Icon className="size-4 text-primary" aria-hidden="true" />
            <p className="font-data mt-5 text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
              {label}
            </p>
            <p className="font-display mt-2 text-2xl font-semibold tracking-[-0.035em] tabular-nums">
              {String(value)}
            </p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-xl font-semibold tracking-[-0.03em]">
                Usages et équipements
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ce que l’équipe peut défendre commercialement.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Événements
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {venue.event_types.length > 0 ? (
                  venue.event_types.map((item) => <Badge key={item}>{item}</Badge>)
                ) : (
                  <span className="text-sm text-muted-foreground">À compléter</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Secteurs
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {venue.target_sectors.length > 0 ? (
                  venue.target_sectors.map((item) => <Badge key={item}>{item}</Badge>)
                ) : (
                  <span className="text-sm text-muted-foreground">À compléter</span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-6 border-t border-border pt-5">
            <div className="flex flex-wrap gap-x-5 gap-y-3">
              {activeFeatures.length > 0 ? (
                activeFeatures.map(([, label]) => (
                  <span key={label} className="flex items-center gap-2 text-sm">
                    <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                    {label}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">Aucun équipement confirmé.</span>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
              <MapPin className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-xl font-semibold tracking-[-0.03em]">
                Exploitation
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Informations utiles avant une proposition.
              </p>
            </div>
          </div>
          <dl className="mt-6 divide-y divide-border text-sm">
            <div className="grid grid-cols-[8rem_1fr] gap-4 py-3 first:pt-0">
              <dt className="text-muted-foreground">Adresse</dt>
              <dd className="font-medium">
                {[venue.address_line1, venue.postal_code, venue.city].filter(Boolean).join(", ") ||
                  "À confirmer"}
              </dd>
            </div>
            <div className="grid grid-cols-[8rem_1fr] gap-4 py-3">
              <dt className="text-muted-foreground">Ambiance</dt>
              <dd className="font-medium">{venue.atmosphere ?? "À compléter"}</dd>
            </div>
            <div className="grid grid-cols-[8rem_1fr] gap-4 py-3">
              <dt className="text-muted-foreground">Standing</dt>
              <dd className="font-medium">{venue.standing ?? "À compléter"}</dd>
            </div>
            <div className="grid grid-cols-[8rem_1fr] gap-4 py-3">
              <dt className="text-muted-foreground">Contact</dt>
              <dd className="font-medium">{venue.internal_contact ?? "À désigner"}</dd>
            </div>
            <div className="grid grid-cols-[8rem_1fr] gap-4 py-3 last:pb-0">
              <dt className="text-muted-foreground">Disponibilité</dt>
              <dd className="font-medium">{openingNote ?? "À confirmer"}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <header className="flex flex-col gap-4 border-b border-border bg-muted/35 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="font-data text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-primary">
              Catalogue commercial
            </p>
            <h2 className="font-display mt-2 text-2xl font-semibold tracking-[-0.035em]">
              Offres du lieu
            </h2>
          </div>
          {canEdit ? (
            <Link
              href={`/venues/${venue.id}/offers/new`}
              className={buttonVariants({ size: "sm" })}
            >
              <Plus className="size-4" aria-hidden="true" />
              Créer une offre
            </Link>
          ) : null}
        </header>
        {venue.offers.length > 0 ? (
          venue.offers.map((offer) => (
            <OfferRow key={offer.id} offer={offer} venueId={venue.id} canEdit={canEdit} />
          ))
        ) : (
          <div className="px-6 py-12 text-center">
            <TicketCheck className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold">Aucune offre enregistrée</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Créez le premier format commercial de ce lieu.
            </p>
          </div>
        )}
      </section>

      <section className="space-y-5">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="font-data text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-primary">
              Fichiers privés
            </p>
            <h2 className="font-display mt-2 text-2xl font-semibold tracking-[-0.035em]">
              Galerie et documents
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">{venue.assets.length} fichier(s)</p>
        </header>

        {venue.assets.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {venue.assets.map((asset) => (
              <article
                key={asset.id}
                className="overflow-hidden rounded-xl border border-border bg-card"
              >
                {asset.asset_type === "image" && asset.signedUrl ? (
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    <Image
                      src={asset.signedUrl}
                      alt={asset.title}
                      fill
                      unoptimized
                      sizes="(min-width: 1280px) 30vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="grid aspect-[16/10] place-items-center bg-[#102a43] text-white">
                    {asset.asset_type === "image" ? (
                      <ImageIcon className="size-8" aria-hidden="true" />
                    ) : (
                      <FileText className="size-8" aria-hidden="true" />
                    )}
                  </div>
                )}
                <div className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{asset.title}</p>
                    <p className="font-data mt-1 text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
                      {asset.asset_type}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {asset.signedUrl ? (
                      <a
                        href={asset.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={buttonVariants({ variant: "ghost", size: "icon" })}
                        aria-label={`Ouvrir ${asset.title}`}
                      >
                        <Download className="size-4" aria-hidden="true" />
                      </a>
                    ) : null}
                    {canEdit ? (
                      <DeleteResourceButton kind="asset" venueId={venue.id} assetId={asset.id} />
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-border bg-card px-6 text-center">
            <div>
              <ImageIcon className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold">Galerie vide</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ajoutez les visuels et brochures vérifiés du lieu.
              </p>
            </div>
          </div>
        )}

        {canEdit ? <AssetUploadForm venueId={venue.id} offers={venue.offers} /> : null}
      </section>

      {venue.commercial_terms ? (
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 size-4 text-primary" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-semibold">Conditions commerciales</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                {venue.commercial_terms}
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
