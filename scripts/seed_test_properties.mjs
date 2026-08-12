import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Read .env
const envContent = fs.readFileSync(".env", "utf8");
const env = {};
envContent.split("\n").forEach((l) => {
  const [k, ...v] = l.split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim();
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

async function seed() {
  console.log("Seeding test data with [test] prefix into Supabase...");

  // 1. Get an existing owner profile (or admin)
  const { data: profiles } = await supabase.from("profiles").select("id, email").limit(5);
  const ownerId = profiles?.[0]?.id;
  if (!ownerId) {
    console.error("No profile found in profiles table!");
    return;
  }

  // 2. Seed Areas
  const AREAS_SEED = [
    { name_en: "Lucena City", name_fil: "Lungsod ng Lucena", slug: "lucena-city", province: "Quezon" },
    { name_en: "Lucban", name_fil: "Lucban", slug: "lucban", province: "Quezon" },
    { name_en: "Tayabas City", name_fil: "Lungsod ng Tayabas", slug: "tayabas-city", province: "Quezon" },
    { name_en: "Pagbilao", name_fil: "Pagbilao", slug: "pagbilao", province: "Quezon" },
    { name_en: "Infanta", name_fil: "Infanta", slug: "infanta", province: "Quezon" },
    { name_en: "Real", name_fil: "Real", slug: "real", province: "Quezon" },
    { name_en: "Sariaya", name_fil: "Sariaya", slug: "sariaya", province: "Quezon" },
    { name_en: "Dolores", name_fil: "Dolores", slug: "dolores", province: "Quezon" },
    { name_en: "Tiaong", name_fil: "Tiaong", slug: "tiaong", province: "Quezon" },
    { name_en: "Mauban", name_fil: "Mauban", slug: "mauban", province: "Quezon" },
  ];

  const areaMap = {};
  for (const a of AREAS_SEED) {
    const { data, error } = await supabase
      .from("areas")
      .upsert(a, { onConflict: "slug" })
      .select()
      .single();
    if (data) areaMap[a.name_en] = data.id;
    else if (error) console.error("Area error:", a.name_en, error.message);
  }

  console.log("Areas seeded:", Object.keys(areaMap).length);

  // 3. Seed Amenities
  const AMENITIES_SEED = [
    { name_en: "Swimming Pool", name_fil: "Paliguan / Pool", slug: "swimming-pool", icon: "Waves" },
    { name_en: "Free Breakfast", name_fil: "Libreng Almusal", slug: "free-breakfast", icon: "Coffee" },
    { name_en: "Beachfront", name_fil: "Tabing-Dagat", slug: "beachfront", icon: "Waves" },
    { name_en: "Wifi", name_fil: "Libreng Wifi", slug: "wifi", icon: "Wifi" },
    { name_en: "Air Conditioning", name_fil: "Aircon", slug: "air-conditioning", icon: "Wind" },
    { name_en: "Nature Trail", name_fil: "Nature Trail / Hiking", slug: "nature-trail", icon: "Trees" },
    { name_en: "Spa", name_fil: "Spa at Masahe", slug: "spa", icon: "Sparkles" },
    { name_en: "Pet Friendly", name_fil: "Puwede ang Alaga", slug: "pet-friendly", icon: "Dog" },
    { name_en: "Restaurant", name_fil: "Restawran", slug: "restaurant", icon: "Utensils" },
  ];

  const amenityMap = {};
  for (const am of AMENITIES_SEED) {
    const { data } = await supabase
      .from("amenities")
      .upsert(am, { onConflict: "slug" })
      .select()
      .single();
    if (data) amenityMap[am.name_en] = data.id;
  }
  console.log("Amenities seeded:", Object.keys(amenityMap).length);

  // 4. Seed Test Properties
  const TEST_PROPERTIES = [
    {
      partner_name: "[test] Samkara Nature Resorts Corp.",
      name: "[test] Samkara Restaurant & Nature Resort",
      slug: "test-samkara-nature-resort",
      area_name: "Lucban",
      property_type: "resort",
      description_en: "Eco-luxury native cottages & spring pools nestled at the foot of Mt. Banahaw, surrounded by organic gardens and flowing rivers.",
      address: "Sitio Calangay, Barangay Kalinawan, Lucban, Quezon",
      latitude: 14.1167,
      longitude: 121.5583,
      status: "published",
      featured: true,
      images: ["/hero.jpg", "/siargao.jpg", "/batanes.jpg"],
      rooms: [
        { name_en: "Deluxe Spring Villa", base_price: 3800, capacity: 2 },
        { name_en: "Family Bamboo Cottage", base_price: 6200, capacity: 5 },
      ],
      amenities: ["Swimming Pool", "Free Breakfast", "Nature Trail", "Wifi", "Restaurant", "Spa"],
    },
    {
      partner_name: "[test] Kamayan Hospitality Group",
      name: "[test] Kamayan sa Palaisdaan Lagoon Resort",
      slug: "test-kamayan-sa-palaisdaan",
      area_name: "Tayabas City",
      property_type: "resort",
      description_en: "Famous floating restaurant, overwater lagoon villas, and serene garden cabanas surrounded by lush bamboo groves.",
      address: "Barangay Dapdap, Tayabas City, Quezon",
      latitude: 14.0256,
      longitude: 121.5936,
      status: "published",
      featured: true,
      images: ["/siargao.jpg", "/hero.jpg", "/kawasan.jpg"],
      rooms: [
        { name_en: "Lagoon View Cabana", base_price: 2900, capacity: 2 },
        { name_en: "Executive Garden Suite", base_price: 4800, capacity: 4 },
      ],
      amenities: ["Swimming Pool", "Free Breakfast", "Restaurant", "Air Conditioning", "Wifi"],
    },
    {
      partner_name: "[test] Graceland Estates Inc.",
      name: "[test] Graceland Estates and Country Club",
      slug: "test-graceland-estates",
      area_name: "Tayabas City",
      property_type: "resort",
      description_en: "Expansive 22-hectare country estate with natural lagoon, sports club, horseback riding, and lakeside villas.",
      address: "Barangay Camaysa, Tayabas City, Quezon",
      latitude: 14.0321,
      longitude: 121.5812,
      status: "published",
      featured: true,
      images: ["/batanes.jpg", "/hero.jpg", "/siargao.jpg"],
      rooms: [
        { name_en: "Lakeside Premier Room", base_price: 4500, capacity: 2 },
        { name_en: "Clubhouse Family Villa", base_price: 7900, capacity: 6 },
      ],
      amenities: ["Swimming Pool", "Free Breakfast", "Wifi", "Restaurant", "Pet Friendly", "Air Conditioning"],
    },
    {
      partner_name: "[test] Puting Buhangin Beach Escapes",
      name: "[test] Puting Buhangin Beachfront Cabins",
      slug: "test-puting-buhangin-cabins",
      area_name: "Pagbilao",
      property_type: "resort",
      description_en: "Pristine white sand beachfront cottages and sea-cave adventure resort facing the tranquil Tayabas Bay.",
      address: "Barangay Ibabang Polo, Pagbilao, Quezon",
      latitude: 13.9142,
      longitude: 121.7314,
      status: "published",
      featured: true,
      images: ["/kawasan.jpg", "/siargao.jpg", "/hero.jpg"],
      rooms: [
        { name_en: "Beachfront Sunset Cottage", base_price: 3400, capacity: 3 },
        { name_en: "Oceanview Glamping Tent", base_price: 2200, capacity: 2 },
      ],
      amenities: ["Beachfront", "Swimming Pool", "Free Breakfast", "Nature Trail"],
    },
    {
      partner_name: "[test] Balai Sadyaya Heritage Corp.",
      name: "[test] Balai Sadyaya Resort & Eco-Park",
      slug: "test-balai-sadyaya-resort",
      area_name: "Sariaya",
      property_type: "resort",
      description_en: "Cultural heritage estate, organic orchards, natural spring pool, and colonial Filipino architecture.",
      address: "Barangay Sampaloc 2, Sariaya, Quezon",
      latitude: 13.9634,
      longitude: 121.5234,
      status: "published",
      featured: false,
      images: ["/hero.jpg", "/kawasan.jpg", "/batanes.jpg"],
      rooms: [
        { name_en: "Casita Garden Room", base_price: 3100, capacity: 2 },
        { name_en: "Heritage Wooden Villa", base_price: 5600, capacity: 5 },
      ],
      amenities: ["Swimming Pool", "Free Breakfast", "Nature Trail", "Pet Friendly", "Wifi"],
    },
    {
      partner_name: "[test] Pacific Surf & Tides Co.",
      name: "[test] Real Pacific Surf & Eco-Lodge",
      slug: "test-real-pacific-surf-lodge",
      area_name: "Real",
      property_type: "homestay",
      description_en: "Pacific coast surf cabins, river-tubing adventures, and beachfront bonfire lounges nestled in Real, Quezon.",
      address: "Barangay Malapad, Real, Quezon",
      latitude: 14.6621,
      longitude: 121.6034,
      status: "published",
      featured: true,
      images: ["/siargao.jpg", "/batanes.jpg", "/hero.jpg"],
      rooms: [
        { name_en: "Surfer Bamboo Loft", base_price: 2100, capacity: 2 },
        { name_en: "Oceanfront Family Suite", base_price: 4200, capacity: 4 },
      ],
      amenities: ["Beachfront", "Wifi", "Pet Friendly", "Nature Trail"],
    },
    {
      partner_name: "[test] Banahaw Mystic Springs",
      name: "[test] Mt. Banahaw Spring Healing Cabins",
      slug: "test-banahaw-spring-cabins",
      area_name: "Dolores",
      property_type: "homestay",
      description_en: "Cold mountain stream pools, meditation gardens, and rustic bamboo cabins nestled in the Banahaw foothills.",
      address: "Barangay Kinabuhayan, Dolores, Quezon",
      latitude: 14.0211,
      longitude: 121.4012,
      status: "published",
      featured: false,
      images: ["/batanes.jpg", "/hero.jpg", "/kawasan.jpg"],
      rooms: [
        { name_en: "Banahaw Stream Hut", base_price: 1800, capacity: 2 },
        { name_en: "Forest Sanctuary Villa", base_price: 3600, capacity: 4 },
      ],
      amenities: ["Swimming Pool", "Nature Trail", "Spa", "Free Breakfast"],
    },
    {
      partner_name: "[test] Quezon Premier Hospitality",
      name: "[test] Quezon Premier Hotel & Suites",
      slug: "test-quezon-premier-hotel",
      area_name: "Lucena City",
      property_type: "hotel",
      description_en: "Modern city hotel with rooftop pool, executive suites, conference facilities, and city dining.",
      address: "Diversion Road, Lucena City, Quezon",
      latitude: 13.9372,
      longitude: 121.6172,
      status: "published",
      featured: false,
      images: ["/hero.jpg", "/siargao.jpg", "/batanes.jpg"],
      rooms: [
        { name_en: "Executive King Room", base_price: 2800, capacity: 2 },
        { name_en: "Diplomatic Suite", base_price: 5200, capacity: 4 },
      ],
      amenities: ["Swimming Pool", "Free Breakfast", "Wifi", "Air Conditioning", "Restaurant"],
    },
  ];

  for (const item of TEST_PROPERTIES) {
    const areaId = areaMap[item.area_name] || Object.values(areaMap)[0];

    // Check or insert Partner
    const { data: existingPartner } = await supabase
      .from("partners")
      .select("id")
      .eq("business_name", item.partner_name)
      .maybeSingle();

    let partnerId = existingPartner?.id;
    if (!partnerId) {
      const { data: newPartner, error: partError } = await supabase
        .from("partners")
        .insert({
          owner_id: ownerId,
          business_name: item.partner_name,
          business_email: `${item.slug}@dip-test.ph`,
          status: "approved",
          commission_rate: 0.1,
        })
        .select()
        .single();
      if (newPartner) partnerId = newPartner.id;
      else if (partError) console.error("Partner error:", item.partner_name, partError.message);
    }

    if (!partnerId) continue;

    // Check or insert Property
    const { data: existingProp } = await supabase
      .from("properties")
      .select("id")
      .eq("slug", item.slug)
      .maybeSingle();

    let propertyId = existingProp?.id;
    if (!propertyId) {
      const { data: newProp, error: propError } = await supabase
        .from("properties")
        .insert({
          partner_id: partnerId,
          area_id: areaId,
          name: item.name,
          slug: item.slug,
          property_type: item.property_type,
          description_en: item.description_en,
          address: item.address,
          latitude: item.latitude,
          longitude: item.longitude,
          status: item.status,
          featured: item.featured,
          downpayment_rate: 0.3,
        })
        .select()
        .single();
      if (newProp) propertyId = newProp.id;
      else if (propError) console.error("Property error:", item.name, propError.message);
    }

    if (!propertyId) continue;

    // Seed Property Images
    for (let i = 0; i < item.images.length; i++) {
      const imgUrl = item.images[i];
      await supabase.from("property_images").upsert(
        {
          property_id: propertyId,
          storage_path: `test/${item.slug}/${i}.jpg`,
          image_url: imgUrl,
          is_cover: i === 0,
          display_order: i,
        },
        { onConflict: "property_id, display_order" }
      );
    }

    // Seed Room Types
    for (const r of item.rooms) {
      await supabase.from("room_types").insert({
        property_id: propertyId,
        name_en: r.name_en,
        base_price: r.base_price,
        capacity: r.capacity,
        total_inventory: 5,
      });
    }

    // Seed Property Amenities join
    for (const amName of item.amenities) {
      const amId = amenityMap[amName];
      if (amId) {
        await supabase
          .from("property_amenities")
          .upsert({ property_id: propertyId, amenity_id: amId });
      }
    }

    console.log(`✓ Seeded property: ${item.name} (${propertyId})`);
  }

  console.log("Seeding complete! All test properties are live in Supabase.");
}

seed();
