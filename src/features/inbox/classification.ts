import { z } from "zod";

export const inboundClassificationSchema = z.enum([
  "interested",
  "asks_information",
  "asks_price",
  "asks_callback",
  "asks_later",
  "referral",
  "wrong_person",
  "not_interested",
  "unsubscribe",
  "out_of_office",
  "bounce",
  "neutral",
  "unknown",
]);

export type InboundClassification = z.infer<typeof inboundClassificationSchema>;

const rules: Array<{ classification: InboundClassification; patterns: RegExp[] }> = [
  {
    classification: "unsubscribe",
    patterns: [
      /désabonn/i,
      /ne (?:me|nous) (?:contactez|recontactez) plus/i,
      /ne plus (?:me|nous) (?:contacter|contactez|recontacter|recontactez)/i,
      /retirez-moi/i,
    ],
  },
  {
    classification: "bounce",
    patterns: [/undeliver/i, /delivery status notification/i, /adresse.*introuvable/i],
  },
  {
    classification: "out_of_office",
    patterns: [/out of office/i, /absence du bureau/i, /réponse automatique/i],
  },
  {
    classification: "not_interested",
    patterns: [/pas intéress/i, /ne sommes pas intéress/i, /non merci/i],
  },
  {
    classification: "asks_price",
    patterns: [/tarif/i, /combien/i, /prix/i, /budget/i, /devis/i],
  },
  {
    classification: "asks_callback",
    patterns: [/appelez-moi/i, /rappeler/i, /échanger par téléphone/i],
  },
  {
    classification: "asks_later",
    patterns: [/plus tard/i, /recontactez.*(?:mois|semaine)/i, /pas le bon moment/i],
  },
  {
    classification: "referral",
    patterns: [/contactez plutôt/i, /mettre en relation/i, /voir avec/i],
  },
  {
    classification: "wrong_person",
    patterns: [/pas la bonne personne/i, /ne suis pas.*interlocuteur/i],
  },
  {
    classification: "asks_information",
    patterns: [/plus d'informations/i, /documentation/i, /brochure/i, /pouvez-vous préciser/i],
  },
  {
    classification: "interested",
    patterns: [/intéress/i, /avec plaisir/i, /disponible/i, /bonne idée/i, /organisons/i],
  },
];

export function classifyInboundText(value: string): InboundClassification {
  const normalized = value.normalize("NFKC").trim();
  if (!normalized) return "unknown";
  return (
    rules.find((rule) => rule.patterns.some((pattern) => pattern.test(normalized)))
      ?.classification ?? "neutral"
  );
}

export const classificationLabels: Record<InboundClassification, string> = {
  interested: "Intéressé",
  asks_information: "Demande d’informations",
  asks_price: "Demande de prix",
  asks_callback: "Demande de rappel",
  asks_later: "À recontacter plus tard",
  referral: "Mise en relation",
  wrong_person: "Mauvais interlocuteur",
  not_interested: "Pas intéressé",
  unsubscribe: "Opposition",
  out_of_office: "Absence",
  bounce: "Rebond",
  neutral: "Neutre",
  unknown: "À qualifier",
};
