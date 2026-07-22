import { z } from "zod";

import { fr } from "@/lib/i18n/fr";

export const loginSchema = z.object({
  email: z.string().trim().email(fr.login.invalidEmail).max(254, fr.login.invalidEmail),
  password: z.string().min(8, fr.login.invalidPassword).max(128, fr.login.invalidPassword),
});

export type LoginInput = z.infer<typeof loginSchema>;
