import { z } from "zod";

export const complianceSettingsSchema = z.object({
  defaultLawfulBasis: z.enum(["legitimate_interest", "consent", "contract", "legal_obligation"]),
  contactRetentionDays: z.number().int().min(30).max(3650),
  messageRetentionDays: z.number().int().min(30).max(3650),
  providerLogRetentionDays: z.number().int().min(30).max(1825),
  auditRetentionDays: z.number().int().min(365).max(3650),
  anonymizeInactiveContacts: z.boolean(),
  retainSuppressionProof: z.boolean(),
  trackingEnabled: z.boolean(),
});

export const privacyRequestSchema = z.object({
  contactId: z.uuid(),
  requestType: z.enum(["anonymize", "delete"]),
  reason: z.string().trim().min(3).max(500),
  confirmation: z.literal("CONFIRMER"),
});

export const contactAccessSchema = z.object({
  contactId: z.uuid(),
  reason: z.string().trim().min(3).max(500).default("Demande d’accès de la personne concernée"),
});

export const auditFiltersSchema = z.object({
  action: z.string().trim().max(100).optional().catch(undefined),
  entityType: z.string().trim().max(100).optional().catch(undefined),
  actor: z.uuid().optional().catch(undefined),
  start: z.iso.date().optional().catch(undefined),
  end: z.iso.date().optional().catch(undefined),
});

export type ComplianceSettingsInput = z.infer<typeof complianceSettingsSchema>;
export type PrivacyRequestInput = z.infer<typeof privacyRequestSchema>;
export type AuditFilters = z.infer<typeof auditFiltersSchema>;
