-- SQL dump generated using DBML (dbml.dbdiagram.io)
-- Database: PostgreSQL
-- Generated at: 2026-08-01T10:48:16.587Z

CREATE TYPE "user_role" AS ENUM (
  'customer',
  'partner_owner',
  'partner_staff',
  'admin'
);

CREATE TYPE "staff_role" AS ENUM (
  'manager',
  'front_desk'
);

CREATE TYPE "locale" AS ENUM (
  'en',
  'fil'
);

CREATE TYPE "partner_status" AS ENUM (
  'pending',
  'approved',
  'rejected',
  'suspended'
);

CREATE TYPE "property_status" AS ENUM (
  'draft',
  'pending_review',
  'published',
  'suspended'
);

CREATE TYPE "property_type" AS ENUM (
  'resort',
  'hotel',
  'homestay',
  'glamping',
  'villa'
);

CREATE TYPE "room_status" AS ENUM (
  'available',
  'occupied',
  'maintenance'
);

CREATE TYPE "pricing_rule_type" AS ENUM (
  'seasonal',
  'weekend',
  'holiday',
  'date_range'
);

CREATE TYPE "package_status" AS ENUM (
  'draft',
  'active',
  'inactive'
);

CREATE TYPE "package_item_type" AS ENUM (
  'room',
  'breakfast',
  'lunch',
  'dinner',
  'activity',
  'shuttle',
  'spa',
  'other'
);

CREATE TYPE "booking_status" AS ENUM (
  'pending_payment',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'no_show',
  'expired',
  'refund_pending',
  'refunded'
);

CREATE TYPE "payment_status" AS ENUM (
  'pending',
  'paid',
  'failed',
  'refunded'
);

CREATE TYPE "payment_method" AS ENUM (
  'paymongo_gcash',
  'paymongo_card',
  'paymongo_grabpay',
  'cash'
);

CREATE TYPE "promo_type" AS ENUM (
  'percentage',
  'fixed'
);

CREATE TYPE "document_status" AS ENUM (
  'pending',
  'approved',
  'rejected'
);

CREATE TYPE "payout_status" AS ENUM (
  'pending',
  'processing',
  'paid',
  'failed'
);

CREATE TYPE "audit_action" AS ENUM (
  'create',
  'update',
  'delete',
  'approve',
  'reject',
  'suspend'
);

CREATE TABLE "profiles" (
  "id" uuid PRIMARY KEY,
  "email" varchar UNIQUE NOT NULL,
  "first_name" varchar NOT NULL,
  "last_name" varchar NOT NULL,
  "phone_number" varchar,
  "avatar_url" text,
  "role" user_role NOT NULL DEFAULT 'customer',
  "locale" locale DEFAULT 'en',
  "partner_id" uuid,
  "staff_role" staff_role,
  "created_at" timestamptz DEFAULT (now()),
  "updated_at" timestamptz DEFAULT (now())
);

CREATE TABLE "areas" (
  "id" uuid PRIMARY KEY,
  "name_en" varchar NOT NULL,
  "name_fil" varchar NOT NULL,
  "slug" varchar UNIQUE NOT NULL,
  "province" varchar DEFAULT 'Quezon',
  "description" text,
  "sort_order" int DEFAULT 0,
  "created_at" timestamptz DEFAULT (now()),
  "updated_at" timestamptz DEFAULT (now())
);

CREATE TABLE "partners" (
  "id" uuid PRIMARY KEY,
  "owner_id" uuid NOT NULL,
  "business_name" varchar NOT NULL,
  "business_email" varchar,
  "business_phone" varchar,
  "status" partner_status DEFAULT 'pending',
  "rejection_reason" text,
  "commission_rate" decimal(5,4) DEFAULT 0.1,
  "approved_at" timestamptz,
  "approved_by" uuid,
  "created_at" timestamptz DEFAULT (now()),
  "updated_at" timestamptz DEFAULT (now())
);

