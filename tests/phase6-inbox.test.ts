import { describe, expect, it } from "vitest";

import { classifyInboundText } from "@/features/inbox/classification";
import {
  createOAuthState,
  createPkcePair,
  verifyOAuthState,
} from "@/features/mailboxes/oauth-state";
import { decryptSecret, encryptSecret, hasEncryptionKey } from "@/lib/crypto/oauth-tokens";
import { sanitizeEmailHtml } from "@/lib/mail/sanitize-html";
import { MockAiProvider } from "@/providers/ai/mock";
import { MockMailProvider } from "@/providers/mail/mock";
import type { AppAuthContext } from "@/types/auth";

const encryptionEnvironment = {
  APP_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  NODE_ENV: "test",
} as NodeJS.ProcessEnv;

const oauthContext = {
  organization: {
    id: "10000000-0000-4000-8000-000000000001",
  },
  user: {
    id: "00000000-0000-4000-8000-000000000001",
  },
} as AppAuthContext;

describe("Phase 6 OAuth security", () => {
  it("encrypts secrets with authenticated encryption and rejects tampering", () => {
    const encrypted = encryptSecret("refresh-token-secret", encryptionEnvironment);
    expect(encrypted).not.toContain("refresh-token-secret");
    expect(decryptSecret(encrypted, encryptionEnvironment)).toBe("refresh-token-secret");
    const parsed = JSON.parse(encrypted) as { value: string };
    parsed.value = `${parsed.value.startsWith("A") ? "B" : "A"}${parsed.value.slice(1)}`;
    expect(() => decryptSecret(JSON.stringify(parsed), encryptionEnvironment)).toThrow();
    expect(hasEncryptionKey(encryptionEnvironment)).toBe(true);
    expect(hasEncryptionKey({ NODE_ENV: "test" } as NodeJS.ProcessEnv)).toBe(false);
  });

  it("binds signed state to provider, organization and user while using PKCE", () => {
    const pkce = createPkcePair();
    expect(pkce.verifier.length).toBeGreaterThanOrEqual(43);
    expect(pkce.challenge).not.toBe(pkce.verifier);
    const state = createOAuthState(oauthContext, "google", encryptionEnvironment);
    expect(verifyOAuthState(state, oauthContext, "google", encryptionEnvironment).provider).toBe(
      "google",
    );
    expect(() =>
      verifyOAuthState(`${state.slice(0, -1)}x`, oauthContext, "google", encryptionEnvironment),
    ).toThrow();
    expect(() =>
      verifyOAuthState(state, oauthContext, "microsoft", encryptionEnvironment),
    ).toThrow();
  });
});

describe("Phase 6 inbox intelligence", () => {
  it.each([
    ["Pouvez-vous me transmettre vos tarifs ?", "asks_price"],
    ["Oui, l’idée nous intéresse pour septembre.", "interested"],
    ["Merci de ne plus me recontacter.", "unsubscribe"],
    ["Réponse automatique : absence du bureau.", "out_of_office"],
  ])("classifies %s as %s", (body, expected) => {
    expect(classifyInboundText(body)).toBe(expected);
  });

  it("removes scripts, trackers and unsafe attributes from provider HTML", () => {
    const sanitized = sanitizeEmailHtml(
      '<p onclick="steal()">Bonjour</p><script>alert(1)</script><img src="https://tracker.example/pixel"><a href="javascript:alert(1)">lien</a>',
    );
    expect(sanitized).toContain("Bonjour");
    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("<img");
    expect(sanitized).not.toContain("onclick");
    expect(sanitized).not.toContain("javascript:");
  });

  it("creates a structured summary and a human-reviewable reply suggestion", async () => {
    const provider = new MockAiProvider();
    const input = {
      threadId: "75000000-0000-0000-0000-000000000001",
      subject: "Afterwork en septembre",
      contactName: "Lina Martin",
      companyName: "Studio Huit",
      messages: [
        {
          direction: "inbound" as const,
          bodyText: "Oui, nous sommes intéressés pour un afterwork de 35 personnes en septembre.",
          occurredAt: "2026-07-23T10:00:00.000Z",
        },
      ],
    };
    const summary = await provider.summarizeThread(input);
    const suggestion = await provider.draftThreadReply(input);
    expect(summary.intention).toBe("interested");
    expect(summary.participantCount).toBe(35);
    expect(suggestion.subject).toBe("Re: Afterwork en septembre");
    expect(suggestion.bodyText).toContain("Bonjour Lina");
  });

  it("keeps mock replies in the requested provider thread", async () => {
    const result = await new MockMailProvider().send({
      messageId: "message-reply",
      from: { email: "sender@surfce.example", name: "SURFCE" },
      to: [{ email: "contact@company.example" }],
      subject: "Re: Test",
      bodyText: "Réponse de test.",
      bodyHtml: "<p>Réponse de test.</p>",
      idempotencyKey: "reply-idempotent",
      providerThreadId: "provider-thread-existing",
      replyToProviderMessageId: "provider-message-inbound",
    });
    expect(result.providerThreadId).toBe("provider-thread-existing");
  });
});
