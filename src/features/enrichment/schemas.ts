import { z } from "zod";

export const jobRequestSchema = z.object({
  idempotencyKey: z.uuid().optional(),
});

export const personaRequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("generate"), idempotencyKey: z.uuid().optional() }),
  z.object({ action: z.literal("validate"), personaId: z.uuid() }),
]);

export const matchingRequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("generate"), idempotencyKey: z.uuid().optional() }),
  z.object({ action: z.literal("select"), matchId: z.uuid() }),
]);