CREATE TABLE "partner_verification_documents" (
  "id" uuid PRIMARY KEY,
  "partner_id" uuid NOT NULL,
  "document_url" text NOT NULL,
  "document_type" varchar NOT NULL,
  "status" document_status NOT NULL DEFAULT 'pending',
  "reviewed_by" uuid,
  "reviewed_at" timestamptz,
  "created_at" timestamptz DEFAULT (now())
);

CREATE TABLE "properties" (
  "id" uuid PRIMARY KEY,
  "partner_id" uuid UNIQUE NOT NULL,
  "area_id" uuid NOT NULL,
  "name" varchar NOT NULL,
  "slug" varchar UNIQUE NOT NULL,
  "property_type" property_type NOT NULL,
  "description_en" text,
  "description_fil" text,
  "address" text,
  "latitude" decimal(10,8),
  "longitude" decimal(11,8),
  "check_in_time" time DEFAULT '14:00',
  "check_out_time" time DEFAULT '12:00',
  "early_checkin_fee" decimal(10,2) DEFAULT 0,
  "late_checkout_fee" decimal(10,2) DEFAULT 0,
  "status" property_status DEFAULT 'draft',
  "downpayment_rate" decimal(5,4) DEFAULT 0.3,
  "featured" boolean DEFAULT false,
  "meta_title" varchar,
  "meta_description" text,
  "deleted_at" timestamptz,
  "created_at" timestamptz DEFAULT (now()),
  "updated_at" timestamptz DEFAULT (now())
);

CREATE TABLE "property_images" (
  "id" uuid PRIMARY KEY,
  "property_id" uuid NOT NULL,
  "storage_path" text NOT NULL,
  "image_url" text NOT NULL,
  "is_cover" boolean DEFAULT false,
  "display_order" int DEFAULT 0,
  "alt_text" varchar,
  "created_at" timestamptz DEFAULT (now())
);

CREATE TABLE "amenity_categories" (
  "id" uuid PRIMARY KEY,
  "name_en" varchar UNIQUE NOT NULL,
  "name_fil" varchar,
  "slug" varchar UNIQUE NOT NULL,
  "sort_order" int DEFAULT 0,
  "created_at" timestamptz DEFAULT (now())
);

CREATE TABLE "amenities" (
  "id" uuid PRIMARY KEY,
  "category_id" uuid,
  "name_en" varchar UNIQUE NOT NULL,
  "name_fil" varchar,
  "slug" varchar UNIQUE NOT NULL,
  "icon" varchar,
  "created_at" timestamptz DEFAULT (now())
);

CREATE TABLE "property_amenities" (
  "property_id" uuid NOT NULL,
  "amenity_id" uuid NOT NULL,
  PRIMARY KEY ("property_id", "amenity_id")
);

CREATE TABLE "tags" (
  "id" uuid PRIMARY KEY,
  "name_en" varchar UNIQUE NOT NULL,
  "name_fil" varchar,
  "slug" varchar UNIQUE NOT NULL,
  "created_at" timestamptz DEFAULT (now())
);

CREATE TABLE "property_tags" (
  "property_id" uuid NOT NULL,
  "tag_id" uuid NOT NULL,
  PRIMARY KEY ("property_id", "tag_id")
);

CREATE TABLE "room_types" (
  "id" uuid PRIMARY KEY,
  "property_id" uuid NOT NULL,
  "name_en" varchar NOT NULL,
  "name_fil" varchar,
  "description_en" text,
  "description_fil" text,
  "capacity" int NOT NULL DEFAULT 2,
  "max_adults" int DEFAULT 2,
  "max_children" int DEFAULT 0,
  "base_price" decimal(10,2) NOT NULL,
  "total_inventory" int NOT NULL DEFAULT 1,
  "size_sqm" decimal(6,2),
  "bed_configuration" varchar,
  "created_at" timestamptz DEFAULT (now()),
  "updated_at" timestamptz DEFAULT (now())
);

CREATE TABLE "rooms" (
  "id" uuid PRIMARY KEY,
  "room_type_id" uuid NOT NULL,
  "room_number" varchar NOT NULL,
  "floor" varchar,
  "notes" text,
  "status" room_status NOT NULL DEFAULT 'available',
  "created_at" timestamptz DEFAULT (now()),
  "updated_at" timestamptz DEFAULT (now())
);

