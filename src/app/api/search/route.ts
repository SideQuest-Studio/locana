import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import type { SearchResultItem, SearchResponse } from "@/src/types/search.types";

// Curated Quezon Province seed & fallback entries to guarantee fast, rich recommendations
const QUEZON_AREAS_FALLBACK: SearchResultItem[] = [
  {
    id: "area-lucena",
    type: "area",
    title: "Lucena City",
    subtitle: "Capital of Quezon Province · Urban, Dining & Stays",
    location: "Lucena, Quezon",
    areaName: "Lucena City",
    badge: "Capital",
    image: "/batanes.jpg",
  },
  {
    id: "area-lucban",
    type: "area",
    title: "Lucban",
    subtitle: "Heritage Town, Pahiyas Festival & Nature Resorts",
    location: "Lucban, Quezon",
    areaName: "Lucban",
    badge: "Heritage",
    image: "/hero.jpg",
  },
  {
    id: "area-tayabas",
    type: "area",
    title: "Tayabas City",
    subtitle: "Historic Bridges, Mountain Springs & Country Estates",
    location: "Tayabas, Quezon",
    areaName: "Tayabas",
    badge: "Historic",
    image: "/siargao.jpg",
  },
  {
    id: "area-pagbilao",
    type: "area",
    title: "Pagbilao",
    subtitle: "Puting Buhangin Beach, Mangrove Forests & Waterparks",
    location: "Pagbilao, Quezon",
    areaName: "Pagbilao",
    badge: "Coastal",
    image: "/kawasan.jpg",
  },
  {
    id: "area-infanta",
    type: "area",
    title: "Infanta & Real",
    subtitle: "Pacific Coast Beaches, Surfing & Eco-Lodges",
    location: "Infanta, Quezon",
    areaName: "Infanta",
    badge: "Surfing & Coast",
    image: "/hero.jpg",
  },
  {
    id: "area-sariaya",
    type: "area",
    title: "Sariaya",
    subtitle: "Ancestral Houses, Eco-farms & Beachfront Resorts",
    location: "Sariaya, Quezon",
    areaName: "Sariaya",
    badge: "Eco-Farm & Beach",
    image: "/batanes.jpg",
  },
  {
    id: "area-dolores",
    type: "area",
    title: "Dolores & Mount Banahaw",
    subtitle: "Mystic Springs, Nature Healing & Mountain Cabins",
    location: "Dolores, Quezon",
    areaName: "Dolores",
    badge: "Mountain Nature",
    image: "/siargao.jpg",
  },
];

