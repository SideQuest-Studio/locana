export type UserRole = "customer" | "partner_owner" | "partner_staff" | "admin";

export type StaffRole = "manager" | "front_desk";

export type PartnerStatus = "pending" | "approved" | "rejected" | "suspended";

export type DocumentStatus = "pending" | "approved" | "rejected";

export type RoomStatus = "available" | "occupied" | "maintenance";

export type Profile = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  avatar_url: string | null;
  role: UserRole;
  locale: "en" | "fil" | null;
  partner_id: string | null;
  staff_role: StaffRole | null;
  created_at: string;
  updated_at: string;
};

export type Partner = {
  id: string;
  owner_id: string;
  business_name: string;
  business_email: string | null;
  business_phone: string | null;
  status: PartnerStatus;
  rejection_reason: string | null;
  commission_rate: number;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PartnerVerificationDocument = {
  id: string;
  partner_id: string;
  document_url: string;
  document_type: string;
  status: DocumentStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type RoomType = {
  id: string;
  property_id: string;
  name_en: string;
  name_fil: string | null;
  description_en: string | null;
  description_fil: string | null;
  capacity: number;
  max_adults: number;
  max_children: number;
  base_price: number;
  total_inventory: number;
  size_sqm: number | null;
  bed_configuration: string | null;
  created_at: string;
  updated_at: string;
};

export type Room = {
  id: string;
  room_type_id: string;
  room_number: string;
  floor: string | null;
  notes: string | null;
  status: RoomStatus;
  created_at: string;
  updated_at: string;
};

export type UserProfile = Profile & {
  partner: Partner | null;
};
