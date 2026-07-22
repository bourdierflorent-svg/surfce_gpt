"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { requireAppAuthContext } from "@/features/auth/server/auth-context";
import { assertOrganizationPermission } from "@/features/organizations/server/authorization";
import { AuthorizationError } from "@/lib/errors/authorization-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

import {
  assetMetadataSchema,
  offerFormSchema,
  slugify,
  venueFormSchema,
  type OfferFormInput,
  type VenueFormInput,
} from "../schemas";

export interface VenueMutationResult {
  fieldErrors?: Record<string, string[]>;
  id?: string;
  message: string;
  success: boolean;
}

const genericFailure: VenueMutationResult = {
  success: false,
  message: "L’action n’a pas abouti. Vérifiez les informations puis réessayez.",
};

function validationFailure(error: {
  flatten: () => { fieldErrors: unknown };
}): VenueMutationResult {
  return {
    success: false,
    message: "Certains champs doivent être corrigés.",
    fieldErrors: error.flatten().fieldErrors as Record<string, string[]>,
  };
}

function permissionFailure(error: unknown): VenueMutationResult | null {
  if (error instanceof AuthorizationError) {
    return { success: false, message: "Votre rôle ne permet pas cette action." };
  }
  return null;
}

function previewFailure(): VenueMutationResult {
  return {
    success: false,
    message: "Les modifications sont désactivées dans le mode aperçu.",
  };
}

export async function saveVenueAction(
  input: VenueFormInput,
  venueId?: string,
): Promise<VenueMutationResult> {
  const parsed = venueFormSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const context = await requireAppAuthContext();
    if (context.isPreview) return previewFailure();
    assertOrganizationPermission(context.membership.role, "venues:write");

    const supabase = await createSupabaseServerClient();
    const data = parsed.data;
    const payload = {
      organization_id: context.organization.id,
      name: data.name,
      slug: slugify(data.name),
      venue_type: data.venue_type,
      description: data.description,
      address_line1: data.address_line1,
      address_line2: data.address_line2,
      postal_code: data.postal_code,
      city: data.city,
      country_code: data.country_code,
      latitude: data.latitude,
      longitude: data.longitude,
      district: data.district,
      standing: data.standing,
      atmosphere: data.atmosphere,
      capacity_seated: data.capacity_seated,
      capacity_standing: data.capacity_standing,
      minimum_guests: data.minimum_guests,
      minimum_spend: data.minimum_spend,
      currency: data.currency,
      features: data.features as Json,
      event_types: data.event_types,
      target_sectors: data.target_sectors,
      opening_rules: { note: data.opening_note } as Json,
      internal_contact: data.internal_contact,
      commercial_terms: data.commercial_terms,
      is_active: data.is_active,
    };

    const result = venueId
      ? await supabase
          .from("venues")
          .update(payload)
          .eq("id", venueId)
          .eq("organization_id", context.organization.id)
          .select("id")
          .maybeSingle()
      : await supabase.from("venues").insert(payload).select("id").single();

    if (result.error) {
      if (result.error.code === "23505") {
        return {
          success: false,
          message: "Un établissement portant ce nom existe déjà dans SURFCE.",
        };
      }
      return genericFailure;
    }

    if (!result.data) {
      return {
        success: false,
        message: "Cet établissement n’existe plus ou n’est pas accessible.",
      };
    }

    revalidatePath("/venues");
    revalidatePath(`/venues/${result.data.id}`);
    return {
      success: true,
      id: result.data.id,
      message: venueId ? "Établissement mis à jour." : "Établissement créé.",
    };
  } catch (error) {
    return permissionFailure(error) ?? genericFailure;
  }
}