CREATE TABLE "room_type_availability" (
  "id" uuid PRIMARY KEY,
  "room_type_id" uuid NOT NULL,
  "date" date NOT NULL,
  "available_count" int NOT NULL,
  "price_override" decimal(10,2),
  "minimum_stay" int,
  "closed_to_arrival" boolean DEFAULT false,
  "closed_to_departure" boolean DEFAULT false,
  "created_at" timestamptz DEFAULT (now())
);

CREATE TABLE "rate_plans" (
  "id" uuid PRIMARY KEY,
  "room_type_id" uuid NOT NULL,
  "name_en" varchar NOT NULL,
  "name_fil" varchar,
  "description" text,
  "price_modifier" decimal(10,2) DEFAULT 0,
  "minimum_stay" int,
  "cancellation_policy" text,
  "includes_breakfast" boolean DEFAULT false,
  "is_default" boolean DEFAULT false,
  "created_at" timestamptz DEFAULT (now()),
  "updated_at" timestamptz DEFAULT (now())
);

CREATE TABLE "pricing_rules" (
  "id" uuid PRIMARY KEY,
  "property_id" uuid NOT NULL,
  "room_type_id" uuid,
  "name" varchar NOT NULL,
  "rule_type" pricing_rule_type NOT NULL,
  "start_date" date,
  "end_date" date,
  "days_of_week" int[],
  "price_modifier" decimal(10,2),
  "minimum_stay" int,
  "priority" int DEFAULT 0,
  "is_active" boolean DEFAULT true,
  "created_at" timestamptz DEFAULT (now()),
  "updated_at" timestamptz DEFAULT (now())
);

CREATE TABLE "packages" (
  "id" uuid PRIMARY KEY,
  "property_id" uuid NOT NULL,
  "name_en" varchar NOT NULL,
  "name_fil" varchar,
  "description_en" text,
  "description_fil" text,
  "status" package_status DEFAULT 'draft',
  "base_price" decimal(10,2),
  "valid_from" date,
  "valid_until" date,
  "created_at" timestamptz DEFAULT (now()),
  "updated_at" timestamptz DEFAULT (now())
);

CREATE TABLE "package_items" (
  "id" uuid PRIMARY KEY,
  "package_id" uuid NOT NULL,
  "item_type" package_item_type NOT NULL,
  "room_type_id" uuid,
  "name_en" varchar NOT NULL,
  "name_fil" varchar,
  "description" text,
  "quantity" int DEFAULT 1,
  "additional_price" decimal(10,2) DEFAULT 0,
  "created_at" timestamptz DEFAULT (now())
);

CREATE TABLE "bookings" (
  "id" uuid PRIMARY KEY,
  "customer_id" uuid NOT NULL,
  "room_type_id" uuid NOT NULL,
  "promo_code_id" uuid,
  "check_in" date NOT NULL,
  "check_out" date NOT NULL,
  "adults_count" int DEFAULT 1,
  "children_count" int DEFAULT 0,
  "subtotal" decimal(10,2) NOT NULL,
  "discount_amount" decimal(10,2) DEFAULT 0,
  "total_amount" decimal(10,2) NOT NULL,
  "downpayment_amount" decimal(10,2) NOT NULL,
  "balance_due" decimal(10,2) DEFAULT 0,
  "status" booking_status DEFAULT 'pending_payment',
  "payment_status" payment_status DEFAULT 'pending',
  "hold_expires_at" timestamptz,
  "created_at" timestamptz DEFAULT (now()),
  "updated_at" timestamptz DEFAULT (now())
);

CREATE TABLE "booking_rooms" (
  "id" uuid PRIMARY KEY,
  "booking_id" uuid NOT NULL,
  "room_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT (now())
);

CREATE TABLE "booking_packages" (
  "id" uuid PRIMARY KEY,
  "booking_id" uuid NOT NULL,
  "package_id" uuid NOT NULL,
  "quantity" int DEFAULT 1,
  "price_at_booking" decimal(10,2) NOT NULL,
  "created_at" timestamptz DEFAULT (now())
);

