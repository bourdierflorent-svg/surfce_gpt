import { describe, expect, it } from "vitest";

import { scheduleCampaignStep, isInsideSendWindow } from "@/features/campaigns/scheduling";
import { MockAiProvider } from "@/providers/ai/mock";
import { MockContactVerificationProvider } from "@/providers/contacts/mock";
import { MockMailProvider } from "@/providers/mail/mock";

const sendWindow = {
  timezone: "Europe/Paris",
  weekdays: [1, 2, 3, 4, 5],
  start: "09:00",
  end: "17:30",
};

describe("Phase 5 contact verification", () => {
  it("marks a fictional professional address as valid at zero cost", async () => {
    const result = await new MockContactVerificationProvider().verifyEmail({
      contactId: "70000000-0000-0000-0000-000000000001",
      fullName: "Lina Martin",
      email: "lina.martin@studio-huit.example",
      companyDomain: "studio-huit.example",
    });
    expect(result).toMatchObject({
      status: "valid",
      estimatedCost: 0,
      mock: true,
    });
  });

  it("never calls a mismatched domain verified", async () => {
    const result = await new MockContactVerificationProvider().verifyEmail({
      contactId: "70000000-0000-0000-0000-000000000007",
      fullName: "Lou Roux",
      email: "lou.roux@other.example",
      companyDomain: "studio-huit.example",
    });
    expect(result.status).toBe("risky");
  });
});

describe("Phase 5 campaign email generation", () => {
  it("returns exactly three sourced variants with an opposition sentence", async () => {
    const result = await new MockAiProvider().generateEmailVariants({
      contactFirstName: "Lina",
      contactJobTitle: "Responsable Communication",
      companyName: "Studio Huit Communication",
      companySector: "Communication",
      venueName: "Little Room",
      offerName: "Afterwork 20 à 50 personnes",
      senderName: "Florent — Stargazing",
      tone: "directe et commerciale",
      objective: "Proposer un échange.",
      language: "fr",
      stepPosition: 0,
      verifiedFacts: [
        {
          fact: "Studio Huit Communication est située à Paris.",
          sourceReference: "source-company-1",
        },
      ],
    });
    expect(result.variants).toHaveLength(3);
    expect(result.variants.map((variant) => variant.label)).toEqual([
      "Directe",
      "Premium",
      "Relationnelle",
    ]);
    expect(result.variants[0]?.personalization_facts[0]?.source_reference).toBe("source-company-1");
    expect(result.variants[0]?.body_text).toContain("je ne vous recontacterai pas");
  });
});

describe("Phase 5 scheduling", () => {
  it("moves a nocturnal candidate into an allowed Europe/Paris window", () => {
    const scheduled = scheduleCampaignStep({
      base: new Date("2026-07-24T22:00:00.000Z"),
      delayDays: 0,
      delayHours: 0,
      window: sendWindow,
      jitterSeed: "campaign:contact:step",
    });
    expect(isInsideSendWindow(scheduled, sendWindow)).toBe(true);
  });

  it("uses message idempotency to produce a stable mock provider id", async () => {
    const provider = new MockMailProvider();
    const input = {
      messageId: "message-1",
      from: { email: "sender@surfce.example", name: "SURFCE" },
      to: [{ email: "contact@company.example" }],
      subject: "Test",
      bodyText: "Message de démonstration.",
      bodyHtml: "<p>Message de démonstration.</p>",
      idempotencyKey: "campaign:contact:step",
    };
    const first = await provider.send(input);
    const second = await provider.send(input);
    expect(first.providerMessageId).toBe(second.providerMessageId);
    expect(first.mock).toBe(true);
  });
});