export async function deleteVenueAction(venueId: string): Promise<VenueMutationResult> {
  try {
    const context = await requireAppAuthContext();
    if (context.isPreview) return previewFailure();
    assertOrganizationPermission(context.membership.role, "venues:write");

    const supabase = await createSupabaseServerClient();
    const { data: assets, error: assetsError } = await supabase
      .from("venue_assets")
      .select("storage_path")
      .eq("venue_id", venueId)
      .eq("organization_id", context.organization.id);

    if (assetsError) return genericFailure;

    const paths = (assets ?? []).map((asset) => asset.storage_path);
    if (paths.length > 0) {
      const { error: storageError } = await supabase.storage.from("venue-assets").remove(paths);
      if (storageError) {
        return { success: false, message: "Les fichiers associés n’ont pas pu être supprimés." };
      }
    }

    const { error, count } = await supabase
      .from("venues")
      .delete({ count: "exact" })
      .eq("id", venueId)
      .eq("organization_id", context.organization.id);

    if (error || count !== 1) return genericFailure;
    revalidatePath("/venues");
    return { success: true, message: "Établissement supprimé." };
  } catch (error) {
    return permissionFailure(error) ?? genericFailure;
  }
}

export async function saveOfferAction(
  venueId: string,
  input: OfferFormInput,
  offerId?: string,
): Promise<VenueMutationResult> {
  const parsed = offerFormSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const context = await requireAppAuthContext();
    if (context.isPreview) return previewFailure();
    assertOrganizationPermission(context.membership.role, "venues:write");

    const supabase = await createSupabaseServerClient();
    const { data: venue } = await supabase
      .from("venues")
      .select("id")
      .eq("id", venueId)
      .eq("organization_id", context.organization.id)
      .maybeSingle();
    if (!venue) return { success: false, message: "Cet établissement n’est pas accessible." };

    const data = parsed.data;
    const payload = {
      organization_id: context.organization.id,
      venue_id: venueId,
      name: data.name,
      slug: slugify(data.name),
      event_type: data.event_type,
      short_description: data.short_description,
      description: data.description,
      min_guests: data.min_guests,
      max_guests: data.max_guests,
      minimum_budget: data.minimum_budget,
      indicative_price: data.indicative_price,
      currency: data.currency,
      duration_minutes: data.duration_minutes,
      available_days: data.available_days,
      available_time_start: data.available_time_start,
      available_time_end: data.available_time_end,
      inclusions: data.inclusions as Json,
      options: data.options as Json,
      commission_rate: data.commission_rate,
      terms: data.terms,
      valid_from: data.valid_from,
      valid_until: data.valid_until,
      is_active: data.is_active,
    };

    const result = offerId
      ? await supabase
          .from("venue_offers")
          .update(payload)
          .eq("id", offerId)
          .eq("venue_id", venueId)
          .eq("organization_id", context.organization.id)
          .select("id")
          .maybeSingle()
      : await supabase.from("venue_offers").insert(payload).select("id").single();

    if (result.error) {
      if (result.error.code === "23505") {
        return { success: false, message: "Une offre portant ce nom existe déjà pour ce lieu." };
      }
      return genericFailure;
    }
    if (!result.data) return { success: false, message: "Cette offre n’est pas accessible." };

    revalidatePath(`/venues/${venueId}`);
    return {
      success: true,
      id: result.data.id,
      message: offerId ? "Offre mise à jour." : "Offre créée.",
    };
  } catch (error) {
    return permissionFailure(error) ?? genericFailure;
  }
}

