import { AuthorizationError } from "@/lib/errors/authorization-error";
import { can, type Permission } from "@/lib/permissions/roles";
import type { AppRole } from "@/types/auth";

export function assertOrganizationPermission(role: AppRole, permission: Permission): void {
  if (!can(role, permission)) {
    throw new AuthorizationError();
  }
}
