import type {
  WebsiteEnrichmentInput,
  WebsiteEnrichmentProvider,
  WebsiteEnrichmentResult,
  WebsiteSignal,
} from "./types";

function buildSignals(input: WebsiteEnrichmentInput, reference: string): WebsiteSignal[] {
  const sector = input.sector?.toLocaleLowerCase("fr") ?? "";
  if (sector.includes("communication")) {
    return [
      {
        type: "service",
        label: "Conseil en communication",
        confidence: 0.78,
        sourceReference: reference,
      },
      {
        type: "event",
        label: "Activation de marque probable",
        confidence: 0.62,
        sourceReference: reference,
      },
      {
        type: "audience",
        label: "Équipes et clients B2B",
        confidence: 0.66,
        sourceReference: reference,
      },
    ];
  }
  if (sector.includes("conseil")) {
    return [
      {
        type: "service",
        label: "Prestations de conseil",
        confidence: 0.81,
        sourceReference: reference,
      },
      {
        type: "culture",
        label: "Moments d’équipe probables",
        confidence: 0.58,
        sourceReference: reference,
      },
      {
        type: "audience",
        label: "Décideurs professionnels",
        confidence: 0.64,
        sourceReference: reference,
      },
    ];
  }
  return [
    {
      type: "service",
      label: "Activité professionnelle à qualifier",
      confidence: 0.48,
      sourceReference: reference,
    },
  ];
}

export class MockWebsiteEnrichmentProvider implements WebsiteEnrichmentProvider {
  readonly name = "mock_website";
  readonly estimatedCost = 0;

  async analyze(input: WebsiteEnrichmentInput): Promise<WebsiteEnrichmentResult> {
    const reference = `mock-website:${input.companyId}`;
    const collectedAt = new Date().toISOString();
    const displayName = input.tradeName ?? input.legalName;
    const url = input.websiteUrl ?? (input.domain ? `https://${input.domain}` : null);
    const summary = input.description
      ? `${input.description} Analyse simulée : aucun contenu distant n’a été téléchargé.`
      : `${displayName} dispose de signaux simulés pour tester le parcours d’enrichissement, sans consultation d’un site externe.`;

    return {
      provider: this.name,
      summary: {
        value: summary,
        provider: this.name,
        externalReference: reference,
        sourceUrl: url ?? undefined,
        collectedAt,
        lastVerifiedAt: collectedAt,
        confidence: url ? 0.7 : 0.45,
        isInferred: true,
      },
      signals: buildSignals(input, reference),
      pagesInspected: url
        ? [
            { kind: "home", url, status: "mocked" },
            { kind: "about", url: `${url.replace(/\/$/, "")}/a-propos`, status: "mocked" },
          ]
        : [],
      warnings: [
        "Analyse simulée : robots.txt, pages distantes et données personnelles n’ont pas été consultés.",
      ],
    };
  }
}
