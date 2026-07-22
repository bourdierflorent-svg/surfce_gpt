import { notFound, redirect } from "next/navigation";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { VenueForm } from "@/features/venues/components/venue-form";
import { getVenueDetail } from "@/features/venues/server/queries";
import { can } from "@/lib/permissions/roles";

interface EditVenuePageProps {
  params: Promise<{ venueId: string }>;
}

export default async function EditVenuePage({ params }: EditVenuePageProps) {
  const context = await requireAppAuthContext();
  if (!can(context.membership.role, "venues:write") || context.isPreview) redirect("/venues");
  const { venueId } = await params;
  const venue = await getVenueDetail(context, venueId);
  if (!venue) notFound();

  return <VenueForm venue={venue} />;
}
