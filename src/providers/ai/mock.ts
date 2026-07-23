import { personaOutputSchema, type PersonaOutput } from "@/features/personas/schemas";
import { emailGenerationOutputSchema } from "@/features/messages/schemas";

import type {
  AiProvider,
  EmailGenerationInput,
  PersonaGenerationInput,
  VenueRationale,
  VenueRationaleInput,
} from "./types";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function emailBody(
  input: EmailGenerationInput,
  style: "direct" | "premium" | "relational",
): string {
  const greeting = input.contactFirstName ? `Bonjour ${input.contactFirstName},` : "Bonjour,";
  const offer = input.offerName ?? "un format événementiel adapté à vos équipes";
  const venue = input.venueName ? ` chez ${input.venueName}` : "";
  const verifiedContext = input.verifiedFacts[0]?.fact;
  const context = verifiedContext ? `${verifiedContext} ` : "";
  const opening =
    style === "direct"
      ? `${context}Je vous contacte avec une proposition simple : ${offer}${venue}.`
      : style === "premium"
        ? `${context}Nous avons imaginé une piste événementielle sobre et soignée autour de ${offer}${venue}.`
        : `${context}Je souhaitais vous soumettre une idée qui pourrait être utile à votre équipe : ${offer}${venue}.`;
  const followUp =
    input.stepPosition > 0
      ? "Je me permets une relance courte au cas où ce sujet soit d’actualité."
      : "";

  return [
    greeting,
    "",
    followUp,
    opening,
    "",
    "Souhaitez-vous que je vous envoie les grandes lignes, ou préférez-vous un échange de 10 minutes ?",
    "",
    `Bien à vous,`,
    input.senderName,
    "",
    "Si ce sujet n’est pas pertinent, dites-le-moi et je ne vous recontacterai pas.",
  ]
    .filter((line, index, lines) => line || lines[index - 1] !== "")
    .join("\n")
    .trim();
}

interface PersonaProfile {
  needs: PersonaOutput["probable_needs"];
  eventTypes: string[];
  roles: string[];
  maturity: "low" | "medium" | "high" | "unknown";
  fitScore: number;
}

function profileForSector(sector: string | null): PersonaProfile {
  const value = sector?.toLocaleLowerCase("fr") ?? "";
  if (value.includes("communication")) {
    return {
      needs: [
        {
          type: "afterwork",
          confidence: 0.82,
          reason: "Une activité orientée équipes et clients rend ce format plausible.",
        },
        {
          type: "soirée clients",
          confidence: 0.74,
          reason: "Le secteur suggère des besoins de relation et d’activation de marque.",
        },
        {
          type: "lancement de produit",
          confidence: 0.61,
          reason: "Le format est cohérent avec une activité de communication, sans être confirmé.",
        },
      ],
      eventTypes: ["Afterwork", "Soirée clients", "Lancement de produit"],
      roles: ["Office Manager", "Responsable Communication", "Responsable Événementiel"],
      maturity: "high",
      fitScore: 84,
    };
  }
  if (value.includes("conseil")) {
    return {
      needs: [
        {
          type: "afterwork",
          confidence: 0.73,
          reason: "La cohésion d’équipe et la relation clients sont des usages plausibles.",
        },
        {
          type: "dîner entreprise",
          confidence: 0.68,
          reason: "Un format assis peut convenir à des échanges avec des décideurs.",
        },
      ],
      eventTypes: ["Afterwork", "Dîner entreprise", "Soirée clients"],
      roles: ["Office Manager", "Responsable RH", "Assistante de direction"],
      maturity: "medium",
      fitScore: 76,
    };
  }
  return {
    needs: [
      {
        type: "événement d’équipe",
        confidence: 0.42,
        reason: "Hypothèse minimale à confirmer faute de signal sectoriel suffisant.",
      },
    ],
    eventTypes: ["Afterwork"],
    roles: ["Office Manager", "Responsable RH"],
    maturity: "unknown",
    fitScore: 52,
  };
}

