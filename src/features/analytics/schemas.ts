import { z } from "zod";

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value.trim() : undefined),
  z.string().max(120).optional(),
);

const optionalUuid = z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value.trim() : undefined),
  z.uuid().optional(),
);

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export const analyticsFiltersSchema = z
  .object({
    start: z.iso.date().default(() => daysAgoIso(29)),
    end: z.iso.date().default(todayIso),
    owner: optionalUuid,
    campaign: optionalUuid,
    sector: optionalText,
    zone: optionalText,
    venue: optionalUuid,
    offer: optionalUuid,
    source: optionalText,
    companySize: optionalText,
    companyStatus: optionalText,
    stage: optionalUuid,
  })
  .superRefine((value, context) => {
    const start = new Date(`${value.start}T00:00:00.000Z`);
    const end = new Date(`${value.end}T23:59:59.999Z`);
    if (start > end) {
      context.addIssue({
        code: "custom",
        path: ["start"],
        message: "La date de début doit précéder la date de fin.",
      });
    }
    if (end.getTime() - start.getTime() > 366 * 86_400_000) {
      context.addIssue({
        code: "custom",
        path: ["end"],
        message: "La période est limitée à 366 jours.",
      });
    }
  });

export type AnalyticsFilters = z.infer<typeof analyticsFiltersSchema>;

export function parseAnalyticsFilters(
  input: Record<string, string | string[] | undefined>,
): AnalyticsFilters {
  const flattened = Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
  const result = analyticsFiltersSchema.safeParse(flattened);
  return result.success ? result.data : analyticsFiltersSchema.parse({});
}
