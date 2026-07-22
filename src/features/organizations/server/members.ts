import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { assertOrganizationPermission } from "@/features/organizations/server/authorization";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/auth";

export interface OrganizationMember {
  id: string;
  userId: string;
  fullName: string | null;
  email: string;
  role: AppRole;
  isActive: boolean;
}

export async function getOrganizationMembers(): Promise<readonly OrganizationMember[]> {
  const context = await requireAppAuthContext();
  assertOrganizationPermission(context.membership.role, "members:read");

  if (context.isPreview) {
    return [
      {
        id: context.membership.id,
        userId: context.user.id,
        fullName: context.user.fullName,
        email: context.user.email,
        role: context.membership.role,
        isActive: true,
      },
    ];
  }

  const supabase = await createSupabaseServerClient();
  const { data: memberships, error: membershipsError } = await supabase
    .from("memberships")
    .select("id, user_id, role, is_active")
    .eq("organization_id", context.organization.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (membershipsError) {
    throw membershipsError;
  }

  const userIds = memberships.map((membership) => membership.user_id);
  if (userIds.length === 0) {
    return [];
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  if (profilesError) {
    throw profilesError;
  }

  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

  return memberships.map((membership) => {
    const profile = profilesById.get(membership.user_id);
    return {
      id: membership.id,
      userId: membership.user_id,
      fullName: profile?.full_name ?? null,
      email: profile?.email ?? "",
      role: membership.role,
      isActive: membership.is_active,
    };
  });
}
