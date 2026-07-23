import { z } from "zod";

const nullableUuid = z.string().uuid().nullable().optional();
const nullableDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .optional();
const nullableDateTime = z.string().datetime({ offset: true }).nullable().optional();
const nullableMoney = z.number().min(0).max(100_000_000).nullable().optional();

const opportunityFieldsSchema = z.object({
  companyId: z.string().uuid(),
  primaryContactId: nullableUuid,
  venueId: nullableUuid,
  offerId: nullableUuid,
  campaignId: nullableUuid,
  ownerId: z.string().uuid().optional(),
  stageId: z.string().uuid(),
  title: z.string().trim().min(3).max(200),
  estimatedAmount: nullableMoney,
  proposedAmount: nullableMoney,
  signedAmount: nullableMoney,
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase())
    .default("EUR"),
  estimatedGuests: z.number().int().positive().max(100_000).nullable().optional(),
  eventType: z.string().trim().max(120).nullable().optional(),
  desiredEventDate: nullableDate,
  expectedCloseDate: nullableDate,
  source: z.string().trim().min(2).max(80).default("manual"),
  objections: z.array(z.string().trim().min(1).max(300)).max(12).default([]),
  nextAction: z.string().trim().max(300).nullable().optional(),
  nextActionAt: nullableDateTime,
  lossReason: z.string().trim().max(500).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
});

export const createOpportunityRequestSchema = opportunityFieldsSchema.superRefine(
  (value, context) => {
    if (value.offerId && !value.venueId) {
      context.addIssue({
        code: "custom",
        path: ["offerId"],
        message: "Une offre nécessite un établissement.",
      });
    }
  },
);

export const updateOpportunityRequestSchema = opportunityFieldsSchema
  .omit({ companyId: true, stageId: true, source: true })
  .partial();

export const moveOpportunityStageRequestSchema = z.object({
  stageId: z.string().uuid(),
  lossReason: z.string().trim().max(500).nullable().optional(),
});

export const createTaskRequestSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  assignedTo: z.string().uuid().optional(),
  dueAt: nullableDateTime,
});

export const taskStatusRequestSchema = z.object({
  status: z.enum(["todo", "in_progress", "completed", "cancelled"]),
});

export const createAppointmentRequestSchema = z
  .object({
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().max(2000).nullable().optional(),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    location: z.string().trim().max(300).nullable().optional(),
  })
  .refine((value) => new Date(value.endsAt) > new Date(value.startsAt), {
    path: ["endsAt"],
    message: "La fin doit être postérieure au début.",
  });

export const createProposalRequestSchema = z.object({
  venueId: nullableUuid,
  offerId: nullableUuid,
  amount: z.number().min(0).max(100_000_000),
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase())
    .default("EUR"),
  guestCount: z.number().int().positive().max(100_000).nullable().optional(),
  eventDate: nullableDate,
  summary: z.string().trim().min(3).max(2000),
  inclusions: z.array(z.string().trim().min(1).max(300)).max(30).default([]),
  terms: z.string().trim().max(3000).nullable().optional(),
});

export const proposalStatusRequestSchema = z.object({
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]),
});

export const stageConfigurationRequestSchema = z.object({
  label: z.string().trim().min(2).max(80),
  defaultProbability: z.number().int().min(0).max(100),
  isActive: z.boolean(),
});

export const createOpportunityFromThreadRequestSchema = z.object({
  title: z.string().trim().min(3).max(200),
  eventType: z.string().trim().max(120).nullable().optional(),
  estimatedGuests: z.number().int().positive().max(100_000).nullable().optional(),
  desiredEventDate: nullableDate,
  nextAction: z.string().trim().min(2).max(300).default("Qualifier le besoin"),
  nextActionAt: nullableDateTime,
});

export type CreateOpportunityInput = z.infer<typeof createOpportunityRequestSchema>;
export type UpdateOpportunityInput = z.infer<typeof updateOpportunityRequestSchema>;
export type CreateTaskInput = z.infer<typeof createTaskRequestSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentRequestSchema>;
export type CreateProposalInput = z.infer<typeof createProposalRequestSchema>;
