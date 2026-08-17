import { redirect } from "next/navigation";
import { getUserProfile } from "@/src/lib/auth/get-profile";
import { createClient } from "@/src/lib/supabase/server";
import {
  PropertyManagement,
  type PartnerPropertyData,
} from "@/src/components/partner/property-management";
import type {
  Area,
  Amenity,
  AmenityCategory,
  PropertyImage,
} from "@/src/types/property.types";

export default async function PropertyPage() {
  const profile = await getUserProfile();
  if (!profile) redirect("/login");
  if (!profile.partner) redirect("/account?pending=partner");

  const partnerId = profile.partner.id;
  const supabase = await createClient();

  // 1. Fetch Property record
  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("partner_id", partnerId)
    .maybeSingle();

  // 2. Fetch Quezon Areas
  const { data: rawAreas } = await supabase
    .from("areas")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const areas: Area[] = (rawAreas as Area[]) || [];

  // 3. Fetch Amenity Categories & Amenities
  const { data: rawCategories } = await supabase
    .from("amenity_categories")
    .select("*")
    .order("sort_order", { ascending: true });

  const categories: AmenityCategory[] = (rawCategories as AmenityCategory[]) || [];

  const { data: rawAmenities } = await supabase
    .from("amenities")
    .select("*")
    .order("name_en", { ascending: true });

  const allAmenities: Amenity[] = (rawAmenities as Amenity[]) || [];

  // Group amenities by category
  const amenitiesByCategory = categories.map((cat) => ({
    category: cat,
    amenities: allAmenities.filter((a) => a.category_id === cat.id),
  }));

  // Add uncategorized if any
  const uncategorized = allAmenities.filter((a) => !a.category_id);
  if (uncategorized.length > 0) {
    amenitiesByCategory.push({
      category: {
        id: "other",
        name_en: "Other Amenities",
        name_fil: "Iba Pang Pasilidad",
        slug: "other",
        sort_order: 99,
      },
      amenities: uncategorized,
    });
  }

  // 4. Fetch Property Amenities
  let selectedAmenityIds: string[] = [];
  if (property?.id) {
    const { data: propertyAmenities } = await supabase
      .from("property_amenities")
      .select("amenity_id")
      .eq("property_id", property.id);

    if (propertyAmenities) {
      selectedAmenityIds = propertyAmenities.map((pa) => pa.amenity_id);
    }
  }

  // 5. Fetch Property Images
  let images: PropertyImage[] = [];
  if (property?.id) {
    const { data: propertyImages } = await supabase
      .from("property_images")
      .select("*")
      .eq("property_id", property.id)
      .order("display_order", { ascending: true });

    if (propertyImages) {
      images = propertyImages as PropertyImage[];
    }
  }

  // 6. Build initial state
  const initialProperty: PartnerPropertyData = {
    id: property?.id,
    partner_id: partnerId,
    name: property?.name || profile.partner.business_name || "",
    slug: property?.slug || "",
    property_type: property?.property_type || "resort",
    area_id: property?.area_id || (areas[0]?.id ?? ""),
    description_en: property?.description_en || "",
    description_fil: property?.description_fil || "",
    address: property?.address || "",
    latitude: property?.latitude ? Number(property.latitude) : null,
    longitude: property?.longitude ? Number(property.longitude) : null,
    check_in_time: property?.check_in_time || "14:00",
    check_out_time: property?.check_out_time || "12:00",
    early_checkin_fee: property?.early_checkin_fee ? Number(property.early_checkin_fee) : 0,
    late_checkout_fee: property?.late_checkout_fee ? Number(property.late_checkout_fee) : 0,
    downpayment_rate: property?.downpayment_rate ? Number(property.downpayment_rate) : 0.3,
    status: property?.status || "published",
    amenity_ids: selectedAmenityIds,
    images: images.map((img) => ({
      id: img.id,
      property_id: img.property_id,
      image_url: img.image_url,
      is_cover: img.is_cover,
      display_order: img.display_order,
      alt_text: img.alt_text,
    })),
  };

  return (
    <PropertyManagement
      partnerId={partnerId}
      initialProperty={initialProperty}
      areas={areas}
      amenitiesByCategory={amenitiesByCategory}
    />
  );
}
