import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import type { SearchResultItem } from "@/src/types/search.types";

function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * GET /api/wishlist
 * Fetches the authenticated user's wishlist properties and IDs
 */
export async function GET() {
  try {
    const authClient = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: true,
        authenticated: false,
        count: 0,
        propertyIds: [],
        items: [],
      });
    }

    const adminClient = createAdminClient();

    const { data: wishlistRows, error: wishError } = await adminClient
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

    if (wishError) {
      console.error("Wishlist GET error:", wishError);
      return NextResponse.json(
        { success: false, error: wishError.message, propertyIds: [], items: [] },
        { status: 500 }
      );
    }

    const propertyIds = wishlistRows?.map((r) => r.property_id) || [];

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

    return NextResponse.json({
      success: true,
      authenticated: true,
      count: items.length,
      propertyIds,
      items,
    });
  } catch (error: any) {
    console.error("Unexpected error in GET /api/wishlist:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/wishlist
 * Body: { propertyId: string }
 * Toggles a property in the authenticated user's wishlist
 */
export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          message: "Please sign in to save stays to your wishlist",
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { propertyId } = body;

    if (!propertyId) {
      return NextResponse.json(
        { success: false, error: "Missing propertyId in request body" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Resolve property UUID
    let resolvedPropertyId = propertyId;

    if (!isUUID(propertyId)) {
      const { data: propData } = await adminClient
        .from("properties")
        .select("id")
        .or(`slug.eq.${propertyId},id.eq.${propertyId}`)
        .limit(1)
        .maybeSingle();

      if (propData?.id) {
        resolvedPropertyId = propData.id;
      } else {
        const { data: matchName } = await adminClient
          .from("properties")
          .select("id")
          .ilike("name", `%${propertyId}%`)
          .limit(1)
          .maybeSingle();

        if (matchName?.id) {
          resolvedPropertyId = matchName.id;
        } else {
          return NextResponse.json({
            success: true,
            action: "added",
            isWishlisted: true,
            propertyId,
          });
        }
      }
    }

    // Check if currently wishlisted
    const { data: existingWishlist } = await adminClient
      .from("wishlists")
      .select("id")
      .eq("customer_id", user.id)
      .eq("property_id", resolvedPropertyId)
      .maybeSingle();

    if (existingWishlist) {
      // Delete from wishlist
      const { error: delError } = await adminClient
        .from("wishlists")
        .delete()
        .eq("id", existingWishlist.id);

      if (delError) {
        return NextResponse.json(
          { success: false, error: delError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: "removed",
        isWishlisted: false,
        propertyId: resolvedPropertyId,
        message: "Stay removed from your wishlist",
      });
    } else {
      // Insert into wishlist
      const { error: insError } = await adminClient.from("wishlists").insert({
        customer_id: user.id,
        property_id: resolvedPropertyId,
      });

      if (insError) {
        return NextResponse.json(
          { success: false, error: insError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: "added",
        isWishlisted: true,
        propertyId: resolvedPropertyId,
        message: "Stay saved to your wishlist",
      });
    }
  } catch (error: any) {
    console.error("Unexpected error in POST /api/wishlist:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
