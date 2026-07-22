import { z } from "zod";

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

const optionalNumber = (label: string, options?: { integer?: boolean; max?: number }) =>
  z
    .string()
    .trim()
    .refine(
      (value) => value === "" || Number.isFinite(Number(value)),
      `${label} doit être un nombre.`,
    )
    .refine((value) => value === "" || Number(value) >= 0, `${label} ne peut pas être négatif.`)
    .refine(
      (value) => value === "" || !options?.integer || Number.isInteger(Number(value)),
      `${label} doit être un nombre entier.`,
    )
    .refine(
      (value) => value === "" || options?.max === undefined || Number(value) <= options.max,
      `${label} dépasse la valeur maximale autorisée.`,
    )
    .transform((value) => (value === "" ? null : Number(value)));

const optionalCoordinate = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .refine((value) => value === "" || Number.isFinite(Number(value)), `${label} est invalide.`)
    .refine(
      (value) => value === "" || (Number(value) >= min && Number(value) <= max),
      `${label} doit être comprise entre ${min} et ${max}.`,
    )
    .transform((value) => (value === "" ? null : Number(value)));

const commaSeparatedList = z
  .string()
  .max(800)
  .transform((value) =>
    Array.from(
      new Set(
        value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ),
  );

export const VENUE_FEATURES = [
  ["catering", "Restauration"],
  ["bar", "Bar"],
  ["cocktails", "Cocktails"],
  ["terrace", "Terrasse"],
  ["stage", "Scène"],
  ["dj", "DJ"],
  ["sound", "Sonorisation"],
  ["lighting", "Lumière"],
  ["screens", "Écrans"],
  ["cloakroom", "Vestiaire"],
  ["accessible", "Accessibilité"],
  ["parking", "Parking / voiturier"],
  ["full_privatisation", "Privatisation totale"],
  ["partial_privatisation", "Privatisation partielle"],
] as const;

const featureShape = Object.fromEntries(
  VENUE_FEATURES.map(([key]) => [key, z.boolean()]),
) as Record<(typeof VENUE_FEATURES)[number][0], z.ZodBoolean>;

export const venueFormSchema = z
  .object({
    name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères.").max(120),
    venue_type: z.string().trim().min(2, "Indiquez le type d’établissement.").max(80),
    description: nullableText(4000),
    address_line1: nullableText(200),
    address_line2: nullableText(200),
    postal_code: nullableText(20),
    city: z.string().trim().min(2, "Indiquez la ville.").max(100),
    country_code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, "Utilisez un code pays sur 2 lettres."),
    latitude: optionalCoordinate("La latitude", -90, 90),
    longitude: optionalCoordinate("La longitude", -180, 180),
    district: nullableText(120),
    standing: nullableText(120),
    atmosphere: nullableText(240),
    capacity_seated: optionalNumber("La capacité assise", { integer: true }),
    capacity_standing: optionalNumber("La capacité debout", { integer: true }),
    minimum_guests: optionalNumber("Le nombre minimum de personnes", { integer: true }),
    minimum_spend: optionalNumber("Le minimum de consommation"),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, "Utilisez un code devise sur 3 lettres."),
    features: z.object(featureShape),
    event_types: commaSeparatedList,
    target_sectors: commaSeparatedList,
    opening_note: nullableText(1000),
    internal_contact: nullableText(200),
    commercial_terms: nullableText(3000),
    is_active: z.boolean(),
  })
  .superRefine((data, context) => {
    if ((data.latitude === null) !== (data.longitude === null)) {
      context.addIssue({
        code: "custom",
        path: [data.latitude === null ? "latitude" : "longitude"],
        message: "Latitude et longitude doivent être renseignées ensemble.",
      });
    }

    const largestCapacity = Math.max(data.capacity_seated ?? 0, data.capacity_standing ?? 0);
    if (
      data.minimum_guests !== null &&
      largestCapacity > 0 &&
      data.minimum_guests > largestCapacity
    ) {
      context.addIssue({
        code: "custom",
        path: ["minimum_guests"],
        message: "Le minimum ne peut pas dépasser la capacité maximale.",
      });
    }
  });

export type VenueFormInput = z.input<typeof venueFormSchema>;
export type VenueFormData = z.output<typeof venueFormSchema>;

export const offerFormSchema = z
  .object({
    name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères.").max(120),
    event_type: z.string().trim().min(2, "Indiquez le type d’événement.").max(80),
    short_description: nullableText(280),
    description: nullableText(4000),
    min_guests: optionalNumber("Le nombre minimum de personnes", { integer: true }),
    max_guests: optionalNumber("Le nombre maximum de personnes", { integer: true }),
    minimum_budget: optionalNumber("Le budget minimum"),
    indicative_price: optionalNumber("Le prix indicatif"),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, "Utilisez un code devise sur 3 lettres."),
    duration_minutes: optionalNumber("La durée", { integer: true }),
    available_days: z.array(z.coerce.number().int().min(0).max(6)),
    available_time_start: nullableText(8),
    available_time_end: nullableText(8),
    inclusions: commaSeparatedList,
    options: commaSeparatedList,
    commission_rate: optionalNumber("La commission", { max: 100 }),
    terms: nullableText(3000),
    valid_from: nullableText(10),
    valid_until: nullableText(10),
    is_active: z.boolean(),
  })
  .superRefine((data, context) => {
    if (data.min_guests !== null && data.max_guests !== null && data.min_guests > data.max_guests) {
      context.addIssue({
        code: "custom",
        path: ["max_guests"],
        message: "Le maximum doit être supérieur ou égal au minimum.",
      });
    }

    if (data.valid_from && data.valid_until && data.valid_from > data.valid_until) {
      context.addIssue({
        code: "custom",
        path: ["valid_until"],
        message: "La fin de validité doit être postérieure au début.",
      });
    }
  });

export type OfferFormInput = z.input<typeof offerFormSchema>;
export type OfferFormData = z.output<typeof offerFormSchema>;

export const assetMetadataSchema = z.object({
  title: z.string().trim().min(1, "Donnez un titre au fichier.").max(160),
  asset_type: z.enum(["image", "brochure", "floor_plan", "menu", "other"]),
  offer_id: z
    .string()
    .uuid()
    .or(z.literal(""))
    .transform((value) => value || null),
  is_public: z.boolean(),
});

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
