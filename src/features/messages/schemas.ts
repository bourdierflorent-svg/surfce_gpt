import { z } from "zod";

export const personalizationFactSchema = z.object({
  fact: z.string().trim().min(1).max(300),
  source_reference: z.string().trim().min(1).max(200),
});

export const emailVariantSchema = z.object({
  label: z.enum(["Directe", "Premium", "Relationnelle"]),
  subject: z.string().trim().min(3).max(140),
  body_text: z.string().trim().min(20).max(4000),
  body_html: z.string().trim().min(20).max(12000),
  personalization_facts: z.array(personalizationFactSchema).max(8),
  risk_flags: z.array(z.string().trim().min(1).max(200)).max(8),
});

export const emailGenerationOutputSchema = z.object({
  variants: z.array(emailVariantSchema).length(3),
  recommended_variant: z.number().int().min(0).max(2),
  reason: z.string().trim().min(1).max(500),
  missing_information: z.array(z.string().trim().min(1).max(200)).max(12),
});

export const generateMessagesRequestSchema = z.object({
  campaignId: z.string().uuid(),
  idempotencyKey: z.string().trim().min(8).max(160).optional(),
});

export const sendMessageRequestSchema = z.object({
  messageId: z.string().uuid(),
});

export const sendTestMessageRequestSchema = z.object({
  messageId: z.string().uuid(),
  recipient: z.string().trim().email().optional(),
});

export type EmailGenerationOutput = z.infer<typeof emailGenerationOutputSchema>;
export type EmailVariant = z.infer<typeof emailVariantSchema>;
