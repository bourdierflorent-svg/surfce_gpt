import { z } from "zod";

import { inboundClassificationSchema } from "./classification";

export const classifyMessageRequestSchema = z.object({
  classification: inboundClassificationSchema,
  priority: z.enum(["low", "normal", "high"]).default("normal"),
});

export const threadIdSchema = z.string().uuid();

export const associateThreadRequestSchema = z.object({
  companyId: z.string().uuid().nullable().optional(),
  contactId: z.string().uuid().nullable().optional(),
  campaignId: z.string().uuid().nullable().optional(),
});

export const threadReplyRequestSchema = z.object({
  subject: z.string().trim().min(3).max(140),
  bodyText: z.string().trim().min(2).max(10_000),
});

export const threadSummaryOutputSchema = z.object({
  summary: z.string().trim().min(1).max(1200),
  intention: inboundClassificationSchema,
  need: z.string().trim().max(500).nullable(),
  date: z.string().trim().max(120).nullable(),
  participantCount: z.number().int().positive().nullable(),
  budget: z.string().trim().max(120).nullable(),
  venue: z.string().trim().max(200).nullable(),
  objections: z.array(z.string().trim().min(1).max(300)).max(8),
  stakeholders: z.array(z.string().trim().min(1).max(200)).max(8),
  commitments: z.array(z.string().trim().min(1).max(300)).max(8),
  nextActions: z.array(z.string().trim().min(1).max(300)).max(8),
  confidence: z.number().min(0).max(1),
});

export const suggestedReplyOutputSchema = z.object({
  subject: z.string().trim().min(3).max(140),
  bodyText: z.string().trim().min(20).max(4000),
  rationale: z.string().trim().min(1).max(500),
  riskFlags: z.array(z.string().trim().min(1).max(200)).max(8),
});

export type ThreadSummaryOutput = z.infer<typeof threadSummaryOutputSchema>;
export type SuggestedReplyOutput = z.infer<typeof suggestedReplyOutputSchema>;
