import { MockMailProvider } from "./mock";
import type { MailProvider } from "./types";

export function getMailProvider(): MailProvider {
  const provider = process.env.MAIL_PROVIDER?.trim().toLowerCase() || "mock";
  if (provider === "mock") return new MockMailProvider();

  throw new Error(
    `Le provider mail ${provider} appartient à la Phase 6. Utilisez MAIL_PROVIDER=mock pour la Phase 5.`,
  );
}

export type * from "./types";
