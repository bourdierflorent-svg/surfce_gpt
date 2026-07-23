import { MockContactVerificationProvider } from "./mock";
import type { ContactVerificationProvider } from "./types";

export function getContactVerificationProvider(): ContactVerificationProvider {
  const provider = process.env.CONTACT_VERIFICATION_PROVIDER?.trim().toLowerCase() || "mock";
  if (provider === "mock") return new MockContactVerificationProvider();

  throw new Error(
    `Le provider de vérification ${provider} n’est pas activé. Utilisez CONTACT_VERIFICATION_PROVIDER=mock pour la Phase 5.`,
  );
}

export type * from "./types";
