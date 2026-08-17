export type PropertyType = "resort" | "hotel" | "homestay" | "glamping" | "villa";

export type PropertyStatus = "draft" | "pending_review" | "published" | "suspended";

export type Area = {
  id: string;
  name: string;
  slug: string;
  province: string;
  is_active: boolean;
};

export type AmenityCategory = {
  id: string;
  name_en: string;
  name_fil: string | null;
  slug: string;
  sort_order: number;
};

export type Amenity = {
  id: string;
  category_id: string | null;
  name_en: string;
  name_fil: string | null;
  slug: string;
  icon: string | null;
};

export type PropertyAmenity = {
  property_id: string;
  amenity_id: string;
};

export type PropertyImage = {
  id: string;
  property_id: string;
  storage_path: string;
  image_url: string;
  is_cover: boolean;
  display_order: number;
  alt_text: string | null;
  created_at: string;
};

export type Property = {
  id: string;
  partner_id: string;
  area_id: string;
  name: string;
  slug: string;
  property_type: PropertyType;
  description_en: string | null;
  description_fil: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  check_in_time: string;
  check_out_time: string;
  early_checkin_fee: number;
  late_checkout_fee: number;
  status: PropertyStatus;
  downpayment_rate: number;
  featured: boolean;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
};