CREATE TABLE "booking_status_history" (
  "id" uuid PRIMARY KEY,
  "booking_id" uuid NOT NULL,
  "from_status" booking_status,
  "to_status" booking_status NOT NULL,
  "changed_by" uuid,
  "note" text,
  "created_at" timestamptz DEFAULT (now())
);

CREATE TABLE "payments" (
  "id" uuid PRIMARY KEY,
  "booking_id" uuid NOT NULL,
  "transaction_reference" varchar UNIQUE,
  "amount" decimal(10,2) NOT NULL,
  "provider" payment_method,
  "status" payment_status NOT NULL DEFAULT 'pending',
  "payload" jsonb,
  "created_at" timestamptz DEFAULT (now())
);

CREATE TABLE "payment_events" (
  "id" uuid PRIMARY KEY,
  "external_event_id" varchar UNIQUE NOT NULL,
  "payload" jsonb,
  "processed_at" timestamptz,
  "created_at" timestamptz DEFAULT (now())
);

CREATE TABLE "commission_ledger" (
  "id" uuid PRIMARY KEY,
  "booking_id" uuid UNIQUE NOT NULL,
  "partner_id" uuid NOT NULL,
  "rate" decimal(5,4) NOT NULL,
  "computed_fee" decimal(10,2) NOT NULL,
  "created_at" timestamptz DEFAULT (now())
);

CREATE TABLE "payouts" (
  "id" uuid PRIMARY KEY,
  "partner_id" uuid NOT NULL,
  "amount" decimal(10,2) NOT NULL,
  "status" payout_status DEFAULT 'pending',
  "period_start" date NOT NULL,
  "period_end" date NOT NULL,
  "paid_at" timestamptz,
  "created_at" timestamptz DEFAULT (now())
);

CREATE TABLE "promo_codes" (
  "id" uuid PRIMARY KEY,
  "partner_id" uuid,
  "code" varchar UNIQUE NOT NULL,
  "type" promo_type NOT NULL,
  "value" decimal(10,2) NOT NULL,
  "minimum_booking_amount" decimal(10,2) DEFAULT 0,
  "maximum_discount" decimal(10,2),
  "usage_limit" int,
  "used_count" int DEFAULT 0,
  "expiry_date" timestamptz,
  "is_active" boolean DEFAULT true,
  "created_at" timestamptz DEFAULT (now())
);

CREATE TABLE "promo_redemptions" (
  "id" uuid PRIMARY KEY,
  "booking_id" uuid NOT NULL,
  "promo_code_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT (now())
);

CREATE TABLE "loyalty_accounts" (
  "id" uuid PRIMARY KEY,
  "customer_id" uuid UNIQUE NOT NULL,
  "points_balance" int DEFAULT 0,
  "created_at" timestamptz DEFAULT (now()),
  "updated_at" timestamptz DEFAULT (now())
);

CREATE TABLE "guest_id_documents" (
  "id" uuid PRIMARY KEY,
  "booking_id" uuid NOT NULL,
  "uploaded_by" uuid NOT NULL,
  "document_url" text NOT NULL,
  "expires_at" timestamptz,
  "created_at" timestamptz DEFAULT (now())
);

CREATE TABLE "audit_logs" (
  "id" uuid PRIMARY KEY,
  "actor_id" uuid,
  "action" audit_action NOT NULL,
  "entity_type" varchar NOT NULL,
  "entity_id" uuid NOT NULL,
  "before" jsonb,
  "after" jsonb,
  "created_at" timestamptz DEFAULT (now())
);

CREATE TABLE "wishlists" (
  "id" uuid PRIMARY KEY,
  "customer_id" uuid NOT NULL,
  "property_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT (now())
);

CREATE TABLE "reviews" (
  "id" uuid PRIMARY KEY,
  "booking_id" uuid UNIQUE NOT NULL,
  "customer_id" uuid NOT NULL,
  "property_id" uuid NOT NULL,
  "rating" int NOT NULL,
  "cleanliness_rating" int,
  "staff_rating" int,
  "location_rating" int,
  "value_rating" int,
  "comment" text,
  "created_at" timestamptz DEFAULT (now())
);

