import { HunterContactVerificationProvider } from "./hunter";
import { MockContactVerificationProvider } from "./mock";
import type { ContactVerificationProvider } from "./types";

export function getContactVerificationProvider(): ContactVerificationProvider {
  const provider = process.env.CONTACT_VERIFICATION_PROVIDER?.trim().toLowerCase() || "mock";
  if (provider === "mock") return new MockContactVerificationProvider();
  if (provider === "hunter") {
    return new HunterContactVerificationProvider(process.env.HUNTER_API_KEY ?? "");
  }

  throw new Error(`Le provider de vérification ${provider} n’est pas supporté par SURFCE.`);
}

export type * from "./types";
