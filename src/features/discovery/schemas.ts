import { z } from "zod";

const geoPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const polygonPointSchema = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);

export const discoverySearchSchema = z
  .object({
    query: z.string().trim().max(160).default(""),
    category: z.string().trim().max(100).default(""),
    city: z.string().trim().max(100).default("Paris"),
    district: z.string().trim().max(40).default(""),
    mode: z.enum(["radius", "polygon"]),
    center: geoPointSchema.optional(),
    radiusMeters: z.number().int().min(100).max(100_000).optional(),
    polygon: z.array(polygonPointSchema).max(40).optional(),
    filters: z
      .object({
        hasWebsite: z.boolean().optional(),
        hasPhone: z.boolean().optional(),
        employeeRange: z.string().max(40).optional(),
      })
      .default({}),
  })
  .superRefine((value, context) => {
    if (value.mode === "radius" && (!value.center || !value.radiusMeters)) {
      context.addIssue({
        code: "custom",
        path: ["center"],
        message: "Un centre et un rayon sont requis.",
      });
    }

    if (value.mode === "polygon" && (!value.polygon || value.polygon.length < 3)) {
      context.addIssue({
        code: "custom",
        path: ["polygon"],
        message: "Le polygone doit comporter au moins trois points.",
      });
    }
  });

export const discoveryImportSchema = z.object({
  externalId: z.string().trim().min(3).max(160),
});

export const discoveryBatchImportSchema = z.object({
  externalIds: z.array(z.string().trim().min(3).max(160)).min(1).max(25),
});

export const savedSearchSchema = z.object({
  name: z.string().trim().min(2).max(120),
  search: discoverySearchSchema,
  resultCount: z.number().int().min(0).max(10_000),
});

export type DiscoverySearchInput = z.output<typeof discoverySearchSchema>;