CREATE UNIQUE INDEX ON "room_type_availability" ("room_type_id", "date");

CREATE UNIQUE INDEX ON "promo_redemptions" ("booking_id", "promo_code_id");

CREATE UNIQUE INDEX ON "wishlists" ("customer_id", "property_id");

COMMENT ON TABLE "profiles" IS 'CHECK constraint at migration time: partner_id/staff_role only set when role IN (partner_owner, partner_staff)';

COMMENT ON TABLE "partner_verification_documents" IS 'Private storage bucket; admin + owning partner only (§7.4)';

COMMENT ON TABLE "properties" IS 'partner_id UNIQUE — one partner account = one property (Locked Decisions)';

COMMENT ON TABLE "property_images" IS 'storage_path is source of truth (bucket-relative, e.g. {partner_id}/{filename}.webp per §7.3); image_url is the derived/served URL, regenerable if the storage provider changes';

COMMENT ON TABLE "amenity_categories" IS 'Seed: General, Pool, Room, Bathroom, Accessibility, Food, Parking, Internet — lookup table (not enum) to match the amenities/tags pattern';

COMMENT ON TABLE "rooms" IS 'Individual physical unit; assigned at check-in or optionally at booking (§5.5)';

COMMENT ON TABLE "room_type_availability" IS 'Decremented transactionally inside create_booking() RPC via SELECT ... FOR UPDATE (§5.5). Highest pricing precedence.';

COMMENT ON TABLE "rate_plans" IS 'includes_breakfast = complimentary/bundled (distinct from package_items breakfast add-on, which is separately priced)';

COMMENT ON TABLE "pricing_rules" IS 'days_of_week: 0=Sun..6=Sat. Higher priority wins on overlap. Sits between rate_plans and room_type_availability in precedence.';

COMMENT ON TABLE "bookings" IS 'Amount calc per §5.6: total_amount = subtotal - discount; downpayment default 30% (TBD-01 fallback)';

COMMENT ON TABLE "booking_rooms" IS 'Optional at booking time, required before check-in (§5.3)';

COMMENT ON TABLE "booking_status_history" IS 'Append-only audit log — no UPDATE allowed via RLS (§5.4)';

COMMENT ON TABLE "payment_events" IS 'Raw PayMongo webhook log — idempotency guard (§5.6)';

COMMENT ON TABLE "commission_ledger" IS 'Immutable audit trail; one row per confirmed booking (§5.3)';

COMMENT ON TABLE "payouts" IS 'Manual/export for MVP; automated post-MVP (Locked Decisions)';

COMMENT ON TABLE "promo_codes" IS 'partner_id nullable — null = platform-wide code, set = partner-specific code. maximum_discount caps percentage-type discounts on large bookings.';

COMMENT ON TABLE "promo_redemptions" IS 'Prevents reuse of a promo on the same booking (§5.3)';

COMMENT ON TABLE "loyalty_accounts" IS 'Stub table behind feature flag — mechanics undecided (TBD-07)';

COMMENT ON TABLE "guest_id_documents" IS 'Private bucket; auto-expire post-checkout + 30 days (§7.5)';

COMMENT ON TABLE "audit_logs" IS 'Generic accountability log for admin/partner actions — property edits, pricing changes, partner approvals/suspensions — distinct from booking_status_history, which only covers booking transitions (§7.4). actor_id nullable for system-initiated changes (e.g. cron expiry).';

COMMENT ON TABLE "reviews" IS 'rating = overall score shown first; category ratings optional/supplementary. Only after checked_out status — enforced in RLS, not app code (§5.4)';

