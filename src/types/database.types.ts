export type UserRole = "customer" | "partner_owner" | "partner_staff" | "admin";

export type StaffRole = "manager" | "front_desk";

export type PartnerStatus = "pending" | "approved" | "rejected" | "suspended";

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

export type UserProfile = Profile & {
  partner: Partner | null;
};
