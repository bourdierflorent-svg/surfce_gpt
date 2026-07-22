import { cache } from "react";
import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppAuthContext, AppRole } from "@/types/auth";

const previewContext: AppAuthContext = {
  user: {
    id: "00000000-0000-0000-0000-000000000000",
    email: "apercu@surfce.local",
    fullName: "Aperçu SURFCE",
  },
  organization: {
    id: "10000000-0000-0000-0000-000000000001",
    name: "SURFCE",
    slug: "surfce",
    timezone: "Europe/Paris",
  },
  membership: {
    id: "20000000-0000-0000-0000-000000000001",
    organizationId: "10000000-0000-0000-0000-000000000001",
    role: "admin",
  },
  isPreview: true,
};

export function getPreviewAuthContext(): AppAuthContext {
  return previewContext;
}

export const requireAppAuthContext = cache(async (): Promise<AppAuthContext> => {
  if (!isSupabaseConfigured()) {
    return getPreviewAuthContext();
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("id, organization_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    redirect("/login?error=missing_organization");
  }

  const [{ data: organization }, { data: profile }] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, slug, timezone")
      .eq("id", membership.organization_id)
      .single(),
    supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
  ]);

  if (!organization) {
    redirect("/login?error=missing_organization");
  }

  return {
    user: {
      id: user.id,
      email: profile?.email ?? user.email ?? "",
      fullName: profile?.full_name ?? null,
    },
    organization,
    membership: {
      id: membership.id,
      organizationId: membership.organization_id,
      role: membership.role as AppRole,
    },
    isPreview: false,
  };
});
