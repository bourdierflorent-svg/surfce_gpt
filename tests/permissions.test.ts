import { describe, expect, it } from "vitest";

import { assertOrganizationPermission } from "@/features/organizations/server/authorization";
import { AuthorizationError } from "@/lib/errors/authorization-error";
import { can, getVisibleNavigation } from "@/lib/permissions/roles";
import { APP_ROLES } from "@/types/auth";

describe("organization permissions", () => {
  it("allows every active role to read its organization and members", () => {
    for (const role of APP_ROLES) {
      expect(can(role, "organization:read")).toBe(true);
      expect(can(role, "members:read")).toBe(true);
    }
  });

  it("limits organization and membership writes to administrators", () => {
    expect(can("admin", "organization:update")).toBe(true);
    expect(can("admin", "members:write")).toBe(true);

    for (const role of APP_ROLES.filter((candidate) => candidate !== "admin")) {
      expect(can(role, "organization:update")).toBe(false);
      expect(can(role, "members:write")).toBe(false);
    }
  });

  it("throws a typed server-side error for a forbidden action", () => {
    expect(() => assertOrganizationPermission("viewer", "organization:update")).toThrow(
      AuthorizationError,
    );
  });

  it("matches the Phase 2 venue permission matrix", () => {
    for (const role of APP_ROLES) {
      expect(can(role, "venues:read")).toBe(true);
    }

    for (const role of ["admin", "venue_manager", "marketing"] as const) {
      expect(can(role, "venues:write")).toBe(true);
      expect(can(role, "venue-assets:write")).toBe(true);
    }

    for (const role of ["direction", "sales_manager", "sales", "viewer"] as const) {
      expect(can(role, "venues:write")).toBe(false);
      expect(can(role, "venue-assets:write")).toBe(false);
    }
  });

  it("matches the Phase 3 company permission matrix", () => {
    for (const role of APP_ROLES) {
      expect(can(role, "companies:read")).toBe(true);
    }

    for (const role of ["admin", "sales_manager", "sales"] as const) {
      expect(can(role, "companies:write")).toBe(true);
    }

    for (const role of ["direction", "venue_manager", "marketing", "viewer"] as const) {
      expect(can(role, "companies:write")).toBe(false);
    }
  });

  it("limits Phase 4 intelligence runs to commercial writers", () => {
    for (const role of ["admin", "sales_manager", "sales"] as const) {
      expect(can(role, "intelligence:run")).toBe(true);
    }
    for (const role of ["direction", "venue_manager", "marketing", "viewer"] as const) {
      expect(can(role, "intelligence:run")).toBe(false);
    }
  });

  it("matches the Phase 8 analytics and compliance matrix", () => {
    for (const role of APP_ROLES) {
      expect(can(role, "analytics:read")).toBe(true);
    }
    for (const role of ["admin", "direction", "sales_manager"] as const) {
      expect(can(role, "analytics:export")).toBe(true);
      expect(can(role, "compliance:read")).toBe(true);
      expect(can(role, "audit:read")).toBe(true);
    }
    for (const role of ["sales", "venue_manager", "marketing", "viewer"] as const) {
      expect(can(role, "analytics:export")).toBe(false);
      expect(can(role, "compliance:read")).toBe(false);
      expect(can(role, "audit:read")).toBe(false);
    }
    expect(can("admin", "compliance:write")).toBe(true);
    expect(can("admin", "privacy:write")).toBe(true);
    expect(can("admin", "retention:simulate")).toBe(true);
    for (const role of APP_ROLES.filter((role) => role !== "admin")) {
      expect(can(role, "compliance:write")).toBe(false);
      expect(can(role, "privacy:write")).toBe(false);
      expect(can(role, "retention:simulate")).toBe(false);
    }
  });
});

describe("role-aware navigation", () => {
  it("shows settings to administrative roles", () => {
    expect(getVisibleNavigation("admin").some((item) => item.key === "settings")).toBe(true);
    expect(getVisibleNavigation("sales_manager").some((item) => item.key === "settings")).toBe(
      true,
    );
  });

  it("hides settings from viewer navigation", () => {
    expect(getVisibleNavigation("viewer").some((item) => item.key === "settings")).toBe(false);
  });

  it("makes the venue registry available from Phase 2", () => {
    const venues = getVisibleNavigation("viewer").find((item) => item.key === "venues");
    expect(venues?.href).toBe("/venues");
    expect(venues?.availableFromPhase).toBe(2);
  });

  it("makes Explorer and companies available from Phase 3", () => {
    const navigation = getVisibleNavigation("viewer");
    expect(navigation.find((item) => item.key === "explore")?.availableFromPhase).toBe(3);
    expect(navigation.find((item) => item.key === "companies")?.availableFromPhase).toBe(3);
  });

  it("makes analytics available to every role from Phase 8", () => {
    for (const role of APP_ROLES) {
      expect(getVisibleNavigation(role).find((item) => item.key === "analytics")).toMatchObject({
        href: "/analytics",
        availableFromPhase: 8,
      });
    }
  });
});
