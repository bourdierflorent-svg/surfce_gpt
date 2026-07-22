import { redirect } from "next/navigation";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { VenueForm } from "@/features/venues/components/venue-form";
import { can } from "@/lib/permissions/roles";

export default async function NewVenuePage() {
  const context = await requireAppAuthContext();
  if (!can(context.membership.role, "venues:write") || context.isPreview) redirect("/venues");

  return <VenueForm />;
}
