import { z } from "zod";

export const verifyContactEmailRequestSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(160).optional(),
});

export const suppressContactRequestSchema = z.object({
  reason: z.string().trim().min(3).max(500),
  source: z.string().trim().min(2).max(80).default("manual"),
});
