import { createHash } from "node:crypto";

import { z } from "zod";

import type {
  ContactEmailVerification,
  ContactEmailVerificationInput,
  ContactVerificationProvider,
} from "./types";

const HUNTER_EMAIL_VERIFIER_URL = "https://api.hunter.io/v2/email-verifier";
const REQUEST_TIMEOUT_MS = 25_000;

const hunterResponseSchema = z.object({
  data: z.object({
    status: z.enum(["valid", "invalid", "accept_all", "webmail", "disposable", "unknown"]),
    score: z.number().min(0).max(100).optional(),
  }),
});

type HunterStatus = z.infer<typeof hunterResponseSchema>["data"]["status"];

function verificationStatus(status: HunterStatus): ContactEmailVerification["status"] {
  if (status === "valid") return "valid";
  if (status === "invalid" || status === "disposable") return "invalid";
  return "risky";
}

function verificationReason(status: HunterStatus): string {
  switch (status) {
    case "valid":
      return "Hunter confirme que l’adresse accepte les messages.";
    case "invalid":
      return "Hunter indique que l’adresse n’est pas distribuable.";
    case "accept_all":
      return "Le domaine accepte toutes les adresses : la distribution reste incertaine.";
    case "webmail":
      return "Adresse de messagerie grand public : son rattachement à l’entreprise reste incertain.";
    case "disposable":
      return "Hunter identifie une adresse de messagerie jetable.";
    case "unknown":
      return "Hunter n’a pas pu confirmer la distribution de cette adresse.";
  }
}

function defaultConfidence(status: HunterStatus): number {
  if (status === "valid") return 0.9;
  if (status === "invalid" || status === "disposable") return 0.95;
  return 0.5;
}

function providerError(status: number): Error {
  if (status === 202) {
    return new Error(
      "Hunter traite encore cette adresse. Relancez la vérification dans un instant.",
    );
  }
  if (status === 222) {
    return new Error("Hunter n’a pas pu interroger le serveur de messagerie. Réessayez plus tard.");
  }
  if (status === 401) {
    return new Error("La clé Hunter est invalide ou révoquée.");
  }
  if (status === 403) {
    return new Error("La limite de débit Hunter est atteinte. Réessayez plus tard.");
  }
  if (status === 429) {
    return new Error("Le quota Hunter est épuisé. Vérifiez le forfait du compte.");
  }
  if (status === 451) {
    return new Error(
      "Hunter refuse cette vérification pour motif de confidentialité. Aucun résultat n’a été enregistré.",
    );
  }
  if (status >= 500) return new Error("Hunter est temporairement indisponible.");
  return new Error(`Hunter a refusé la vérification (statut ${status}).`);
}

export class HunterContactVerificationProvider implements ContactVerificationProvider {
  readonly name = "hunter";
  readonly estimatedCost = 0;

  constructor(
    private readonly apiKey: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    if (!apiKey.trim()) throw new Error("HUNTER_API_KEY est requise pour activer Hunter.");
  }

  async verifyEmail(input: ContactEmailVerificationInput): Promise<ContactEmailVerification> {
    const emailResult = z.string().trim().toLowerCase().email().safeParse(input.email);
    if (!emailResult.success) {
      throw new Error("Une adresse e-mail valide est requise avant la vérification Hunter.");
    }

    const target = new URL(HUNTER_EMAIL_VERIFIER_URL);
    target.searchParams.set("email", emailResult.data);
    const response = await this.fetcher(target, {
      headers: {
        accept: "application/json",
        "X-API-KEY": this.apiKey,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok || response.status === 202 || response.status === 222) {
      throw providerError(response.status);
    }

    const parsed = hunterResponseSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error("La réponse Hunter est incomplète ou incompatible.");

    const providerStatus = parsed.data.data.status;
    const status = verificationStatus(providerStatus);
    const checkedAt = new Date().toISOString();
    const referenceHash = createHash("sha256").update(emailResult.data).digest("hex").slice(0, 20);

    return {
      provider: this.name,
      status,
      confidence: (parsed.data.data.score ?? defaultConfidence(providerStatus) * 100) / 100,
      reason: verificationReason(providerStatus),
      externalReference: `hunter-email:${input.contactId}:${referenceHash}`,
      checkedAt,
      estimatedCost: this.estimatedCost,
      mock: false,
    };
  }
}
