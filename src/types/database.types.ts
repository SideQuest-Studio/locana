export type UserRole = "customer" | "partner_owner" | "partner_staff" | "admin";

export type StaffRole = "manager" | "front_desk";

export type PartnerStatus = "pending" | "approved" | "rejected" | "suspended";

export type DocumentStatus = "pending" | "approved" | "rejected";

export type RoomStatus = "available" | "occupied" | "maintenance";

export type BookingStatus =
  | "pending_payment"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "no_show"
  | "expired"
  | "refund_pending"
  | "refunded";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type PaymentMethod = "paymongo_gcash" | "paymongo_card" | "paymongo_grabpay" | "cash";

export type Booking = {
  id: string;
  customer_id: string;
  room_type_id: string;
  promo_code_id: string | null;
  check_in: string;
  check_out: string;
  adults_count: number;
  children_count: number;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  downpayment_amount: number;
  balance_due: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  hold_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Payment = {
  id: string;
  booking_id: string;
  transaction_reference: string | null;
  amount: number;
  provider: PaymentMethod | null;
  status: PaymentStatus;
  payload: Record<string, unknown> | null;
  created_at: string;
};

export type BookingStatusHistory = {
  id: string;
  booking_id: string;
  from_status: BookingStatus | null;
  to_status: BookingStatus;
  changed_by: string | null;
  note: string | null;
  created_at: string;
};

/** Shape returned by get_partner_bookings RPC */
export type PartnerBookingRow = {
  booking_id: string;
  booking_ref: string;
  booking_date: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  guest_avatar_url: string;
  listing_name: string;
  listing_location: string;
  listing_image: string;
  check_in: string;
  check_out: string;
  adults_count: number;
  children_count: number;
  total_amount: number;
  status: string;
  room_type_name: string;
  total_count: number;
};

/** Shape returned by get_partner_bookings_stats RPC */
export type PartnerBookingsStats = {
  total_bookings: number;
  upcoming_checkins: number;
  ongoing_stays: number;
  completed: number;
  cancelled: number;
};

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
