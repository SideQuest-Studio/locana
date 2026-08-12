import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import type { SearchResultItem, SearchResponse } from "@/src/types/search.types";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const rawQ = searchParams.get("q") || "";
  const query = rawQ.trim().toLowerCase();

  const areaResults: SearchResultItem[] = [];
  const propertyResults: SearchResultItem[] = [];
  const roomResults: SearchResultItem[] = [];
  const amenityResults: SearchResultItem[] = [];
  const popularResults: SearchResultItem[] = [];
  const addedPropertyIds = new Set<string>();

  try {
    const supabase = createAdminClient();

    // 1. Query PROPERTIES from database joined with partners, areas, images, room_types, and amenities
    let propQuery = supabase
      .from("properties")
      .select(`
        id,
        name,
        slug,
        property_type,
        address,
        description_en,
        partner_id,
        featured,
        latitude,
        longitude,
        partner:partners(id, business_name, status),
        area:areas(id, name_en, province),
        images:property_images(image_url, is_cover, display_order),
        room_types(id, name_en, base_price, capacity, description_en),
        property_amenities(
          amenity:amenities(id, name_en, slug, icon)
        )
      `)
      .eq("status", "published");

    if (query) {
      propQuery = propQuery.or(
        `name.ilike.%${query}%,address.ilike.%${query}%,description_en.ilike.%${query}%`
      );
    }

    const { data: dbProperties, error: propError } = await propQuery
      .order("featured", { ascending: false })
      .limit(30);

    if (propError) {
      console.error("Database property search error:", propError);
    }

    if (dbProperties && dbProperties.length > 0) {
      dbProperties.forEach((p: any) => {
        if (!addedPropertyIds.has(p.id)) {
          addedPropertyIds.add(p.id);
          const areaName = p.area?.name_en || "Quezon";
          const partnerBizName = p.partner?.business_name;

          // Ordered images
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
              description: r.description_en,
            })) || [];

          const minPrice =
            roomsList.length > 0
              ? Math.min(...roomsList.map((r: any) => r.price))
              : 3000;

          const amenitiesList =
            p.property_amenities
              ?.map((pa: any) => pa.amenity?.name_en)
              .filter(Boolean) || ["Swimming Pool", "Free Breakfast", "Wifi"];

          const item: SearchResultItem = {
            id: p.id,
            type: "property",
            title: p.name,
            subtitle:
              partnerBizName && partnerBizName !== p.name
                ? `${partnerBizName} · ${p.address || `${areaName}, Quezon`}`
                : p.description_en || `${p.property_type || "Resort"} in ${areaName}`,
            location: p.address || `${areaName}, Quezon`,
            address: p.address || `${areaName}, Quezon`,
            areaName: areaName,
            partnerName: partnerBizName,
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
            featured: p.featured || false,
            amenities: amenitiesList,
            highlights: [
              "Instant confirmation with 30% downpayment",
              `Located in ${areaName}, Quezon`,
              "Verified partner property",
            ],
            roomTypes: roomsList,
          };

          propertyResults.push(item);

          // If query also matched room types, add them
          if (query && p.room_types) {
            p.room_types.forEach((r: any) => {
              if (
                r.name_en.toLowerCase().includes(query) ||
                (r.description_en && r.description_en.toLowerCase().includes(query))
              ) {
                roomResults.push({
                  id: r.id,
                  type: "room_type",
                  title: r.name_en,
                  subtitle: `${p.name} · Capacity: ${r.capacity} guests`,
                  location: `${areaName}, Quezon`,
                  badge: "Room Type",
                  price: Number(r.base_price) || 3000,
                  image: coverImg,
                });
              }
            });
          }
        }
      });
    }

    // 2. Query AREAS (Municipalities) from database
    let areaQuery = supabase.from("areas").select("id, name_en, name_fil, slug, province");
    if (query) {
      areaQuery = areaQuery.or(`name_en.ilike.%${query}%,name_fil.ilike.%${query}%`);
    }
    const { data: dbAreas } = await areaQuery.limit(10);

    if (dbAreas && dbAreas.length > 0) {
      dbAreas.forEach((a: any) => {
        areaResults.push({
          id: a.id,
          type: "area",
          title: a.name_en,
          subtitle: `Explore stays in ${a.name_en}, Quezon Province`,
          location: `${a.name_en}, Quezon`,
          areaName: a.name_en,
          badge: "Municipality",
          slug: a.slug,
        });
      });
    }

    // 3. Query AMENITIES from database
    if (query) {
      const { data: dbAmenities } = await supabase
        .from("amenities")
        .select("id, name_en, slug, icon")
        .ilike("name_en", `%${query}%`)
        .limit(6);

      if (dbAmenities && dbAmenities.length > 0) {
        dbAmenities.forEach((am: any) => {
          amenityResults.push({
            id: am.id,
            type: "amenity",
            title: am.name_en,
            subtitle: `Stays offering ${am.name_en} in Quezon Province`,
            location: "Quezon Province",
            badge: "Amenity",
            slug: am.slug,
          });
        });
      }
    }

    // 4. Query POPULAR STAYS from database (featured properties first)
    const { data: popularProps } = await supabase
      .from("properties")
      .select(`
        id,
        name,
        slug,
        property_type,
        address,
        description_en,
        partner:partners(business_name),
        area:areas(name_en),
        images:property_images(image_url, is_cover, display_order),
        room_types(id, name_en, base_price, capacity)
      `)
      .eq("status", "published")
      .order("featured", { ascending: false })
      .limit(6);

    if (popularProps && popularProps.length > 0) {
      popularProps.forEach((p: any) => {
        const areaName = p.area?.name_en || "Quezon";
        const coverImg =
          p.images?.find((img: any) => img.is_cover)?.image_url ||
          p.images?.[0]?.image_url ||
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

        popularResults.push({
          id: p.id,
          type: "property",
          title: p.name,
          subtitle: `${p.partner?.business_name || p.name} · ${areaName}, Quezon`,
          location: p.address || `${areaName}, Quezon`,
          areaName: areaName,
          badge: p.property_type
            ? p.property_type.charAt(0).toUpperCase() + p.property_type.slice(1)
            : "Resort",
          propertyType: p.property_type || "resort",
          price: minPrice,
          rating: 4.9,
          reviewsCount: 120,
          image: coverImg,
          slug: p.slug,
          roomTypes: roomsList,
        });
      });
    }

    // Combined flat list
    const combinedResults = [
      ...areaResults,
      ...propertyResults,
      ...roomResults,
      ...amenityResults,
    ];

    const response: SearchResponse = {
      query: rawQ,
      total: combinedResults.length,
      results: combinedResults,
      categories: {
        areas: areaResults,
        properties: propertyResults,
        rooms: roomResults,
        amenities: amenityResults,
      },
      popular: popularResults.length > 0 ? popularResults : propertyResults.slice(0, 6),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Search API unexpected failure:", error);
    return NextResponse.json(
      {
        query: rawQ,
        total: 0,
        results: [],
        categories: { areas: [], properties: [], rooms: [], amenities: [] },
        popular: [],
      },
      { status: 500 }
    );
  }
}
