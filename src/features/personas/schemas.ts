import { z } from "zod";

const confidence = z.number().min(0).max(1);
const nullableRangeValue = z.number().nonnegative().nullable();

export const personaOutputSchema = z.object({
  company_type: z.string().min(2).max(180).nullable(),
  summary: z.string().min(10).max(4000),
  estimated_size: z.object({
    label: z.string().min(1).max(120).nullable(),
    confidence,
  }),
  event_maturity: z.object({
    level: z.enum(["low", "medium", "high", "unknown"]),
    confidence,
  }),
  probable_needs: z.array(
    z.object({
      type: z.string().min(2).max(120),
      confidence,
      reason: z.string().min(4).max(500),
    }),
  ),
  likely_contact_roles: z.array(z.string().min(2).max(120)),
  recommended_event_types: z.array(z.string().min(2).max(120)),
  estimated_guest_range: z.object({
    min: nullableRangeValue,
    max: nullableRangeValue,
    confidence,
  }),
  estimated_budget_range: z.object({
    min: nullableRangeValue,
    max: nullableRangeValue,
    currency: z.string().regex(/^[A-Z]{3}$/),
    confidence,
  }),
  fit_score: z.number().int().min(0).max(100),
  confidence,
  risks: z.array(z.string().min(2).max(500)),
  evidence: z.array(
    z.object({
      claim: z.string().min(4).max(500),
      source_type: z.string().min(2).max(80),
      source_reference: z.string().min(2).max(240),
      confidence,
    }),
  ),
});

export type PersonaOutput = z.infer<typeof personaOutputSchema>;
