import type {
  CompanyLocationRow,
  CompanyRow,
  CompanyStatus,
  DataSourceRow,
  PersonaRow,
  ProviderJobRow,
  VenueMatchRow,
} from "@/types/database";

export type Company = CompanyRow;
export type CompanyLocation = CompanyLocationRow;
export type DataSource = DataSourceRow;

export interface CompanyListItem extends Company {
  sourceProvider: string | null;
}

export interface CompanyDetail extends Company {
  locations: CompanyLocation[];
  sources: DataSource[];
  assignedUser: { id: string; fullName: string | null; email: string } | null;
  latestPersona: PersonaRow | null;
  matches: CompanyVenueMatch[];
  recentJobs: ProviderJobRow[];
}

export interface CompanyVenueMatch extends VenueMatchRow {
  venueName: string;
  venueType: string;
  offerName: string | null;
  eventType: string | null;
}

export interface AssignableMember {
  id: string;
  fullName: string | null;
  email: string;
}

export const COMPANY_STATUS_LABELS: Record<CompanyStatus, string> = {
  discovered: "Découverte",
  qualified: "Qualifiée",
  contacted: "Contactée",
  engaged: "Engagée",
  opportunity: "Opportunité",
  customer: "Cliente",
  disqualified: "Écartée",
};