ALTER TABLE "profiles" ADD FOREIGN KEY ("partner_id") REFERENCES "partners" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "partners" ADD FOREIGN KEY ("owner_id") REFERENCES "profiles" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "partners" ADD FOREIGN KEY ("approved_by") REFERENCES "profiles" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "partner_verification_documents" ADD FOREIGN KEY ("partner_id") REFERENCES "partners" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "partner_verification_documents" ADD FOREIGN KEY ("reviewed_by") REFERENCES "profiles" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "properties" ADD FOREIGN KEY ("partner_id") REFERENCES "partners" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "properties" ADD FOREIGN KEY ("area_id") REFERENCES "areas" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "property_images" ADD FOREIGN KEY ("property_id") REFERENCES "properties" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "amenities" ADD FOREIGN KEY ("category_id") REFERENCES "amenity_categories" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "property_amenities" ADD FOREIGN KEY ("property_id") REFERENCES "properties" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "property_amenities" ADD FOREIGN KEY ("amenity_id") REFERENCES "amenities" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "property_tags" ADD FOREIGN KEY ("property_id") REFERENCES "properties" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "property_tags" ADD FOREIGN KEY ("tag_id") REFERENCES "tags" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "room_types" ADD FOREIGN KEY ("property_id") REFERENCES "properties" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "rooms" ADD FOREIGN KEY ("room_type_id") REFERENCES "room_types" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "room_type_availability" ADD FOREIGN KEY ("room_type_id") REFERENCES "room_types" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "rate_plans" ADD FOREIGN KEY ("room_type_id") REFERENCES "room_types" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "pricing_rules" ADD FOREIGN KEY ("property_id") REFERENCES "properties" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "pricing_rules" ADD FOREIGN KEY ("room_type_id") REFERENCES "room_types" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "packages" ADD FOREIGN KEY ("property_id") REFERENCES "properties" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "package_items" ADD FOREIGN KEY ("package_id") REFERENCES "packages" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "package_items" ADD FOREIGN KEY ("room_type_id") REFERENCES "room_types" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "bookings" ADD FOREIGN KEY ("customer_id") REFERENCES "profiles" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "bookings" ADD FOREIGN KEY ("room_type_id") REFERENCES "room_types" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "bookings" ADD FOREIGN KEY ("promo_code_id") REFERENCES "promo_codes" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "booking_rooms" ADD FOREIGN KEY ("booking_id") REFERENCES "bookings" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "booking_rooms" ADD FOREIGN KEY ("room_id") REFERENCES "rooms" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "booking_packages" ADD FOREIGN KEY ("booking_id") REFERENCES "bookings" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "booking_packages" ADD FOREIGN KEY ("package_id") REFERENCES "packages" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "booking_status_history" ADD FOREIGN KEY ("booking_id") REFERENCES "bookings" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "booking_status_history" ADD FOREIGN KEY ("changed_by") REFERENCES "profiles" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "payments" ADD FOREIGN KEY ("booking_id") REFERENCES "bookings" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "commission_ledger" ADD FOREIGN KEY ("booking_id") REFERENCES "bookings" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "commission_ledger" ADD FOREIGN KEY ("partner_id") REFERENCES "partners" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "payouts" ADD FOREIGN KEY ("partner_id") REFERENCES "partners" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "promo_codes" ADD FOREIGN KEY ("partner_id") REFERENCES "partners" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "promo_redemptions" ADD FOREIGN KEY ("booking_id") REFERENCES "bookings" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "promo_redemptions" ADD FOREIGN KEY ("promo_code_id") REFERENCES "promo_codes" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "loyalty_accounts" ADD FOREIGN KEY ("customer_id") REFERENCES "profiles" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "guest_id_documents" ADD FOREIGN KEY ("booking_id") REFERENCES "bookings" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "guest_id_documents" ADD FOREIGN KEY ("uploaded_by") REFERENCES "profiles" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "audit_logs" ADD FOREIGN KEY ("actor_id") REFERENCES "profiles" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "wishlists" ADD FOREIGN KEY ("customer_id") REFERENCES "profiles" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "wishlists" ADD FOREIGN KEY ("property_id") REFERENCES "properties" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "reviews" ADD FOREIGN KEY ("booking_id") REFERENCES "bookings" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "reviews" ADD FOREIGN KEY ("customer_id") REFERENCES "profiles" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "reviews" ADD FOREIGN KEY ("property_id") REFERENCES "properties" ("id") DEFERRABLE INITIALLY IMMEDIATE;