function estimatedGuests(employeeRange: string | null) {
  if (!employeeRange) return { min: null, max: null, confidence: 0 };
  const numbers = employeeRange.match(/\d+/g)?.map(Number) ?? [];
  if (numbers.length < 2) return { min: null, max: null, confidence: 0.2 };
  return {
    min: Math.max(10, Math.round(numbers[0]! * 0.7)),
    max: Math.max(20, Math.round(numbers[1]! * 1.2)),
    confidence: 0.54,
  };
}

export class MockAiProvider implements AiProvider {
  readonly name = "mock_ai";
  readonly model = "surfce-deterministic-mock-v1";

  async generatePersona(input: PersonaGenerationInput): Promise<PersonaOutput> {
    const profile = profileForSector(input.company.sector);
    const source = input.sources[0];
    const name = input.company.trade_name ?? input.company.legal_name;
    const hasEvidence = Boolean(source);

    return personaOutputSchema.parse({
      company_type: input.company.subsector ?? input.company.sector,
      summary: `Hypothèse commerciale : ${name} peut être pertinent pour des formats événementiels liés à ${input.company.sector ?? "son activité"}. Les besoins restent à valider humainement.`,
      estimated_size: {
        label: input.company.employee_range,
        confidence: input.company.employee_range ? 0.72 : 0,
      },
      event_maturity: {
        level: profile.maturity,
        confidence: hasEvidence ? 0.66 : 0.4,
      },
      probable_needs: profile.needs,
      likely_contact_roles: profile.roles,
      recommended_event_types: profile.eventTypes,
      estimated_guest_range: estimatedGuests(input.company.employee_range),
      estimated_budget_range: { min: null, max: null, currency: "EUR", confidence: 0 },
      fit_score: profile.fitScore,
      confidence: hasEvidence ? 0.68 : 0.46,
      risks: [
        "Budget inconnu",
        ...(input.company.employee_range ? [] : ["Effectif inconnu"]),
        ...(hasEvidence ? [] : ["Sources insuffisantes"]),
      ],
      evidence: source
        ? [
            {
              claim: `Le secteur déclaré soutient l’hypothèse de formats ${profile.eventTypes.slice(0, 2).join(" et ")}.`,
              source_type: source.provider,
              source_reference: source.id,
              confidence: Math.min(Number(source.confidence), 0.76),
            },
          ]
        : [],
    });
  }

  async generateVenueRationale(input: VenueRationaleInput): Promise<VenueRationale> {
    return {
      reasons: input.reasons,
      risks: input.risks,
      recommendedPitch: `${input.offerName} chez ${input.venueName} : un angle à tester avec ${input.companyName}, fondé sur un score explicable de ${input.score}/100.`,
    };
  }

  async generateEmailVariants(input: EmailGenerationInput) {
    const facts = input.verifiedFacts.map((fact) => ({
      fact: fact.fact,
      source_reference: fact.sourceReference,
    }));
    const missing = [
      ...(input.offerName ? [] : ["offre sélectionnée"]),
      ...(input.venueName ? [] : ["établissement sélectionné"]),
      ...(facts.length ? [] : ["fait de personnalisation vérifié"]),
    ];
    const subjects = input.offerName
      ? [
          `${input.offerName} pour votre équipe`,
          `Une piste événementielle : ${input.offerName}`,
          `Une idée à étudier pour ${input.companyName}`,
        ]
      : [
          "Une idée d’événement pour votre équipe",
          "Une piste événementielle à étudier",
          `Une idée pour ${input.companyName}`,
        ];

    const variants = (
      [
        ["Directe", "direct"],
        ["Premium", "premium"],
        ["Relationnelle", "relational"],
      ] as const
    ).map(([label, style], index) => {
      const bodyText = emailBody(input, style);
      return {
        label,
        subject: subjects[index]!,
        body_text: bodyText,
        body_html: bodyText
          .split("\n\n")
          .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`)
          .join(""),
        personalization_facts: facts,
        risk_flags: missing.length ? ["Personnalisation limitée aux faits disponibles."] : [],
      };
    });

    return emailGenerationOutputSchema.parse({
      variants,
      recommended_variant: input.tone.includes("premium")
        ? 1
        : input.tone.includes("relation")
          ? 2
          : 0,
      reason: "Variante courte, explicite et limitée aux faits de personnalisation vérifiés.",
      missing_information: missing,
    });
  }
}
