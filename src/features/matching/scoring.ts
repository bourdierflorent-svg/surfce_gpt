import type { PersonaOutput } from "@/features/personas/schemas";
import type { CompanyRow, VenueMatchRow } from "@/types/database";
import type { Venue, VenueOffer } from "@/features/venues/types";

export type MatchScoreBreakdown = {
  event_fit: number;
  capacity_budget_fit: number;
  distance_fit: number;
  brand_fit: number;
  availability_fit: number;
  history_fit: number;
};

export interface ScoredVenueOffer {
  venue: Venue;
  offer: VenueOffer;
  score: number;
  scoreBreakdown: MatchScoreBreakdown;
  reasons: string[];
  risks: string[];
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr");
}

function eventScore(persona: PersonaOutput, offer: VenueOffer): number {
  const offerType = normalize(offer.event_type);
  const matches = persona.recommended_event_types.some((type) => {
    const candidate = normalize(type);
    return candidate.includes(offerType) || offerType.includes(candidate);
  });
  return matches ? 30 : 12;
}

function capacityBudgetScore(persona: PersonaOutput, offer: VenueOffer): number | null {
  const guests = persona.estimated_guest_range;
  if (guests.min !== null && offer.max_guests !== null && guests.min > offer.max_guests)
    return null;
  if (guests.max !== null && offer.min_guests !== null && guests.max < offer.min_guests)
    return null;

  const capacity = guests.min === null || guests.max === null ? 8 : 12;
  const budget = persona.estimated_budget_range;
  if (budget.max === null || offer.minimum_budget === null) return capacity + 4;
  return capacity + (offer.minimum_budget <= budget.max ? 8 : 0);
}

function brandScore(company: CompanyRow, venue: Venue): number {
  if (!company.sector) return 7;
  return venue.target_sectors.some(
    (sector) => normalize(sector) === normalize(company.sector as string),
  )
    ? 15
    : 8;
}

function historyScore(company: CompanyRow): number {
  if (company.status === "customer") return 10;
  if (["engaged", "opportunity"].includes(company.status)) return 8;
  return 5;
}

export function scoreVenueOffer(
  company: CompanyRow,
  persona: PersonaOutput,
  venue: Venue,
  offer: VenueOffer,
): ScoredVenueOffer | null {
  if (!venue.is_active || !offer.is_active || company.do_not_contact) return null;
  const capacityBudget = capacityBudgetScore(persona, offer);
  if (capacityBudget === null) return null;

  const scoreBreakdown: MatchScoreBreakdown = {
    event_fit: eventScore(persona, offer),
    capacity_budget_fit: capacityBudget,
    distance_fit: company.city === venue.city ? 10 : 5,
    brand_fit: brandScore(company, venue),
    availability_fit: 7,
    history_fit: historyScore(company),
  };
  const score = Object.values(scoreBreakdown).reduce((total, value) => total + value, 0);
  const reasons = [
    scoreBreakdown.event_fit === 30
      ? `L’offre correspond à un type d’événement recommandé : ${offer.event_type}.`
      : `Le format ${offer.event_type} reste une alternative à tester.`,
    company.city === venue.city
      ? `Entreprise et établissement sont dans la même ville (${company.city}).`
      : "La distance exacte doit être confirmée.",
    scoreBreakdown.brand_fit === 15
      ? `Le secteur ${company.sector} fait partie des cibles du lieu.`
      : "La compatibilité d’image reste à valider.",
  ];
  const risks = [
    ...(persona.estimated_budget_range.max === null ? ["Budget non confirmé"] : []),
    ...(persona.estimated_guest_range.max === null ? ["Jauge non confirmée"] : []),
    "Disponibilité à confirmer",
  ];

  return { venue, offer, score, scoreBreakdown, reasons, risks };
}

export function isScoreBreakdown(value: VenueMatchRow["score_breakdown"]): boolean {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
