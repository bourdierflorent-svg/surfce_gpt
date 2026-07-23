import type {
  ContactEmailVerification,
  ContactEmailVerificationInput,
  ContactVerificationProvider,
} from "./types";

export class MockContactVerificationProvider implements ContactVerificationProvider {
  readonly name = "mock_email_verification";
  readonly estimatedCost = 0;

  async verifyEmail(input: ContactEmailVerificationInput): Promise<ContactEmailVerification> {
    const email = input.email?.trim().toLowerCase() ?? "";
    const domain = email.split("@")[1] ?? "";
    const hasShape = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const domainMatches = !input.companyDomain || domain === input.companyDomain.toLowerCase();
    const status = !hasShape ? "invalid" : domainMatches ? "valid" : "risky";

    return {
      provider: this.name,
      status,
      confidence: status === "valid" ? 0.97 : status === "risky" ? 0.63 : 0.99,
      reason:
        status === "valid"
          ? "Adresse professionnelle simulée : syntaxe valide et domaine cohérent."
          : status === "risky"
            ? "Adresse simulée valide, mais le domaine diffère de celui de l’entreprise."
            : "Adresse absente ou syntaxiquement invalide.",
      externalReference: `mock-email:${input.contactId}:${email || "missing"}`,
      checkedAt: new Date().toISOString(),
      estimatedCost: 0,
      mock: true,
    };
  }
}