const QUEZON_PROPERTIES_FALLBACK: SearchResultItem[] = [
  {
    id: "prop-samkara",
    type: "property",
    title: "Samkara Restaurant & Nature Resort",
    subtitle: "Eco-luxury native cottages & spring pools nestled at the foot of Mt. Banahaw",
    location: "Majayjay-Lucban Road, Lucban, Quezon",
    address: "Sitio Calangay, Barangay Kalinawan, Lucban, Quezon",
    areaName: "Lucban",
    badge: "Eco-Resort",
    propertyType: "resort",
    partnerName: "Samkara Nature Resorts Corp.",
    price: 3800,
    rating: 4.92,
    reviewsCount: 1420,
    image: "/hero.jpg",
    images: ["/hero.jpg", "/siargao.jpg", "/batanes.jpg"],
    slug: "samkara-nature-resort",
    featured: true,
    amenities: ["Swimming Pool", "Free Breakfast", "Nature Trail", "Wifi", "Restaurant", "Spa"],
    highlights: ["Natural cold spring swimming pools", "Authentic Filipino heirloom dining", "Zero-plastic eco retreat"],
    roomTypes: [
      { id: "sam-1", name: "Deluxe Spring Villa", price: 3800, capacity: 2, description: "Queen bed with private veranda overlooking the stream" },
      { id: "sam-2", name: "Family Bamboo Cottage", price: 6200, capacity: 5, description: "Two-storey native bamboo house with 2 double beds" },
    ],
  },
  {
    id: "prop-kamayan",
    type: "property",
    title: "Kamayan sa Palaisdaan Resort",
    subtitle: "Famous floating restaurant, lagoon villas, and serene garden cabanas",
    location: "Brgy. Dapdap, Tayabas, Quezon",
    address: "Barangay Dapdap, Tayabas City, Quezon",
    areaName: "Tayabas",
    badge: "Lagoon Resort",
    propertyType: "resort",
    partnerName: "Kamayan Hospitality Group",
    price: 2900,
    rating: 4.86,
    reviewsCount: 2310,
    image: "/siargao.jpg",
    images: ["/siargao.jpg", "/hero.jpg", "/kawasan.jpg"],
    slug: "kamayan-sa-palaisdaan",
    featured: true,
    amenities: ["Swimming Pool", "Free Breakfast", "Restaurant", "Air Conditioning", "Wifi"],
    highlights: ["Floating balsa huts dining", "Lagoon fishing & boating", "Lush tropical gardens"],
    roomTypes: [
      { id: "kam-1", name: "Lagoon View Cabana", price: 2900, capacity: 2, description: "Cozy air-conditioned cabana over the water" },
      { id: "kam-2", name: "Executive Garden Suite", price: 4800, capacity: 4, description: "Spacious family suite with pool terrace" },
    ],
  },
  {
    id: "prop-graceland",
    type: "property",
    title: "Graceland Estates and Country Club",
    subtitle: "Expansive 22-hectare country estate with lagoon, sports club & lakeside villas",
    location: "Barangay Camaysa, Tayabas, Quezon",
    address: "Barangay Camaysa, Tayabas City, Quezon",
    areaName: "Tayabas",
    badge: "Country Club",
    propertyType: "resort",
    partnerName: "Graceland Estates Inc.",
    price: 4500,
    rating: 4.94,
    reviewsCount: 3100,
    image: "/batanes.jpg",
    images: ["/batanes.jpg", "/hero.jpg", "/siargao.jpg"],
    slug: "graceland-estates",
    featured: true,
    amenities: ["Swimming Pool", "Free Breakfast", "Wifi", "Restaurant", "Pet Friendly", "Air Conditioning"],
    highlights: ["22-hectare estate grounds", "Kayak lagoon and horseback riding", "Championship tennis courts"],
    roomTypes: [
      { id: "grace-1", name: "Lakeside Villa", price: 4500, capacity: 3, description: "Private villa facing the central lagoon" },
      { id: "grace-2", name: "Grand Country Manor", price: 8500, capacity: 6, description: "2-bedroom estate suite with living & dining areas" },
    ],
  },
  {
    id: "prop-villa-escudero",
    type: "property",
    title: "Villa Escudero Plantations & Resort",
    subtitle: "Waterfall dining, plantation heritage museum, and bamboo rafting",
    location: "Tiaong, Quezon",
    address: "Km 91, Tiaong, Quezon Province",
    areaName: "Tiaong",
    badge: "Heritage Resort",
    propertyType: "resort",
    partnerName: "Villa Escudero Estate Corp.",
    price: 5200,
    rating: 4.96,
    reviewsCount: 5620,
    image: "/kawasan.jpg",
    images: ["/kawasan.jpg", "/hero.jpg", "/batanes.jpg"],
    slug: "villa-escudero-resort",
    featured: true,
    amenities: ["Swimming Pool", "Free Breakfast", "Restaurant", "Nature Trail", "Wifi"],
    highlights: ["Lunch right at the foot of Labasin Waterfall", "Private cultural museum", "Bamboo river rafting"],
    roomTypes: [
      { id: "esc-1", name: "Riverside Native Cottage", price: 5200, capacity: 2, description: "Traditional wood and nipa cottage by the river" },
      { id: "esc-2", name: "Longhouse Family Unit", price: 7900, capacity: 6, description: "Spacious heritage cottage for families" },
    ],
  },
  {
    id: "prop-puting-buhangin",
    type: "property",
    title: "Puting Buhangin Cove & Beach Resort",
    subtitle: "Crystal turquoise waters, private cove swim spots, and white sands",
    location: "Pagbilao Grande Island, Pagbilao, Quezon",
    address: "Pagbilao Grande Island, Pagbilao, Quezon",
    areaName: "Pagbilao",
    badge: "Beach Resort",
    propertyType: "resort",
    partnerName: "Pagbilao Coastal Hospitality",
    price: 2400,
    rating: 4.88,
    reviewsCount: 1890,
    image: "/hero.jpg",
    images: ["/hero.jpg", "/siargao.jpg", "/kawasan.jpg"],
    slug: "puting-buhangin-cove-resort",
    amenities: ["Beachfront", "Free Breakfast", "Restaurant", "Nature Trail"],
    highlights: ["Famous Kwebang Lampas cave", "Snorkeling in coral sanctuaries", "White sand beach"],
    roomTypes: [
      { id: "put-1", name: "Beachfront Glamping Cabana", price: 2400, capacity: 2, description: "Steps away from the white sand shore" },
      { id: "put-2", name: "Oceanview Family Hut", price: 4200, capacity: 5, description: "Elevated sea-view cottage" },
    ],
  },
  {
    id: "prop-real-surf",
    type: "property",
    title: "Real Coast & Surf Eco-Cabins",
    subtitle: "Beachfront surf camp, A-frame cabins, and Pacific wave views",
    location: "Barangay Malapad, Real, Quezon",
    address: "Barangay Malapad, Real, Quezon",
    areaName: "Real",
    badge: "Surf & Cabins",
    propertyType: "homestay",
    partnerName: "Real Surf & Camp LLC",
    price: 2100,
    rating: 4.84,
    reviewsCount: 980,
    image: "/siargao.jpg",
    images: ["/siargao.jpg", "/batanes.jpg", "/hero.jpg"],
    slug: "real-coast-and-surf",
    amenities: ["Beachfront", "Pet Friendly", "Wifi", "Restaurant"],
    highlights: ["Surfing lessons for all skill levels", "A-frame wooden cabins", "Beach bonfires"],
    roomTypes: [
      { id: "real-1", name: "A-Frame Surf Cabin", price: 2100, capacity: 2, description: "Minimalist wooden cabin with ocean breeze" },
      { id: "real-2", name: "Loft Surf Villa", price: 3900, capacity: 4, description: "Loft-type cabin with private porch" },
    ],
  },
  {
    id: "prop-lucena-hotel",
    type: "property",
    title: "The Saint Jude Executive Hotel & Suites",
    subtitle: "Modern executive hotel with skyline dining and conference facilities",
    location: "Diversion Road, Lucena City, Quezon",
    address: "Maharlika Highway, Lucena City, Quezon",
    areaName: "Lucena City",
    badge: "Executive Hotel",
    propertyType: "hotel",
    partnerName: "St. Jude Hospitality Corp.",
    price: 3200,
    rating: 4.79,
    reviewsCount: 1140,
    image: "/batanes.jpg",
    images: ["/batanes.jpg", "/hero.jpg", "/siargao.jpg"],
    slug: "saint-jude-executive-hotel",
    amenities: ["Swimming Pool", "Free Breakfast", "Wifi", "Air Conditioning", "Restaurant"],
    highlights: ["Prime location in Lucena City center", "Rooftop lounge and pool", "24/7 Concierge"],
    roomTypes: [
      { id: "jud-1", name: "Deluxe King Room", price: 3200, capacity: 2, description: "King size bed with city skyline view" },
      { id: "jud-2", name: "Executive Suite", price: 5400, capacity: 3, description: "Living room, work desk, and bathtub" },
    ],
  },
  {
    id: "prop-sariaya-farm",
    type: "property",
    title: "Balai Sadyaya Resort & Eco-Park",
    subtitle: "Cultural heritage estate, organic orchards, and lagoon swimming pool",
    location: "Barangay Sampaloc 2, Sariaya, Quezon",
    address: "Sampaloc 2, Sariaya, Quezon",
    areaName: "Sariaya",
    badge: "Eco-Park Resort",
    propertyType: "resort",
    partnerName: "Balai Sadyaya Heritage Corp.",
    price: 3100,
    rating: 4.88,
    reviewsCount: 860,
    image: "/hero.jpg",
    images: ["/hero.jpg", "/kawasan.jpg", "/siargao.jpg"],
    slug: "balai-sadyaya-resort",
    amenities: ["Swimming Pool", "Free Breakfast", "Nature Trail", "Pet Friendly", "Wifi"],
    highlights: ["Lush fruit orchard tours", "Natural spring pool", "Colonial Quezon architecture"],
    roomTypes: [
      { id: "sad-1", name: "Casita Garden Room", price: 3100, capacity: 2, description: "Garden view casita with private terrace" },
      { id: "sad-2", name: "Heritage Villa", price: 5600, capacity: 5, description: "Classic Filipino wooden villa" },
    ],
  },
];

