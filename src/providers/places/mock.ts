import { distanceInMeters, isPointInPolygon } from "@/lib/geo/geometry";

import type {
  PlaceCandidate,
  PlaceSearchInput,
  PlaceSearchProvider,
  PlaceSearchResult,
} from "./types";

const collectedAt = "2026-07-22T10:00:00.000Z";

export const MOCK_PLACES: readonly PlaceCandidate[] = [
  {
    externalId: "mock-place-studio-huit",
    provider: "mock_places",
    legalName: "Studio Huit Communication SAS fictive",
    tradeName: "Studio Huit Communication",
    normalizedName: "studio huit communication",
    sector: "Communication",
    subsector: "Agence de communication",
    description: "Studio de démonstration fictif spécialisé dans les identités et lancements.",
    websiteUrl: "https://studio-huit.example",
    domain: "studio-huit.example",
    phone: "+33 1 80 00 08 08",
    genericEmail: "bonjour@studio-huit.example",
    employeeRange: "11–50",
    addressLine1: "8 rue de la Démonstration",
    postalCode: "75008",
    city: "Paris",
    countryCode: "FR",
    district: "8e arrondissement",
    location: { latitude: 48.8721, longitude: 2.3135 },
    potentialScore: 72,
    dataQualityScore: 78,
    tags: ["communication", "lancement"],
    collectedAt,
    confidence: 0.78,
  },
  {
    externalId: "mock-place-rive-conseil",
    provider: "mock_places",
    legalName: "Cabinet Rive Conseil SAS fictif",
    tradeName: "Cabinet Rive Conseil",
    normalizedName: "cabinet rive conseil",
    sector: "Conseil",
    subsector: "Cabinet de conseil",
    description: "Cabinet fictif de stratégie et de transformation pour démonstration.",
    websiteUrl: "https://rive-conseil.example",
    domain: "rive-conseil.example",
    phone: "+33 1 80 00 06 06",
    genericEmail: "contact@rive-conseil.example",
    employeeRange: "11–50",
    addressLine1: "6 quai de la Démonstration",
    postalCode: "75006",
    city: "Paris",
    countryCode: "FR",
    district: "6e arrondissement",
    location: { latitude: 48.8546, longitude: 2.3342 },
    potentialScore: 68,
    dataQualityScore: 76,
    tags: ["conseil", "direction"],
    collectedAt,
    confidence: 0.76,
  },
  {
    externalId: "mock-place-maison-horizon",
    provider: "mock_places",
    legalName: "Maison Horizon Luxe SAS fictive",
    tradeName: "Maison Horizon Luxe",
    normalizedName: "maison horizon luxe",
    sector: "Luxe",
    subsector: "Maison de luxe",
    description: "Maison fictive imaginée pour les scénarios de réception premium.",
    websiteUrl: "https://maison-horizon.example",
    domain: "maison-horizon.example",
    phone: "+33 1 80 00 01 16",
    genericEmail: "maison@maison-horizon.example",
    employeeRange: "51–200",
    addressLine1: "16 avenue de l’Horizon",
    postalCode: "75001",
    city: "Paris",
    countryCode: "FR",
    district: "1er arrondissement",
    location: { latitude: 48.8641, longitude: 2.3316 },
    potentialScore: 91,
    dataQualityScore: 84,
    tags: ["luxe", "premium"],
    collectedAt,
    confidence: 0.84,
  },
  {
    externalId: "mock-place-atelier-signal",
    provider: "mock_places",
    legalName: "Atelier Signal SAS fictif",
    tradeName: "Atelier Signal",
    normalizedName: "atelier signal",
    sector: "Communication",
    subsector: "Design et production",
    description: "Atelier créatif fictif pour tester une prospection ciblée.",
    websiteUrl: "https://atelier-signal.example",
    domain: "atelier-signal.example",
    phone: null,
    genericEmail: "contact@atelier-signal.example",
    employeeRange: "1–10",
    addressLine1: "11 passage Signal",
    postalCode: "75011",
    city: "Paris",
    countryCode: "FR",
    district: "11e arrondissement",
    location: { latitude: 48.8578, longitude: 2.3774 },
    potentialScore: 64,
    dataQualityScore: 69,
    tags: ["design", "créatif"],
    collectedAt,
    confidence: 0.69,
  },
  {
    externalId: "mock-place-concorde-evenement",
    provider: "mock_places",
    legalName: "Bureau Événementiel Concorde SAS fictif",
    tradeName: "Bureau Événementiel Concorde",
    normalizedName: "bureau evenementiel concorde",
    sector: "Événementiel",
    subsector: "Agence événementielle",
    description: "Bureau fictif organisant séminaires et activations de marque.",
    websiteUrl: "https://concorde-evenement.example",
    domain: "concorde-evenement.example",
    phone: "+33 1 80 00 09 09",
    genericEmail: "projets@concorde-evenement.example",
    employeeRange: "11–50",
    addressLine1: "9 boulevard Concorde",
    postalCode: "75009",
    city: "Paris",
    countryCode: "FR",
    district: "9e arrondissement",
    location: { latitude: 48.8757, longitude: 2.3374 },
    potentialScore: 86,
    dataQualityScore: 88,
    tags: ["événementiel", "agence"],
    collectedAt,
    confidence: 0.88,
  },
  {
    externalId: "mock-place-nova-legal",
    provider: "mock_places",
    legalName: "Nova Legal Associés SELAS fictive",
    tradeName: "Nova Legal Associés",
    normalizedName: "nova legal associes",
    sector: "Juridique",
    subsector: "Cabinet d’avocats",
    description: "Cabinet d’avocats entièrement fictif destiné aux démonstrations.",
    websiteUrl: "https://nova-legal.example",
    domain: "nova-legal.example",
    phone: "+33 1 80 00 07 07",
    genericEmail: "accueil@nova-legal.example",
    employeeRange: "51–200",
    addressLine1: "7 place Nova",
    postalCode: "75007",
    city: "Paris",
    countryCode: "FR",
    district: "7e arrondissement",
    location: { latitude: 48.859, longitude: 2.3171 },
    potentialScore: 79,
    dataQualityScore: 82,
    tags: ["juridique", "associés"],
    collectedAt,
    confidence: 0.82,
  },
  {
    externalId: "mock-place-banque-meridienne",
    provider: "mock_places",
    legalName: "Banque Méridienne SA fictive",
    tradeName: "Banque Méridienne",
    normalizedName: "banque meridienne",
    sector: "Finance",
    subsector: "Banque",
    description: "Institution financière fictive pour un scénario grands comptes.",
    websiteUrl: "https://banque-meridienne.example",
    domain: "banque-meridienne.example",
    phone: "+33 1 80 00 02 02",
    genericEmail: null,
    employeeRange: "201–500",
    addressLine1: "2 rue Méridienne",
    postalCode: "75002",
    city: "Paris",
    countryCode: "FR",
    district: "2e arrondissement",
    location: { latitude: 48.8686, longitude: 2.3412 },
    potentialScore: 88,
    dataQualityScore: 74,
    tags: ["finance", "grands comptes"],
    collectedAt,
    confidence: 0.74,
  },
  {
    externalId: "mock-place-fabrique-seize",
    provider: "mock_places",
    legalName: "Fabrique Seize SAS fictive",
    tradeName: "Fabrique Seize",
    normalizedName: "fabrique seize",
    sector: "Technologie",
    subsector: "Startup",
    description: "Startup fictive développant des outils collaboratifs.",
    websiteUrl: "https://fabrique-seize.example",
    domain: "fabrique-seize.example",
    phone: null,
    genericEmail: "hello@fabrique-seize.example",
    employeeRange: "11–50",
    addressLine1: "16 rue de la Fabrique",
    postalCode: "75016",
    city: "Paris",
    countryCode: "FR",
    district: "16e arrondissement",
    location: { latitude: 48.866, longitude: 2.2757 },
    potentialScore: 61,
    dataQualityScore: 66,
    tags: ["startup", "tech"],
    collectedAt,
    confidence: 0.66,
  },
  {
    externalId: "mock-place-clef-immobilier",
    provider: "mock_places",
    legalName: "La Clef Urbaine Immobilier SAS fictive",
    tradeName: "La Clef Urbaine",
    normalizedName: "la clef urbaine",
    sector: "Immobilier",
    subsector: "Agence immobilière",
    description: "Agence immobilière fictive utilisée dans le jeu de démonstration.",
    websiteUrl: null,
    domain: null,
    phone: "+33 1 80 00 17 17",
    genericEmail: null,
    employeeRange: "1–10",
    addressLine1: "17 avenue Urbaine",
    postalCode: "75017",
    city: "Paris",
    countryCode: "FR",
    district: "17e arrondissement",
    location: { latitude: 48.8852, longitude: 2.3064 },
    potentialScore: 56,
    dataQualityScore: 58,
    tags: ["immobilier", "local"],
    collectedAt,
    confidence: 0.58,
  },
  {
    externalId: "mock-place-verriere-capital",
    provider: "mock_places",
    legalName: "Verrière Capital SAS fictive",
    tradeName: "Verrière Capital",
    normalizedName: "verriere capital",
    sector: "Finance",
    subsector: "Siège social",
    description: "Holding fictive servant de cible de démonstration SURFCE.",
    websiteUrl: "https://verriere-capital.example",
    domain: "verriere-capital.example",
    phone: "+33 1 80 00 08 18",
    genericEmail: "bureau@verriere-capital.example",
    employeeRange: "51–200",
    addressLine1: "18 cour de la Verrière",
    postalCode: "75008",
    city: "Paris",
    countryCode: "FR",
    district: "8e arrondissement",
    location: { latitude: 48.8779, longitude: 2.3046 },
    potentialScore: 83,
    dataQualityScore: 81,
    tags: ["holding", "finance"],
    collectedAt,
    confidence: 0.81,
  },
] as const;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .trim();
}

