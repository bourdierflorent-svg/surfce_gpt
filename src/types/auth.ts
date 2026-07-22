export const APP_ROLES = [
  "admin",
  "direction",
  "sales_manager",
  "sales",
  "venue_manager",
  "marketing",
  "viewer",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string | null;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  timezone: string;
}

export interface MembershipSummary {
  id: string;
  organizationId: string;
  role: AppRole;
}

export interface AppAuthContext {
  user: AuthenticatedUser;
  organization: OrganizationSummary;
  membership: MembershipSummary;
  isPreview: boolean;
}
