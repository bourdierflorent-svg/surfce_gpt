import { z } from "zod";

export const sendWindowSchema = z.object({
  timezone: z.string().trim().min(1).max(80).default("Europe/Paris"),
  weekdays: z.array(z.number().int().min(1).max(7)).min(1).max(7),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
});

export const sequenceStepInputSchema = z.object({
  position: z.number().int().min(0).max(20),
  delayDays: z.number().int().min(0).max(90),
  delayHours: z.number().int().min(0).max(23).default(0),
  subjectTemplate: z.string().trim().max(140).nullable().optional(),
  bodyTemplateText: z.string().trim().max(4000).nullable().optional(),
  aiInstructions: z.string().trim().max(1000).nullable().optional(),
  requiresApproval: z.boolean().default(false),
});

export const createCampaignRequestSchema = z
  .object({
    name: z.string().trim().min(3).max(140),
    description: z.string().trim().max(1000).nullable().optional(),
    venueId: z.string().uuid().nullable().optional(),
    offerId: z.string().uuid().nullable().optional(),
    mailboxId: z.string().uuid(),
    language: z.string().trim().min(2).max(10).default("fr"),
    tone: z
      .enum([
        "directe et commerciale",
        "premium et événementielle",
        "relationnelle et personnalisée",
      ])
      .default("directe et commerciale"),
    dailyLimit: z.number().int().min(1).max(100).default(10),
    sendWindow: sendWindowSchema.default({
      timezone: "Europe/Paris",
      weekdays: [1, 2, 3, 4, 5],
      start: "09:00",
      end: "17:30",
    }),
    stopRules: z
      .object({
        humanReply: z.boolean().default(true),
        unsubscribe: z.boolean().default(true),
        bounce: z.boolean().default(true),
        doNotContact: z.boolean().default(true),
      })
      .default({
        humanReply: true,
        unsubscribe: true,
        bounce: true,
        doNotContact: true,
      }),
    steps: z.array(sequenceStepInputSchema).min(1).max(8),
  })
  .superRefine((value, context) => {
    const positions = new Set(value.steps.map((step) => step.position));
    if (positions.size !== value.steps.length || !positions.has(0)) {
      context.addIssue({
        code: "custom",
        path: ["steps"],
        message: "La séquence doit commencer à 0 et chaque position doit être unique.",
      });
    }
    if (value.offerId && !value.venueId) {
      context.addIssue({
        code: "custom",
        path: ["offerId"],
        message: "Une offre doit être rattachée à un établissement.",
      });
    }
  });

export const campaignActionRequestSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(160).optional(),
});

export const enrollCampaignRequestSchema = z.object({
  contactId: z.string().uuid(),
});

export const unenrollCampaignRequestSchema = z.object({
  enrollmentId: z.string().uuid(),
  reason: z.string().trim().min(3).max(300).default("retiré manuellement"),
});

export type CreateCampaignInput = z.infer<typeof createCampaignRequestSchema>;
export type SendWindow = z.infer<typeof sendWindowSchema>;