export class MockPlacesProvider implements PlaceSearchProvider {
  async search(input: PlaceSearchInput): Promise<PlaceSearchResult> {
    const query = normalize(`${input.query ?? ""} ${input.category ?? ""}`);
    const terms = query.split(/\s+/).filter((term) => term.length > 1);

    const results = MOCK_PLACES.map((place) => ({
      ...place,
      distanceMeters: input.center ? distanceInMeters(input.center, place.location) : undefined,
    }))
      .filter((place) => {
        const searchable = normalize(
          `${place.tradeName} ${place.legalName} ${place.sector} ${place.subsector} ${place.tags.join(" ")}`,
        );
        const matchesText = terms.length === 0 || terms.every((term) => searchable.includes(term));
        const matchesDistrict = !input.district || place.district.startsWith(input.district);
        const matchesWebsite = !input.filters?.hasWebsite || Boolean(place.websiteUrl);
        const matchesPhone = !input.filters?.hasPhone || Boolean(place.phone);
        const matchesEmployeeRange =
          !input.filters?.employeeRange || place.employeeRange === input.filters.employeeRange;
        const matchesArea =
          input.mode === "polygon"
            ? Boolean(input.polygon && isPointInPolygon(place.location, input.polygon))
            : Boolean(
                input.center &&
                input.radiusMeters &&
                distanceInMeters(input.center, place.location) <= input.radiusMeters,
              );

        return (
          matchesText &&
          matchesDistrict &&
          matchesWebsite &&
          matchesPhone &&
          matchesEmployeeRange &&
          matchesArea
        );
      })
      .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));

    return {
      provider: "mock_places",
      results,
      total: results.length,
      estimatedExternalCost: 0,
      isFictional: true,
    };
  }

  async getDetails(externalId: string): Promise<PlaceCandidate | null> {
    return MOCK_PLACES.find((place) => place.externalId === externalId) ?? null;
  }
}
