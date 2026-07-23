import { z } from "zod";

export const mailboxProviderSchema = z.enum(["google", "microsoft"]);

export const mailboxIdSchema = z.string().uuid();

export type MailboxProvider = z.infer<typeof mailboxProviderSchema>;
