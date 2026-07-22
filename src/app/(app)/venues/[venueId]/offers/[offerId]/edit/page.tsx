import { notFound, redirect } from "next/navigation";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { OfferForm } from "@/features/venues/components/offer-form";
import { getOffer, getVenueDetail } from "@/features/venues/server/queries";
import { can } from "@/lib/permissions/roles";

interface EditOfferPageProps {
  params: Promise<{ offerId: string; venueId: string }>;
}

export default async function EditOfferPage({ params }: EditOfferPageProps) {
  const context = await requireAppAuthContext();
  if (!can(context.membership.role, "venues:write") || context.isPreview) redirect("/venues");
  const { offerId, venueId } = await params;
  const [venue, offer] = await Promise.all([
    getVenueDetail(context, venueId),
    getOffer(context, venueId, offerId),
  ]);
  if (!venue || !offer) notFound();

  return <OfferForm venueId={venue.id} venueName={venue.name} offer={offer} />;
}