export async function deleteOfferAction(
  venueId: string,
  offerId: string,
): Promise<VenueMutationResult> {
  try {
    const context = await requireAppAuthContext();
    if (context.isPreview) return previewFailure();
    assertOrganizationPermission(context.membership.role, "venues:write");

    const supabase = await createSupabaseServerClient();
    const { data: assets } = await supabase
      .from("venue_assets")
      .select("storage_path")
      .eq("offer_id", offerId)
      .eq("organization_id", context.organization.id);
    const paths = (assets ?? []).map((asset) => asset.storage_path);
    if (paths.length > 0) {
      const { error } = await supabase.storage.from("venue-assets").remove(paths);
      if (error)
        return { success: false, message: "Les fichiers de l’offre n’ont pas été supprimés." };
    }

    const { error, count } = await supabase
      .from("venue_offers")
      .delete({ count: "exact" })
      .eq("id", offerId)
      .eq("venue_id", venueId)
      .eq("organization_id", context.organization.id);
    if (error || count !== 1) return genericFailure;

    revalidatePath(`/venues/${venueId}`);
    return { success: true, message: "Offre supprimée." };
  } catch (error) {
    return permissionFailure(error) ?? genericFailure;
  }
}

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const extensionsByMimeType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export async function uploadVenueAssetAction(
  venueId: string,
  formData: FormData,
): Promise<VenueMutationResult> {
  const file = formData.get("file");
  const parsedMetadata = assetMetadataSchema.safeParse({
    title: formData.get("title"),
    asset_type: formData.get("asset_type"),
    offer_id: formData.get("offer_id") ?? "",
    is_public: formData.get("is_public") === "on",
  });

  if (!parsedMetadata.success) return validationFailure(parsedMetadata.error);
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, message: "Sélectionnez un fichier à ajouter." };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, message: "Le fichier ne doit pas dépasser 10 Mo." };
  }
  if (!allowedMimeTypes.has(file.type)) {
    return { success: false, message: "Format accepté : JPG, PNG, WebP ou PDF." };
  }
  if (parsedMetadata.data.asset_type === "image" && !file.type.startsWith("image/")) {
    return { success: false, message: "Un visuel doit être un fichier image." };
  }

  try {
    const context = await requireAppAuthContext();
    if (context.isPreview) return previewFailure();
    assertOrganizationPermission(context.membership.role, "venue-assets:write");

    const supabase = await createSupabaseServerClient();
    const { data: venue } = await supabase
      .from("venues")
      .select("id")
      .eq("id", venueId)
      .eq("organization_id", context.organization.id)
      .maybeSingle();
    if (!venue) return { success: false, message: "Cet établissement n’est pas accessible." };

    const extension = extensionsByMimeType[file.type];
    const storagePath = `${context.organization.id}/${venueId}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("venue-assets")
      .upload(storagePath, Buffer.from(await file.arrayBuffer()), {
        contentType: file.type,
        upsert: false,
      });
    if (uploadError) return { success: false, message: "Le fichier n’a pas pu être envoyé." };

    const { error: insertError } = await supabase.from("venue_assets").insert({
      organization_id: context.organization.id,
      venue_id: venueId,
      offer_id: parsedMetadata.data.offer_id,
      asset_type: parsedMetadata.data.asset_type,
      storage_path: storagePath,
      title: parsedMetadata.data.title,
      is_public: parsedMetadata.data.is_public,
    });

    if (insertError) {
      await supabase.storage.from("venue-assets").remove([storagePath]);
      return genericFailure;
    }

    revalidatePath(`/venues/${venueId}`);
    return { success: true, message: "Fichier ajouté à la galerie." };
  } catch (error) {
    return permissionFailure(error) ?? genericFailure;
  }
}

export async function deleteVenueAssetAction(
  venueId: string,
  assetId: string,
): Promise<VenueMutationResult> {
  try {
    const context = await requireAppAuthContext();
    if (context.isPreview) return previewFailure();
    assertOrganizationPermission(context.membership.role, "venue-assets:write");

    const supabase = await createSupabaseServerClient();
    const { data: asset } = await supabase
      .from("venue_assets")
      .select("storage_path")
      .eq("id", assetId)
      .eq("venue_id", venueId)
      .eq("organization_id", context.organization.id)
      .maybeSingle();
    if (!asset) return { success: false, message: "Ce fichier n’est plus disponible." };

    const { error: storageError } = await supabase.storage
      .from("venue-assets")
      .remove([asset.storage_path]);
    if (storageError) return { success: false, message: "Le fichier n’a pas pu être supprimé." };

    const { error } = await supabase
      .from("venue_assets")
      .delete()
      .eq("id", assetId)
      .eq("organization_id", context.organization.id);
    if (error) return genericFailure;

    revalidatePath(`/venues/${venueId}`);
    return { success: true, message: "Fichier supprimé." };
  } catch (error) {
    return permissionFailure(error) ?? genericFailure;
  }
}
