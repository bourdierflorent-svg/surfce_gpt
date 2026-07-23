import { APP_ROLES, type AppRole } from "@/types/auth";

export type Permission =
  | "organization:read"
  | "organization:update"
  | "members:read"
  | "members:write"
  | "companies:read"
  | "companies:write"
  | "contacts:read"
  | "contacts:write"
  | "campaigns:read"
  | "campaigns:write"
  | "mailboxes:write"
  | "inbox:read"
  | "inbox:write"
  | "opportunities:read"
  | "opportunities:write"
  | "tasks:write"
  | "messages:send"
  | "analytics:read"
  | "analytics:export"
  | "compliance:read"
  | "compliance:write"
  | "audit:read"
  | "privacy:write"
  | "retention:simulate"
  | "intelligence:run"
  | "venues:read"
  | "venues:write"
  | "venue-assets:write";

export type NavigationKey =
  | "dashboard"
  | "explore"
  | "companies"
  | "contacts"
  | "campaigns"
  | "inbox"
  | "opportunities"
  | "venues"
  | "analytics"
  | "settings";

const allRoles = [...APP_ROLES];

const permissionsByRole: Record<AppRole, readonly Permission[]> = {
  admin: [
    "organization:read",
    "organization:update",
    "members:read",
    "members:write",
    "companies:read",
    "companies:write",
    "contacts:read",
    "contacts:write",
    "campaigns:read",
    "campaigns:write",
    "mailboxes:write",
    "inbox:read",
    "inbox:write",
    "opportunities:read",
    "opportunities:write",
    "tasks:write",
    "messages:send",
    "analytics:read",
    "analytics:export",
    "compliance:read",
    "compliance:write",
    "audit:read",
    "privacy:write",
    "retention:simulate",
    "intelligence:run",
    "venues:read",
    "venues:write",
    "venue-assets:write",
  ],
  direction: [
    "organization:read",
    "members:read",
    "companies:read",
    "contacts:read",
    "campaigns:read",
    "inbox:read",
    "opportunities:read",
    "analytics:read",
    "analytics:export",
    "compliance:read",
    "audit:read",
    "venues:read",
  ],
  sales_manager: [
    "organization:read",
    "members:read",
    "companies:read",
    "companies:write",
    "contacts:read",
    "contacts:write",
    "campaigns:read",
    "campaigns:write",
    "mailboxes:write",
    "inbox:read",
    "inbox:write",
    "opportunities:read",
    "opportunities:write",
    "tasks:write",
    "messages:send",
    "analytics:read",
    "analytics:export",
    "compliance:read",
    "audit:read",
    "intelligence:run",
    "venues:read",
  ],
  sales: [
    "organization:read",
    "members:read",
    "companies:read",
    "companies:write",
    "contacts:read",
    "contacts:write",
    "campaigns:read",
    "campaigns:write",
    "mailboxes:write",
    "inbox:read",
    "inbox:write",
    "opportunities:read",
    "opportunities:write",
    "tasks:write",
    "messages:send",
    "analytics:read",
    "intelligence:run",
    "venues:read",
  ],
  venue_manager: [
    "organization:read",
    "members:read",
    "companies:read",
    "contacts:read",
    "campaigns:read",
    "inbox:read",
    "opportunities:read",
    "analytics:read",
    "venues:read",
    "venues:write",
    "venue-assets:write",
  ],
  marketing: [
    "organization:read",
    "members:read",
    "companies:read",
    "contacts:read",
    "campaigns:read",
    "campaigns:write",
    "mailboxes:write",
    "inbox:read",
    "opportunities:read",
    "messages:send",
    "analytics:read",
    "venues:read",
    "venues:write",
    "venue-assets:write",
  ],
  viewer: [
    "organization:read",
    "members:read",
    "companies:read",
    "contacts:read",
    "campaigns:read",
    "inbox:read",
    "opportunities:read",
    "analytics:read",
    "venues:read",
  ],
};

export interface NavigationPolicy {
  key: NavigationKey;
  href: string;
  availableFromPhase: number;
  allowedRoles: readonly AppRole[];
}

export const navigationPolicies: readonly NavigationPolicy[] = [
  { key: "dashboard", href: "/dashboard", availableFromPhase: 1, allowedRoles: allRoles },
  { key: "explore", href: "/explore", availableFromPhase: 3, allowedRoles: allRoles },
  { key: "companies", href: "/companies", availableFromPhase: 3, allowedRoles: allRoles },
  { key: "contacts", href: "/contacts", availableFromPhase: 5, allowedRoles: allRoles },
  { key: "campaigns", href: "/campaigns", availableFromPhase: 5, allowedRoles: allRoles },
  { key: "inbox", href: "/inbox", availableFromPhase: 6, allowedRoles: allRoles },
  {
    key: "opportunities",
    href: "/opportunities",
    availableFromPhase: 7,
    allowedRoles: allRoles,
  },
  { key: "venues", href: "/venues", availableFromPhase: 2, allowedRoles: allRoles },
  { key: "analytics", href: "/analytics", availableFromPhase: 8, allowedRoles: allRoles },
  {
    key: "settings",
    href: "/settings/organization",
    availableFromPhase: 1,
    allowedRoles: ["admin", "direction", "sales_manager", "sales", "marketing"],
  },
];

export function isAppRole(value: string): value is AppRole {
  return APP_ROLES.some((role) => role === value);
}

export function can(role: AppRole, permission: Permission): boolean {
  return permissionsByRole[role].includes(permission);
}

export function getVisibleNavigation(role: AppRole): readonly NavigationPolicy[] {
  return navigationPolicies.filter((item) => item.allowedRoles.includes(role));
}
