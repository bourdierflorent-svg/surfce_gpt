import { notFound, redirect } from "next/navigation";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { OfferForm } from "@/features/venues/components/offer-form";
import { getVenueDetail } from "@/features/venues/server/queries";
import { can } from "@/lib/permissions/roles";

interface NewOfferPageProps {
  params: Promise<{ venueId: string }>;
}

export default async function NewOfferPage({ params }: NewOfferPageProps) {
  const context = await requireAppAuthContext();
  if (!can(context.membership.role, "venues:write") || context.isPreview) redirect("/venues");
  const { venueId } = await params;
  const venue = await getVenueDetail(context, venueId);
  if (!venue) notFound();

  return <OfferForm venueId={venue.id} venueName={venue.name} />;
}
