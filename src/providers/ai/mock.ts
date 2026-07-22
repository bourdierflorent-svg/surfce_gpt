import { personaOutputSchema, type PersonaOutput } from "@/features/personas/schemas";

import type {
  AiProvider,
  PersonaGenerationInput,
  VenueRationale,
  VenueRationaleInput,
} from "./types";

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
}