const QUEZON_ROOMS_FALLBACK: SearchResultItem[] = [
  {
    id: "room-deluxe-villa",
    type: "room_type",
    title: "Deluxe Poolside Villa",
    subtitle: "Private balcony, king bed, lagoon pool access at Samkara",
    location: "Lucban, Quezon",
    badge: "Villa",
    price: 3800,
    image: "/hero.jpg",
  },
  {
    id: "room-family-suite",
    type: "room_type",
    title: "Family Lakeside Cottage",
    subtitle: "2 Queen beds, fits up to 6 guests with veranda at Graceland",
    location: "Tayabas, Quezon",
    badge: "Family Suite",
    price: 4900,
    image: "/siargao.jpg",
  },
  {
    id: "room-native-hut",
    type: "room_type",
    title: "Traditional Bahay Kubo Cabin",
    subtitle: "Eco bamboo architecture, natural cross-ventilation in Dolores",
    location: "Dolores, Quezon",
    badge: "Native Cabin",
    price: 1800,
    image: "/batanes.jpg",
  },
];

const QUEZON_AMENITIES_FALLBACK: SearchResultItem[] = [
  {
    id: "amenity-pool",
    type: "amenity",
    title: "Infinity Pool & Spring Water",
    subtitle: "Resorts with swimming pools and natural springs",
    location: "Quezon Province",
    badge: "Amenity",
  },
  {
    id: "amenity-beach",
    type: "amenity",
    title: "Direct Beachfront Access",
    subtitle: "Stays steps away from the sand and sea",
    location: "Quezon Province",
    badge: "Amenity",
  },
  {
    id: "amenity-breakfast",
    type: "amenity",
    title: "Free Breakfast Included",
    subtitle: "Enjoy complimentary local Quezon breakfast",
    location: "Quezon Province",
    badge: "Amenity",
  },
  {
    id: "amenity-pet",
    type: "amenity",
    title: "Pet-Friendly Resorts",
    subtitle: "Bring your pets along for the getaway",
    location: "Quezon Province",
    badge: "Amenity",
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const rawQ = searchParams.get("q") || "";
  const query = rawQ.trim().toLowerCase();

  const areaResults: SearchResultItem[] = [];
  const propertyResults: SearchResultItem[] = [];
  const roomResults: SearchResultItem[] = [];
  const amenityResults: SearchResultItem[] = [];
  const addedPropertyIds = new Set<string>();

  try {
    const supabase = await createClient();

    // 1. Query Supabase Database if query is provided or all properties for general search
    // A) Query PROPERTIES table directly (joined with partners, areas, room_types & images)
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
        partner:partners(id, business_name, status),
        area:areas(name_en, province),
        images:property_images(image_url, is_cover),
        room_types(id, name_en, base_price, capacity)
      `);

    if (query) {
      propQuery = propQuery.or(`name.ilike.%${query}%,address.ilike.%${query}%,description_en.ilike.%${query}%`);
    }

    const { data: dbProperties } = await propQuery.limit(15);

    if (dbProperties && dbProperties.length > 0) {
      dbProperties.forEach((p: any) => {
        if (!addedPropertyIds.has(p.id)) {
          addedPropertyIds.add(p.id);
          const areaName = p.area?.name_en || "Quezon";
          const partnerBizName = p.partner?.business_name;
          const coverImg =
            p.images?.find((img: any) => img.is_cover)?.image_url ||
            p.images?.[0]?.image_url ||
            "/hero.jpg";

          const roomsList = p.room_types?.map((r: any) => ({
            id: r.id,
            name: r.name_en,
            price: Number(r.base_price) || 3000,
            capacity: r.capacity || 2,
          })) || [];

          const minPrice = roomsList.length > 0
            ? Math.min(...roomsList.map((r: any) => r.price))
            : 3000;

          propertyResults.push({
            id: p.id,
            type: "property",
            title: p.name,
            subtitle:
              partnerBizName && partnerBizName !== p.name
                ? `${partnerBizName} · ${p.address || `${areaName}, Quezon`}`
                : p.description_en || p.address || `${p.property_type || "Resort"} in ${areaName}`,
            location: p.address || `${areaName}, Quezon`,
            address: p.address || `${areaName}, Quezon`,
            areaName: areaName,
            partnerName: partnerBizName,
            badge: p.property_type
              ? p.property_type.charAt(0).toUpperCase() + p.property_type.slice(1)
              : "Partner Property",
            propertyType: p.property_type || "resort",
            price: minPrice,
            rating: 4.9,
            reviewsCount: 150,
            image: coverImg,
            images: p.images?.map((img: any) => img.image_url) || [coverImg],
            slug: p.slug,
            amenities: ["Swimming Pool", "Free Breakfast", "Wifi", "Air Conditioning"],
            roomTypes: roomsList,
          });
        }
      });
    }

    // B) Query PARTNERS table directly by business_name
    if (query) {
      const { data: dbPartners } = await supabase
        .from("partners")
        .select(`
          id,
          business_name,
          status,
          properties(
            id,
            name,
            slug,
            property_type,
            address,
            description_en,
            area:areas(name_en, province),
            images:property_images(image_url, is_cover),
            room_types(id, name_en, base_price, capacity)
          )
        `)
        .ilike("business_name", `%${query}%`)
        .limit(6);

      if (dbPartners && dbPartners.length > 0) {
        dbPartners.forEach((pt: any) => {
          const props = Array.isArray(pt.properties)
            ? pt.properties
            : pt.properties
            ? [pt.properties]
            : [];

          props.forEach((p: any) => {
            if (p && !addedPropertyIds.has(p.id)) {
              addedPropertyIds.add(p.id);
              const areaName = p.area?.name_en || "Quezon";
              const coverImg =
                p.images?.find((img: any) => img.is_cover)?.image_url ||
                p.images?.[0]?.image_url ||
                "/hero.jpg";

              const roomsList = p.room_types?.map((r: any) => ({
                id: r.id,
                name: r.name_en,
                price: Number(r.base_price) || 3000,
                capacity: r.capacity || 2,
              })) || [];

              const minPrice = roomsList.length > 0
                ? Math.min(...roomsList.map((r: any) => r.price))
                : 3000;

              propertyResults.push({
                id: p.id,
                type: "property",
                title: p.name,
                subtitle: `${pt.business_name} · ${p.address || `${areaName}, Quezon`}`,
                location: p.address || `${areaName}, Quezon`,
                address: p.address || `${areaName}, Quezon`,
                areaName: areaName,
                partnerName: pt.business_name,
                badge: p.property_type
                  ? p.property_type.charAt(0).toUpperCase() + p.property_type.slice(1)
                  : "Partner Property",
                propertyType: p.property_type || "resort",
                price: minPrice,
                rating: 4.85,
                reviewsCount: 120,
                image: coverImg,
                images: p.images?.map((img: any) => img.image_url) || [coverImg],
                slug: p.slug,
                amenities: ["Swimming Pool", "Free Breakfast", "Wifi", "Air Conditioning"],
                roomTypes: roomsList,
              });
            }
          });
        });
      }

      // C) Query AREAS table
      const { data: dbAreas } = await supabase
        .from("areas")
        .select("id, name_en, name_fil, slug, province, description")
        .or(`name_en.ilike.%${query}%,name_fil.ilike.%${query}%,slug.ilike.%${query}%`)
        .limit(5);

      if (dbAreas && dbAreas.length > 0) {
        dbAreas.forEach((a) => {
          areaResults.push({
            id: a.id,
            type: "area",
            title: a.name_en,
            subtitle: a.description || `${a.province || "Quezon"} Municipality`,
            location: `${a.name_en}, ${a.province || "Quezon"}`,
            areaName: a.name_en,
            badge: "Municipality",
            slug: a.slug,
          });
        });
      }

      // D) Query ROOM_TYPES table
      const { data: dbRooms } = await supabase
        .from("room_types")
        .select(`
          id,
          name_en,
          base_price,
          capacity,
          property:properties(name, slug, area:areas(name_en))
        `)
        .ilike("name_en", `%${query}%`)
        .limit(4);

      if (dbRooms && dbRooms.length > 0) {
        dbRooms.forEach((r: any) => {
          const propName = r.property?.name || "Resort";
          const areaName = r.property?.area?.name_en || "Quezon";
          roomResults.push({
            id: r.id,
            type: "room_type",
            title: r.name_en,
            subtitle: `at ${propName} · ${areaName}`,
            location: `${areaName}, Quezon`,
            areaName: areaName,
            badge: "Room",
            price: Number(r.base_price) || undefined,
            slug: r.property?.slug,
          });
        });
      }

      // E) Query AMENITIES table
      const { data: dbAmenities } = await supabase
        .from("amenities")
        .select("id, name_en, slug, icon")
        .ilike("name_en", `%${query}%`)
        .limit(4);

      if (dbAmenities && dbAmenities.length > 0) {
        dbAmenities.forEach((am: any) => {
          amenityResults.push({
            id: am.id,
            type: "amenity",
            title: am.name_en,
            subtitle: `Filter stays with ${am.name_en}`,
            location: "Quezon Province",
            badge: "Amenity",
            slug: am.slug,
          });
        });
      }
    }
  } catch (err) {
    console.error("Database search query error:", err);
  }

  // 2. Merge with fallback/curated Quezon catalog to guarantee instant rich results
  const existingIds = new Set([
    ...areaResults.map((r) => r.id),
    ...propertyResults.map((r) => r.id),
    ...roomResults.map((r) => r.id),
    ...amenityResults.map((r) => r.id),
  ]);

  if (query) {
    QUEZON_AREAS_FALLBACK.filter((a) => {
      const match =
        a.title.toLowerCase().includes(query) ||
        a.subtitle.toLowerCase().includes(query) ||
        a.location.toLowerCase().includes(query);
      return match && !existingIds.has(a.id);
    }).forEach((item) => areaResults.push(item));

    QUEZON_PROPERTIES_FALLBACK.filter((p) => {
      const match =
        p.title.toLowerCase().includes(query) ||
        p.subtitle.toLowerCase().includes(query) ||
        p.location.toLowerCase().includes(query) ||
        (p.partnerName && p.partnerName.toLowerCase().includes(query)) ||
        (p.areaName && p.areaName.toLowerCase().includes(query)) ||
        (p.propertyType && p.propertyType.toLowerCase().includes(query)) ||
        (p.amenities && p.amenities.some((am) => am.toLowerCase().includes(query)));
      return match && !existingIds.has(p.id);
    }).forEach((item) => propertyResults.push(item));

    QUEZON_ROOMS_FALLBACK.filter((r) => {
      const match =
        r.title.toLowerCase().includes(query) ||
        r.subtitle.toLowerCase().includes(query) ||
        r.location.toLowerCase().includes(query);
      return match && !existingIds.has(r.id);
    }).forEach((item) => roomResults.push(item));

    QUEZON_AMENITIES_FALLBACK.filter((am) => {
      const match =
        am.title.toLowerCase().includes(query) ||
        am.subtitle.toLowerCase().includes(query);
      return match && !existingIds.has(am.id);
    }).forEach((item) => amenityResults.push(item));
  } else {
    // If no search query, include all curated properties so search page shows all stays
    QUEZON_PROPERTIES_FALLBACK.filter((p) => !existingIds.has(p.id)).forEach((item) =>
      propertyResults.push(item)
    );
  }

  // Combine results in priority order: areas -> properties (partners/resorts) -> rooms -> amenities
  const combinedResults = [
    ...areaResults,
    ...propertyResults,
    ...roomResults,
    ...amenityResults,
  ];

  // Popular / Trending items for initial focus state
  const popularSuggestions = [
    QUEZON_AREAS_FALLBACK[0], // Lucena City
    QUEZON_AREAS_FALLBACK[1], // Lucban
    QUEZON_AREAS_FALLBACK[2], // Tayabas
    QUEZON_PROPERTIES_FALLBACK[0], // Samkara Nature Resort
    QUEZON_PROPERTIES_FALLBACK[1], // Kamayan sa Palaisdaan
    QUEZON_PROPERTIES_FALLBACK[2], // Graceland Estates
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
    popular: popularSuggestions,
  };

  return NextResponse.json(response);
}
