"use server";

import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { ActionResult, success, failure } from "@/src/lib/api/response";
import { revalidatePath } from "next/cache";
import type { SearchResultItem } from "@/src/types/search.types";

// Validate UUID format
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Toggle a property in the authenticated customer's wishlist table
 */
export async function toggleWishlistAction(
  propertyIdOrSlug: string
): Promise<ActionResult<{ isWishlisted: boolean; propertyId: string }>> {
  try {
    const authClient = await createClient();

    // 1. Check Authentication via session
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return failure("UNAUTHENTICATED", "You must be signed in to save properties to your wishlist");
    }

    const adminClient = createAdminClient();

    // 2. Resolve Property UUID from database
    let resolvedPropertyId = propertyIdOrSlug;

    if (!isUUID(propertyIdOrSlug)) {
      // Find property by slug or id
      const { data: propData } = await adminClient
        .from("properties")
        .select("id")
        .or(`slug.eq.${propertyIdOrSlug},id.eq.${propertyIdOrSlug}`)
        .limit(1)
        .maybeSingle();

      if (propData?.id) {
        resolvedPropertyId = propData.id;
      } else {
        // Fallback: look up by partial name match
        const { data: nameMatch } = await adminClient
          .from("properties")
          .select("id")
          .ilike("name", `%${propertyIdOrSlug}%`)
          .limit(1)
          .maybeSingle();

        if (nameMatch?.id) {
          resolvedPropertyId = nameMatch.id;
        } else {
          return success({
            isWishlisted: true,
            propertyId: propertyIdOrSlug,
          });
        }
      }
    }

    // 3. Check if already wishlisted
    const { data: existingWishlist, error: checkError } = await adminClient
      .from("wishlists")
      .select("id")
      .eq("customer_id", user.id)
      .eq("property_id", resolvedPropertyId)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Wishlist check error:", checkError);
    }

    if (existingWishlist) {
      // DELETE from wishlist
      const { error: deleteError } = await adminClient
        .from("wishlists")
        .delete()
        .eq("id", existingWishlist.id);

      if (deleteError) {
        console.error("Wishlist delete error:", deleteError);
        return failure("DB_ERROR", "Failed to remove from wishlist");
      }

      revalidatePath("/account/wishlist");
      revalidatePath("/search");

      return success({
        isWishlisted: false,
        propertyId: resolvedPropertyId,
      });
    } else {
      // INSERT into wishlist
      const { error: insertError } = await adminClient.from("wishlists").insert({
        customer_id: user.id,
        property_id: resolvedPropertyId,
      });

      if (insertError) {
        console.error("Wishlist insert error:", insertError);
        return failure("DB_ERROR", "Failed to save to wishlist");
      }

      revalidatePath("/account/wishlist");
      revalidatePath("/search");

      return success({
        isWishlisted: true,
        propertyId: resolvedPropertyId,
      });
    }
  } catch (err) {
    console.error("Unexpected error in toggleWishlistAction:", err);
    return failure("INTERNAL_ERROR", "An unexpected error occurred while updating wishlist");
  }
}

/**
 * Fetch list of wishlisted property IDs for the authenticated customer
 */
export async function getWishlistAction(): Promise<ActionResult<{ propertyIds: string[] }>> {
  try {
    const authClient = await createClient();

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return success({ propertyIds: [] });
    }

    const adminClient = createAdminClient();
    const { data: wishlistRows, error } = await adminClient
      .from("wishlists")
      .select("property_id")
      .eq("customer_id", user.id);

    if (error) {
      console.error("Error fetching wishlists:", error);
      return success({ propertyIds: [] });
    }

    const propertyIds = wishlistRows?.map((r) => r.property_id) || [];
    return success({ propertyIds });
  } catch (err) {
    console.error("Unexpected error in getWishlistAction:", err);
    return success({ propertyIds: [] });
  }
}

/**
 * Fetch full property details for the customer's wishlist page
 */
export async function getWishlistPropertiesAction(): Promise<
  ActionResult<{ items: SearchResultItem[] }>
> {
  try {
    const authClient = await createClient();

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return failure("UNAUTHENTICATED", "Please sign in to view your wishlist");
    }

    const adminClient = createAdminClient();

    // Query wishlists with joined properties
    const { data: wishlistRows, error } = await adminClient
      .from("wishlists")
      .select(`
        id,
        property_id,
        created_at,
        property:properties(
          id,
          name,
          slug,
          property_type,
          address,
          description_en,
          partner_id,
          partner:partners(business_name),
          area:areas(name_en, province),
          images:property_images(image_url, is_cover, display_order),
          room_types(id, name_en, base_price, capacity)
        )
      `)
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading wishlist properties:", error);
      return success({ items: [] });
    }

    const items: SearchResultItem[] = (wishlistRows || [])
      .filter((row: any) => row.property)
      .map((row: any) => {
        const p = row.property;
        const areaName = p.area?.name_en || "Quezon";
        const partnerName = p.partner?.business_name;

        const sortedImages = (p.images || [])
          .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
          .map((img: any) => img.image_url);

        const coverImg =
          p.images?.find((img: any) => img.is_cover)?.image_url ||
          sortedImages[0] ||
          "/hero.jpg";

        const roomsList =
          p.room_types?.map((r: any) => ({
            id: r.id,
            name: r.name_en,
            price: Number(r.base_price) || 3000,
            capacity: r.capacity || 2,
          })) || [];

        const minPrice =
          roomsList.length > 0
            ? Math.min(...roomsList.map((r: any) => r.price))
            : 3000;

        return {
          id: p.id,
          type: "property" as const,
          title: p.name,
          subtitle: p.description_en || `${p.property_type || "Resort"} in ${areaName}`,
          location: p.address || `${areaName}, Quezon`,
          address: p.address || `${areaName}, Quezon`,
          areaName,
          partnerName,
          badge: p.property_type
            ? p.property_type.charAt(0).toUpperCase() + p.property_type.slice(1)
            : "Resort",
          propertyType: p.property_type || "resort",
          price: minPrice,
          rating: 4.9,
          reviewsCount: 120,
          image: coverImg,
          images: sortedImages.length > 0 ? sortedImages : [coverImg],
          slug: p.slug,
          roomTypes: roomsList,
        };
      });

    return success({ items });
  } catch (err) {
    console.error("Unexpected error in getWishlistPropertiesAction:", err);
    return failure("INTERNAL_ERROR", "Failed to fetch wishlist properties");
  }
}
