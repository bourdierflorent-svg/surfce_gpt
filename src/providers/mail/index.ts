import { GmailMailProvider } from "./google";
import { MicrosoftMailProvider } from "./microsoft";
import { MockMailProvider } from "./mock";
import type { MailProvider, MailProviderName } from "./types";

export function getMailProvider(
  requestedProvider?: MailProviderName,
  accessToken?: string,
  mailboxEmail?: string,
): MailProvider {
  const provider =
    requestedProvider ??
    (process.env.MAIL_PROVIDER?.trim().toLowerCase() as MailProviderName) ??
    "mock";
  if (provider === "mock") return new MockMailProvider();
  if (!accessToken) throw new Error("Le token d’accès du provider mail est indisponible.");
  if (provider === "google") return new GmailMailProvider(accessToken, mailboxEmail);
  if (provider === "microsoft") return new MicrosoftMailProvider(accessToken, mailboxEmail);
  throw new Error(`Le provider mail ${provider} n’est pas supporté.`);
}

export type * from "./types";
