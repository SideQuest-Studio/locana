# DIP — Agent Development Guide

> **Purpose:** Single source of truth for any AI agent or developer building DIP.  
> **Product:** Instant-book resort & hotel platform for **Quezon Province, Philippines**.  
> **Brand:** DIP (keep this name everywhere — not locana/devpulse).  
> **Timeline:** **1-week MVP** for presentation; architecture must support post-MVP scale.

Read this entire file before writing code. When instructions conflict, this document wins.

---

## Table of Contents

1. [Product Summary](#1-product-summary)
2. [Locked Decisions](#2-locked-decisions)
3. [Open Decisions (TBD Registry)](#3-open-decisions-tbd-registry)
4. [MVP Scope vs Post-MVP](#4-mvp-scope-vs-post-mvp)
5. [Backend Architecture](#5-backend-architecture)
6. [Frontend Architecture](#6-frontend-architecture)
7. [Cross-Cutting Rules](#7-cross-cutting-rules)
8. [Week Sprint Priority](#8-week-sprint-priority)
9. [Definition of Done](#9-definition-of-done)
10. [Anti-Patterns](#10-anti-patterns)

---

## 1. Product Summary

### What DIP Is

A booking website where:

- **Customers** search Quezon resorts/hotels, book instantly, pay a downpayment (full payment rules TBD), manage bookings, wishlist, reviews, and promos.
- **Partners** (one account = one property) self-register, get admin-approved, then manage listings, room types, individual rooms, rates, availability, packages, bookings, and staff sub-users.
- **Admins** approve partners/listings, oversee platform operations, handle disputes/refunds (workflows TBD), and manage featured content.

### Property Types (priority order)

1. Resorts
2. Hotels
3. Homestays (optional in MVP — stub category, implement if time allows)

### Geographic Scope

- **Launch:** Specific Quezon areas first (seed data — see [Areas](#511-core-tables)).
- **Design for growth:** Province-wide expansion without schema changes.

### Languages

- **English + Filipino (Tagalog)** from day one.
- All user-facing strings go through i18n — never hardcode copy in components.

---

## 2. Locked Decisions

| Area | Decision |
|------|----------|
| Framework | Next.js App Router (existing repo — **rebuild**, do not patch legacy mock UI) |
| Database & Auth | Supabase (PostgreSQL + Supabase Auth) |
| Booking model | **Instant book** (no request-to-book in MVP) |
| Account required | Yes — no guest checkout |
| Partner model | Self-register → **pending approval** → active |
| Partner scope | **One partner account = one property** |
| Partner staff | Yes — sub-users with role-based permissions |
| Partner content | Partners manage pricing, photos, availability |
| Room model | **Both** room types with quantity **and** individual room units |
| Pricing | Seasonal/weekend rates, minimum stay, check-in/out rules, early/late fees |
| Packages | Yes — room + add-ons (breakfast, tours, etc.) |
| Platform revenue | Commission on bookings |
| Payments | PayMongo (GCash, Maya, cards); **downpayment at minimum** for MVP |
| Payouts | Platform collects → pays partners later (automate post-MVP; manual/export OK for MVP) |
| Refunds | Approval-based (exact workflow TBD) |
| Reviews | Only after completed stay |
| Notifications | Email only (Resend or Supabase-compatible provider) |
| Maps | Yes — property locations + near-me |
| SEO | Yes — critical for discovery |
| PWA | Yes — mobile-first installable web app |
| OTA / channel managers | Post-MVP (design schema hooks, do not build sync) |
| Compliance | Partner business verification docs; guest ID storage; PH Data Privacy Act awareness |
| Repo layout | Monorepo for now; this guide has distinct **Backend** and **Frontend** sections (split into separate MD files later if needed) |

---

## 3. Open Decisions (TBD Registry)

Agents **must not guess** these. Implement extensible placeholders and document assumptions in PR/commit messages.

| ID | Topic | Status | MVP Fallback |
|----|-------|--------|--------------|
| TBD-01 | Full payment vs downpayment % vs pay-at-property | Undecided | **30% downpayment** at booking; balance due at check-in (configurable per property later) |
| TBD-02 | Admin powers beyond approval | Undecided | MVP admin: approve/reject partners, suspend listings, view all bookings, manual refund flag |
| TBD-03 | Refund approval chain | Undecided | Admin approves; partner notified; status = `refund_pending` → `refunded` |
| TBD-04 | PayMongo OTC | Uncertain | **Skip OTC in MVP**; card + GCash + Maya only |
| TBD-05 | Commission rate | Undecided | Default **10%** platform fee in schema (`commission_rate` on property, overridable by admin) |
| TBD-06 | Launch municipalities | Undecided | Seed: Lucena, Tayabas, Pagbilao, Lucban, Infanta — expand via `areas` table |
| TBD-07 | Loyalty program mechanics | Mentioned for v1 | **Stub table + UI hidden behind feature flag** unless sprint time allows |
| TBD-08 | Compare properties | Mentioned for v1 | **Feature flag off**; schema not required for MVP |

When the user updates decisions, edit this table first, then implement.

---

## 4. MVP Scope vs Post-MVP

### MVP (1 week — must ship for presentation)

- [ ] Supabase schema + RLS + migrations
- [ ] Auth: customer, partner owner, partner staff, admin roles
- [ ] Partner registration + pending approval flow
- [ ] Admin approval dashboard (minimal)
- [ ] Property CRUD (partner): details, photos, location on map, amenities
- [ ] Room types + individual rooms + availability calendar
- [ ] Rate plans: base, weekend, seasonal; min stay; check-in/out times
- [ ] Packages (basic: room type + bundled items)
- [ ] Public: home, search with filters, property detail, map view
- [ ] Customer: register/login, book (instant), pay downpayment via PayMongo, booking history
- [ ] Email confirmations (booking created, payment received, partner approved)
- [ ] Wishlist
- [ ] Promo codes (basic: percentage/fixed, expiry, usage limit)
- [ ] Reviews (submit after `completed` booking)
- [ ] i18n EN/FIL
- [ ] SEO: metadata, sitemap, structured data (LodgingBusiness / Hotel)
- [ ] PWA manifest + service worker (offline shell only — not offline booking)
- [ ] Partner verification doc upload (storage + admin review)

### Post-MVP (do not block sprint)

- Automated partner payouts
- Channel manager / OTA sync
- OTC payments
- Loyalty points
- Property compare
- SMS notifications
- Advanced analytics
- Native mobile apps
- Dynamic pricing AI

---

## 5. Backend Architecture

### 5.1 Principles

1. **RLS is the security boundary** — never rely on client-side role checks alone. Every table with user-scoped data must have RLS enabled before it ships.
2. **All writes go through Server Actions or Route Handlers** — never write to Supabase from the browser with the service role key. The anon key is for reads only in MVP.
3. **Use database transactions for booking-critical paths** — booking creation, inventory decrement, and payment intent creation must execute inside a single `create_booking()` RPC. Partial success is a bug.
4. **Idempotent webhook processing** — PayMongo events are deduplicated via a unique constraint on `payment_events.external_event_id`. Duplicate delivery must be a no-op, not a double-charge.
5. **Soft deletes for live listings** — use `deleted_at timestamptz` on `properties`, `room_types`, and `packages`; hard delete only for `draft` status records or explicit admin purge.
6. **UUID primary keys everywhere** — use `gen_random_uuid()`. Avoids enumeration attacks and supports future multi-region sharding without collision.
7. **Timestamps on every table** — `created_at timestamptz default now()` and `updated_at timestamptz default now()`. Add a `moddatetime` trigger or update via service layer — never rely on callers to set `updated_at`.
8. **Zod validates at the boundary** — validate every Server Action input and webhook payload before it touches the database. The Zod schema is the contract; the DB constraint is the safety net.
9. **Never expose raw database errors to clients** — map `PostgrestError` codes to i18n error keys in a central handler. Leak nothing about schema or query structure.
10. **Separation of Supabase clients** — maintain three distinct client instances: browser (anon key, RLS-scoped), server (anon key + session cookie, RLS-scoped), and admin (service role, server only). Mixing them is a security defect.

---

### 5.2 Role Model

```
auth.users (Supabase Auth)
    └── profiles (1:1, trigger-created on signup)
            ├── role: customer | partner_owner | partner_staff | admin
            └── partner_staff → partner_id (FK) + staff_role: manager | front_desk
```

**JWT custom claims:** Mirror `role` and `partner_id` into the JWT via a Supabase Auth hook (`custom_access_token` hook or `app_metadata`). This allows middleware to make fast routing decisions without an extra DB round-trip. However, **RLS policies always validate against the `profiles` table** — JWT claims are convenience, not authority.

**Why `app_metadata` over `user_metadata`:** `app_metadata` is server-writable only; users cannot forge their own role claim.

**Profile creation:** Use a `AFTER INSERT ON auth.users` trigger to insert a corresponding `profiles` row with `role = 'customer'` (default). This prevents orphaned auth users with no profile.

| Role | Access |
|------|--------|
| `customer` | Own profile, bookings, reviews, wishlist, payments |
| `partner_owner` | Own property, rooms, rates, bookings for their property, staff management |
| `partner_staff` | Scoped by `staff_role`: `manager` (full partner access except ownership transfer); `front_desk` (check-in, booking view, room assignment only) |
| `admin` | All rows; bypass RLS via `is_admin()` `SECURITY DEFINER` helper function |

**`is_admin()` helper:**
```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;
```

Similarly create `get_my_partner_id()` and `get_my_role()` as stable, security-definer functions. Cache the result within a transaction; do not inline subqueries in every policy.

---

### 5.3 Domain Entities

```
areas (Quezon municipalities — seed only, admin-managed post-MVP)
    └── properties (1 per partner account; partner_id UNIQUE)
            ├── property_images (ordered, hero flag)
            ├── property_amenities (FK to amenities lookup table)
            ├── room_types
            │     ├── rooms (individual units: 101, 102 … )
            │     └── room_type_availability (date → available_count; decremented transactionally)
            ├── rate_plans (base / weekend / seasonal; priority order)
            ├── pricing_rules (min_stay, max_stay, early_checkin_fee, late_checkout_fee)
            └── packages
                    └── package_items (room_type_id + addon name/price)

bookings
    ├── booking_rooms (assigned room units — optional at booking; required before check-in)
    ├── booking_packages
    └── booking_status_history (append-only audit log of every status transition)

payments          (one per payment attempt)
payment_events    (raw webhook log — idempotency table; unique on external_event_id)
payouts           (partner settlement records — manual MVP; automated post-MVP)
commission_ledger (immutable audit trail; one row per confirmed booking)

reviews           (booking_id UNIQUE; status = completed gated in RLS)
wishlists         (customer_id + property_id UNIQUE)
promo_codes       (code UNIQUE; usage_limit, used_count, expiry_date, type: percentage | fixed)
promo_redemptions (booking_id + promo_code_id; prevents reuse per booking)

partner_verification_documents (private bucket; status: pending | approved | rejected)
guest_id_documents              (private bucket; linked to booking; auto-expire post-checkout + 30d)
```

**Amenities normalisation:** Use a separate `amenities` lookup table (`id`, `name_en`, `name_fil`, `icon_key`) and a `property_amenities` join table rather than a JSON array. This enables filtering (`WHERE amenity = 'pool'`) without JSON operators and avoids schema drift.

---

### 5.4 Booking State Machine

```
pending_payment → confirmed → checked_in → completed
       ↓              ↓            ↓
   expired        cancelled    cancelled (edge case — partner or admin only)
       ↓              ↓
(inventory         refund_pending → refunded
 released)
```

**Rules:**

- `pending_payment`: inventory is **held** (available_count decremented) for 15 minutes (configurable via `BOOKING_HOLD_MINUTES` env var). A scheduled job or Supabase pg_cron task expires stale holds and releases inventory.
- `confirmed`: set only after a successful `payment.paid` webhook is processed. Never set it from the client.
- `checked_in` / `completed`: partner staff action. `completed` can also auto-trigger via a nightly cron job for bookings whose `check_out_date < now()` and status is still `checked_in`.
- **All transitions are recorded** in `booking_status_history` (append-only, no UPDATE allowed via RLS). This is your audit log — never skip it.
- **Enforce valid transitions in the RPC**, not just in the UI. An invalid transition (e.g. `completed → confirmed`) must throw a database-level error.
- Reviews are permitted only when `status = 'completed'` — enforce in RLS, not application code.

**Expired hold cleanup:**
```sql
-- Run via pg_cron every 5 minutes (add post-MVP; manual cron job or Edge Function for MVP)
UPDATE bookings
SET status = 'expired'
WHERE status = 'pending_payment'
  AND created_at < now() - (current_setting('app.booking_hold_minutes')::int * interval '1 minute');
-- Trigger releases room_type_availability inventory via AFTER UPDATE trigger
```

---

### 5.5 Availability & Inventory

**Two layers (both required):**

1. **Room type quantity** — `room_type_availability(room_type_id, date, available_count)`. Decremented atomically inside `create_booking()` RPC. Used for search filters and calendar views.
2. **Individual room units** — `rooms` table with `status: available | occupied | maintenance`. Assigned at check-in by partner staff (or optionally at booking if partner prefers guaranteed unit assignment).

**Concurrency control (critical):**

```sql
-- Inside create_booking() RPC — always within a transaction
SELECT available_count
FROM room_type_availability
WHERE room_type_id = p_room_type_id
  AND date BETWEEN p_check_in AND p_check_out - 1
FOR UPDATE;  -- row-level lock prevents race condition

-- Only proceed if available_count >= p_requested_count for ALL dates in range
-- Then decrement:
UPDATE room_type_availability
SET available_count = available_count - p_requested_count
WHERE room_type_id = p_room_type_id
  AND date BETWEEN p_check_in AND p_check_out - 1;
```

`SELECT … FOR UPDATE` inside the RPC is the correct tool here. Do not use optimistic locking for booking — the window for double-booking is real, especially during peak weekends.

**Minimum stay validation:** Check `pricing_rules.min_stay` inside the RPC before proceeding. Return a typed error code the Server Action can map to an i18n key.

---

### 5.6 Payments (PayMongo)

```
Customer submits BookingForm
    → Server Action: validate input (Zod) + check promo code
    → Call create_booking() RPC (transaction):
          - Lock availability rows (FOR UPDATE)
          - Validate min stay, max guests, dates
          - Decrement room_type_availability
          - Insert booking (status: pending_payment)
          - Insert booking_status_history row
    → Create PayMongo Payment Intent (downpayment amount)
    → Return { bookingId, paymentUrl } to client
    → Client redirects to PayMongo hosted checkout

Webhook POST /api/webhooks/paymongo
    → Verify HMAC signature (reject 401 if invalid — never process unsigned events)
    → Idempotent upsert into payment_events (unique on external_event_id)
    → If already processed → return 200 immediately
    → Update booking → confirmed
    → Insert payments row (amount, currency, method, paymongo_id)
    → Insert commission_ledger row (booking_id, amount, rate, computed_fee)
    → Insert booking_status_history row
    → Send confirmation email via Resend (async — do not block webhook response)
    → Return 200
```

**Webhook response discipline:** Always return 200 quickly. Offload email sending to a background task (Edge Function or queue) rather than blocking the webhook handler. PayMongo will retry on 5xx.

**Amount calculation (MVP):**

```
subtotal        = Σ(room nights × effective_rate) + Σ(package_item prices)
discount        = promo_code.type = 'percentage'
                  ? subtotal × (promo.value / 100)
                  : promo.value (fixed, capped at subtotal)
net_subtotal    = subtotal - discount
commission      = net_subtotal × property.commission_rate   -- stored on commission_ledger
downpayment     = net_subtotal × property.downpayment_rate  -- default 0.30
customer_pays_now = downpayment
balance_due     = net_subtotal - downpayment               -- stored on bookings
```

All monetary values stored as `numeric(10,2)` in PHP peso. Never store floats for money.

---

### 5.7 Core Tables (minimum schema)

Agents implementing migrations must create these in order. Each table must have RLS enabled immediately — do not defer.

#### `profiles`
- `id uuid PK` → `auth.users.id`
- `email text NOT NULL`
- `first_name text`, `last_name text`, `phone text`, `avatar_url text`
- `role user_role NOT NULL DEFAULT 'customer'` — enum: `customer`, `partner_owner`, `partner_staff`, `admin`
- `locale locale_enum NOT NULL DEFAULT 'en'` — enum: `en`, `fil`
- `partner_id uuid REFERENCES partners(id)` — nullable; populated for `partner_staff` only
- `staff_role staff_role_enum` — nullable enum: `manager`, `front_desk`
- `created_at`, `updated_at`

#### `partners`
- `id uuid PK`
- `owner_id uuid NOT NULL REFERENCES profiles(id)` — the `partner_owner` profile
- `business_name text NOT NULL`, `business_email text`, `business_phone text`
- `status partner_status NOT NULL DEFAULT 'pending'` — enum: `pending`, `approved`, `rejected`, `suspended`
- `rejection_reason text` — nullable
- `commission_rate numeric(5,4) NOT NULL DEFAULT 0.10` — admin-overridable
- `approved_at timestamptz`, `approved_by uuid REFERENCES profiles(id)` — audit trail
- `created_at`, `updated_at`

#### `properties`
- `id uuid PK`
- `partner_id uuid NOT NULL UNIQUE REFERENCES partners(id)` — enforces one property per partner
- `name text NOT NULL`, `slug text NOT NULL UNIQUE`
- `description_en text`, `description_fil text`
- `property_type property_type_enum NOT NULL` — enum: `resort`, `hotel`, `homestay`
- `area_id uuid NOT NULL REFERENCES areas(id)`
- `address text`, `latitude numeric(10,8)`, `longitude numeric(11,8)`
- `check_in_time time NOT NULL DEFAULT '14:00'`, `check_out_time time NOT NULL DEFAULT '12:00'`
- `status property_status NOT NULL DEFAULT 'draft'` — enum: `draft`, `pending_review`, `published`, `suspended`
- `downpayment_rate numeric(5,4) NOT NULL DEFAULT 0.30`
- `featured boolean NOT NULL DEFAULT false`
- `meta_title text`, `meta_description text`
- `deleted_at timestamptz` — soft delete
- `created_at`, `updated_at`

#### `areas`
- `id uuid PK`
- `name_en text NOT NULL`, `name_fil text NOT NULL`
- `slug text NOT NULL UNIQUE`
- `province text NOT NULL DEFAULT 'Quezon'`
- `sort_order integer NOT NULL DEFAULT 0`

#### `bookings`
- `id uuid PK`
- `customer_id uuid NOT NULL REFERENCES profiles(id)`
- `property_id uuid NOT NULL REFERENCES properties(id)`
- `room_type_id uuid NOT NULL REFERENCES room_types(id)`
- `check_in_date date NOT NULL`, `check_out_date date NOT NULL`
- `guests_count integer NOT NULL`
- `nights_count integer NOT NULL GENERATED ALWAYS AS (check_out_date - check_in_date) STORED`
- `subtotal numeric(10,2) NOT NULL`
- `discount_amount numeric(10,2) NOT NULL DEFAULT 0`
- `net_total numeric(10,2) NOT NULL`
- `downpayment_amount numeric(10,2) NOT NULL`
- `balance_due numeric(10,2) NOT NULL`
- `status booking_status NOT NULL DEFAULT 'pending_payment'`
- `promo_code_id uuid REFERENCES promo_codes(id)` — nullable
- `special_requests text`
- `hold_expires_at timestamptz NOT NULL` — set to `now() + interval '15 minutes'` on creation
- `created_at`, `updated_at`

**Required constraints:**
```sql
CHECK (check_out_date > check_in_date)
CHECK (guests_count > 0)
CHECK (downpayment_amount <= net_total)
CHECK (balance_due >= 0)
```

#### Other tables (`room_types`, `rooms`, `room_type_availability`, `rate_plans`, `pricing_rules`, `packages`, `payment_events`)

Implement per domain model in §5.3. See migration comments for required constraints and indexes.

**Required database indexes:**

```sql
-- Properties (search + SEO)
CREATE INDEX idx_properties_area_status_type ON properties(area_id, status, property_type)
  WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_properties_slug ON properties(slug)
  WHERE deleted_at IS NULL;

-- Availability (booking engine hot path)
CREATE UNIQUE INDEX idx_rta_room_type_date ON room_type_availability(room_type_id, date);

-- Bookings (customer history + partner dashboard + cron expiry)
CREATE INDEX idx_bookings_customer ON bookings(customer_id, created_at DESC);
CREATE INDEX idx_bookings_property_status ON bookings(property_id, status, check_in_date);
CREATE INDEX idx_bookings_hold_expiry ON bookings(hold_expires_at)
  WHERE status = 'pending_payment';

-- Payment events (idempotency lookup)
CREATE UNIQUE INDEX idx_payment_events_external_id ON payment_events(external_event_id);

-- Reviews
CREATE UNIQUE INDEX idx_reviews_booking ON reviews(booking_id);

-- Promo codes
CREATE UNIQUE INDEX idx_promo_codes_code ON promo_codes(code);
```

Partial indexes (those with `WHERE` clauses) are smaller and faster than full-table indexes for filtered queries — use them wherever the query has a stable predicate.

---

### 5.8 RLS Policy Patterns

**Helper functions (create before any RLS policies):**

```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION get_my_partner_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT partner_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role::text FROM profiles WHERE id = auth.uid();
$$;
```

Using `SECURITY DEFINER` functions prevents per-row subquery overhead in policy evaluation and keeps policies readable.

**Policy matrix:**

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `profiles` | Own row; admin all | Trigger only (auto-created) | Own row (restricted fields); admin all | None |
| `properties` | Public if `published + not deleted`; partner own (any status); admin all | `partner_owner` (one row; enforced by unique constraint) | Partner own `draft/pending_review`; admin all | Admin only (sets `deleted_at`) |
| `room_types` | Public (for published property); partner own | Partner own | Partner own | Partner own (soft delete via `deleted_at`) |
| `room_type_availability` | Public | Service role / RPC only | Service role / RPC only | None |
| `bookings` | Customer own; partner for their property; admin all | Via `create_booking()` RPC only | Partner + admin (status transitions only — not financial fields) | None |
| `payments` | Customer own booking; partner own property; admin all | Service role (webhook handler) only | Admin only | None |
| `payment_events` | Admin only | Service role only | None | None |
| `reviews` | Public | Customer with `completed` booking (enforced) | None | Admin only |
| `commission_ledger` | Admin; partner (own rows, read-only) | Service role only | None | None |
| `partner_verification_documents` | Admin; owning `partner_owner` only | Partner own | None | None |

**Storage RLS (bucket policies):**

- `property-images`: public read for published properties; partner write to `{partner_id}/` prefix only.
- `verification-docs`: admin read only; partner write own folder (signed URL from Server Action).
- `guest-id-docs`: service role write (via Server Action); admin read only; auto-expiry managed by cron.

**Never expose `service_role` key to the client.** Not in `NEXT_PUBLIC_*` vars, not in client-side code, not in Edge Functions accessible from the browser without auth.

---

### 5.9 API Response Standardisation

All Server Actions and Route Handlers return a consistent shape. Define this type once and use it everywhere:

```typescript
// src/lib/api/response.ts
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; fieldErrors?: Record<string, string[]> } };
```

**Error codes** map to i18n keys (`errors.booking.unavailable`, `errors.promo.expired`, etc.). Never return raw PostgreSQL error messages to the client.

**HTTP status codes for Route Handlers:**

| Scenario | Status |
|----------|--------|
| Success | 200 / 201 |
| Validation error | 400 |
| Unauthenticated | 401 |
| Forbidden (wrong role) | 403 |
| Not found | 404 |
| Conflict (double-book attempt) | 409 |
| Webhook signature invalid | 401 |
| Internal / unexpected | 500 |

---

### 5.10 Pagination, Filtering & Search

**Default:** Offset pagination (20 per page) for MVP — simple to implement and sufficient for the expected dataset size.

**Post-MVP:** Switch to cursor-based pagination for booking history and property lists once the row count grows. Design the API responses now with a `next_cursor` field (can be `null` in MVP) so the frontend contract does not break.

**Search RPC pattern:**

```sql
CREATE OR REPLACE FUNCTION search_properties(
  p_area_id        uuid DEFAULT NULL,
  p_check_in       date DEFAULT NULL,
  p_check_out      date DEFAULT NULL,
  p_guests         integer DEFAULT 1,
  p_property_type  property_type_enum DEFAULT NULL,
  p_max_price      numeric DEFAULT NULL,
  p_amenities      uuid[] DEFAULT NULL,  -- array of amenity IDs
  p_limit          integer DEFAULT 20,
  p_offset         integer DEFAULT 0
)
RETURNS TABLE (
  property_id uuid,
  name text,
  slug text,
  area_name text,
  min_rate numeric,
  avg_rating numeric,
  review_count integer,
  hero_image_url text,
  latitude numeric,
  longitude numeric,
  total_count bigint  -- for pagination UI
)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  -- Join properties, filter availability, compute min_rate from rate_plans
  -- Use total_count via COUNT(*) OVER() window function for pagination metadata
$$;
```

Expose this RPC from a Server Component receiving `searchParams` — never build this query string-side on the client.

**Sorting:** Accept `sort_by: 'price_asc' | 'price_desc' | 'rating' | 'featured'` as an enum parameter to the RPC. Validate with Zod before passing to the RPC — never interpolate sort direction directly into SQL from user input.

---

### 5.11 Supabase File Layout

```
supabase/
├── migrations/              # Numbered: YYYYMMDDHHMMSS_description.sql
│   ├── 20240101000000_create_enums.sql
│   ├── 20240101000001_create_core_tables.sql
│   ├── 20240101000002_create_rls_policies.sql
│   ├── 20240101000003_create_indexes.sql
│   ├── 20240101000004_create_booking_rpc.sql
│   └── 20240101000005_create_triggers.sql
├── seed/
│   ├── areas.sql            # Quezon municipalities
│   └── demo.sql             # Dev/demo only — 5 properties, 2 partners, 1 admin
├── functions/               # Edge Functions (webhook handler optional here vs Route Handler)
└── config.toml
```

---

### 5.12 Migration Rules

1. **One concern per migration** — `create_core_tables`, `create_rls_policies`, `create_booking_rpc` are separate files. Mixing DDL and RLS in one file makes rollback hard to reason about.
2. **Never edit applied migrations** — create a new migration to fix anything. The migration history is an immutable audit trail.
3. **RLS is applied in the same PR as the table** — a table without RLS is a security defect, not a to-do.
4. **Include rollback comments** at the top of every migration:
   ```sql
   -- Migration: create_bookings_table
   -- Down: DROP TABLE bookings CASCADE;
   ```
5. **Regenerate types after any schema change:**
   ```bash
   npx supabase gen types typescript --project-id <id> > src/types/database.types.ts
   ```
   Commit the updated `database.types.ts` in the same PR as the migration — never let types drift from the schema.
6. **Name all enums explicitly** in SQL; never rely on positional ordering. Mirror enum values in TypeScript as `const` objects alongside the generated types.
7. **Add `updated_at` trigger to every table:**
   ```sql
   CREATE TRIGGER set_updated_at
   BEFORE UPDATE ON <table>
   FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
   ```
   Enable the `moddatetime` extension in the initial migration.

---

### 5.13 API & Server Patterns

| Use case | Pattern |
|----------|---------|
| Form mutations (booking, profile update) | Server Actions in `src/actions/` |
| PayMongo webhooks | Route Handler `src/app/api/webhooks/paymongo/route.ts` |
| Complex search (availability + rate join) | Supabase RPC `search_properties()` called from Server Component |
| Booking creation (transactional) | Supabase RPC `create_booking()` — locks inventory, inserts booking atomically |
| File uploads (partner photos, verification docs) | Signed upload URL generated by Server Action; client uploads directly to Storage |
| Admin-only operations | Server Action checks `profile.role === 'admin'` (application layer) + RLS (`is_admin()`) as safety net |
| Promo code validation | Server Action — validate before `create_booking()`, pass `promo_code_id` into RPC |

**Zod validation:** Define schemas in `src/lib/validations/`. A schema must exist before the Server Action is written — not after.

```
src/actions/
├── auth/
│   ├── login.ts
│   ├── register.ts
│   └── register-partner.ts
├── bookings/
│   ├── create-booking.ts      # calls create_booking() RPC
│   └── cancel-booking.ts
├── properties/
│   ├── create-property.ts
│   ├── update-property.ts
│   └── upload-images.ts
├── partner/
│   ├── update-availability.ts
│   └── manage-staff.ts
└── admin/
    ├── approve-partner.ts
    └── suspend-property.ts
```

**Server Action error boundary:** Wrap every Server Action body in try/catch. Return `{ success: false, error: { code, message } }` — never let an unhandled rejection propagate to the client.

---

### 5.14 Rate Limiting & Request Throttling

Rate limiting is a security requirement, not a performance nice-to-have.

**MVP approach (middleware-based):**

- Use **Upstash Redis + `@upstash/ratelimit`** in `src/middleware.ts` — zero-cost tier covers MVP scale.
- If Upstash is not available, apply rate limiting at the Supabase project level for auth endpoints (Supabase Dashboard → Auth → Rate Limits).

**Limits to enforce from day one:**

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /auth/signup` | 5 requests | per IP per 10 min |
| `POST /auth/signin` | 10 requests | per IP per 10 min |
| `POST /api/webhooks/*` | 100 requests | per IP per min (PayMongo IPs only — allowlist) |
| Server Actions (booking create) | 5 requests | per user per min |
| File upload (signed URL generation) | 10 requests | per user per min |

**Why this matters:** Without rate limiting on auth endpoints, brute-force and credential-stuffing attacks are trivial. Booking rate limiting prevents programmatic slot-hoarding.

---

### 5.15 Caching Strategy

| Data | Cache method | TTL | Invalidation |
|------|-------------|-----|--------------|
| Published property lists (home, search) | `unstable_cache` or `fetch` with `revalidate` | 60 seconds | `revalidatePath('/search')` on publish/unpublish |
| Individual property page | `unstable_cache` keyed by `slug` | 60 seconds | `revalidatePath('/properties/[slug]')` on update |
| Area list (navigation, filters) | `unstable_cache` | 3600 seconds | Manual revalidation on area change (rare) |
| User-specific data (bookings, profile) | **Never cache** | — | Always server-render fresh |
| Availability calendar | **No cache** | — | Must be real-time; stale availability causes double-bookings |

**Rule:** If the data depends on the authenticated user or on real-time inventory, do not cache it. Cache only public, low-write content.

---

### 5.16 Background Jobs & Scheduled Tasks

For MVP, implement as Supabase Edge Functions triggered by `pg_cron` or scheduled via Supabase's built-in cron support.

| Job | Trigger | Action |
|-----|---------|--------|
| Expire booking holds | Every 5 minutes | Set `status = 'expired'` where `status = 'pending_payment' AND hold_expires_at < now()`; increment `room_type_availability` |
| Auto-complete stays | Nightly 02:00 PH time | Set `status = 'completed'` where `status = 'checked_in' AND check_out_date < current_date` |
| Guest ID doc expiry | Nightly | Delete guest ID documents where `checkout_date + 30 days < current_date` (PH Data Privacy Act compliance) |

These must be idempotent — running them twice must produce the same result as running them once.

---

### 5.17 Logging & Monitoring

**MVP (structured logging):**

```typescript
// src/lib/logger.ts
export function log(level: 'info' | 'warn' | 'error', event: string, context: Record<string, unknown>) {
  console[level](JSON.stringify({ level, event, ...context, ts: new Date().toISOString() }));
}
```

Log every Server Action invocation (event name, user ID, duration), every webhook received (event type, booking ID, result), and every booking state transition (from, to, booking ID, actor).

**Never log PII** (names, emails, phone numbers, payment card details) in structured logs. Log IDs only.

**Post-MVP:** Sentry (error tracking) + Vercel Analytics or Posthog (product analytics). The structured logging format above makes this migration non-breaking.

**Health check endpoint:**

```typescript
// src/app/api/health/route.ts
export async function GET() {
  // Ping Supabase with a lightweight query
  const { error } = await supabase.from('areas').select('id').limit(1);
  return Response.json({
    status: error ? 'degraded' : 'ok',
    ts: new Date().toISOString(),
  }, { status: error ? 503 : 200 });
}
```

Vercel and uptime monitors can ping `/api/health` to detect DB connectivity issues.

---

### 5.18 Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # Server only — webhooks, admin RPCs, seed scripts

# PayMongo
PAYMONGO_SECRET_KEY=                # Server only
PAYMONGO_WEBHOOK_SECRET=            # Server only — HMAC verification
NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY=    # Used for client-side PayMongo.js (Elements)

# Email
RESEND_API_KEY=                     # Server only

# Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=    # or Mapbox public token

# App
NEXT_PUBLIC_APP_URL=                # e.g. https://dipquezon.com
NEXT_PUBLIC_DEFAULT_LOCALE=en

# Rate limiting (optional MVP — use if Upstash is set up)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Booking hold (configurable without code deploy)
BOOKING_HOLD_MINUTES=15

# Feature flags
FEATURE_FLAG_LOYALTY=false
FEATURE_FLAG_COMPARE=false
```

**Rules:**
- All `SUPABASE_SERVICE_ROLE_KEY`, `PAYMONGO_*`, and `RESEND_*` vars must never appear in `NEXT_PUBLIC_*`. Verify with a lint rule or CI check.
- Provide `.env.example` with every key documented and placeholder values — never commit real secrets.
- Rotate `PAYMONGO_WEBHOOK_SECRET` if it is ever exposed; treat it as a credentials breach.

---

### 5.19 Testing (Backend)

**Required before any booking-flow task is marked done:**

- **`create_booking()` RPC integration tests:** double-booking prevention (concurrent requests for same room type and dates), minimum stay enforcement, expired hold detection, promo code application, correct amount calculation.
- **Webhook handler tests:** valid signature → processes correctly; invalid signature → returns 401 and inserts nothing; duplicate `external_event_id` → returns 200 and changes no state.
- **RLS policy tests:** customer cannot read another customer's bookings; partner cannot read another property's bookings; unauthenticated request returns 0 rows (not an error).

**Tooling:** Vitest + Supabase local (`npx supabase start`). Test files colocated at `src/**/*.test.ts` or under `tests/integration/`.

**Test database state:** Each integration test must create its own seed data and clean up after itself. Never rely on shared mutable state between tests.

**CI gate:** Webhook and booking RPC tests must pass in CI before any PR touching payments, bookings, or RLS policies is merged.

---

### 5.20 Connection Pooling

Supabase provides PgBouncer in **transaction mode** on port 6543 — use this connection string for all server-side Supabase clients in production (Server Actions, Route Handlers, Edge Functions). The direct port (5432) is for migrations only.

In `src/lib/supabase/server.ts`, ensure the client is initialised with the pooler URL, not the direct DB URL:

```typescript
// Use NEXT_PUBLIC_SUPABASE_URL (which routes through Supabase's pooler)
// Do NOT use a raw postgresql:// connection string from server components
```

For Supabase-managed projects this is handled automatically — but document the distinction so no one accidentally uses the direct DB URL in a hot path under load.


---

## 6. Frontend Architecture

### 6.1 Principles

1. **Mobile-first PWA** — design for 375px width first.
2. **Server Components by default** — Client Components only for interactivity.
3. **No mock data in production paths** — remove `src/lib/attractions.ts` mock pattern; use Supabase.
4. **Shared design system** — Tailwind tokens in `globals.css`; UI primitives in `src/components/ui/`.
5. **Accessibility** — WCAG 2.1 AA target; semantic HTML, keyboard nav, focus states.
6. **Performance budget** — LCP < 2.5s on 4G; property images via `next/image` + Supabase CDN transforms.

### 6.2 Route Groups

```
src/app/
├── (public)/                    # No auth required
│   ├── page.tsx                 # Home
│   ├── search/page.tsx          # Search + filters + map
│   ├── properties/[slug]/page.tsx
│   ├── areas/[slug]/page.tsx    # Area landing (SEO)
│   └── layout.tsx
├── (auth)/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── register/partner/page.tsx
│   └── layout.tsx
├── (customer)/                  # Requires customer role
│   ├── account/bookings/page.tsx
│   ├── account/wishlist/page.tsx
│   ├── account/reviews/page.tsx
│   └── layout.tsx               # Auth guard
├── (partner)/                   # Requires partner_owner | partner_staff
│   ├── dashboard/page.tsx
│   ├── property/page.tsx
│   ├── rooms/page.tsx
│   ├── availability/page.tsx
│   ├── rates/page.tsx
│   ├── packages/page.tsx
│   ├── bookings/page.tsx
│   ├── staff/page.tsx
│   └── layout.tsx
├── (admin)/                     # Requires admin role
│   ├── partners/page.tsx
│   ├── properties/page.tsx
│   ├── bookings/page.tsx
│   └── layout.tsx
├── api/webhooks/paymongo/route.ts
├── layout.tsx                   # Root
├── sitemap.ts
└── robots.ts
```

### 6.3 Folder Structure

```
src/
├── app/                         # Routes (above)
├── actions/                     # Server Actions
├── components/
│   ├── ui/                      # Button, Input, Card, Modal…
│   ├── forms/                   # BookingForm, PropertyForm…
│   ├── maps/                    # PropertyMap, SearchMap
│   ├── property/                # PropertyCard, RoomTypeList…
│   └── layout/                  # Header, Footer, Nav
├── hooks/                       # useLocale, useMediaQuery…
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Browser client
│   │   ├── server.ts            # Server Component client
│   │   └── middleware.ts        # Session refresh
│   ├── paymongo/
│   ├── email/
│   ├── i18n/
│   │   ├── config.ts
│   │   └── messages/
│   │       ├── en.json
│   │       └── fil.json
│   └── validations/             # Zod schemas
├── types/
│   ├── database.types.ts        # Generated — do not hand-edit
│   └── index.ts                 # App-level types
└── middleware.ts                # Auth routing + locale
```

### 6.4 Auth Middleware

`src/middleware.ts` must:

1. Refresh Supabase session.
2. Redirect unauthenticated users from `(customer)`, `(partner)`, `(admin)` routes.
3. Redirect wrong roles (e.g. customer hitting `/partner/*`).
4. Redirect `partner` with `status !== approved` to onboarding/pending page.

### 6.5 Data Fetching

| Context | Method |
|---------|--------|
| Public property pages | Server Component + Supabase server client |
| Search | Server Component with URL searchParams; paginate 20/page |
| Mutations | Server Actions with revalidation |
| Real-time (optional) | Supabase Realtime on partner booking dashboard only |

**Caching:** Use `unstable_cache` or Next.js `fetch` cache for published property lists (revalidate 60s). Never cache user-specific booking data.

### 6.6 i18n

- Library: `next-intl` (recommended) or lightweight custom context.
- URL strategy: `/en/...` and `/fil/...` **or** cookie + `Accept-Language` — pick one, default **`/en`** prefix for SEO.
- All copy in JSON message files — **both** `en.json` and `fil.json` updated together.
- Property content: use `description_en` / `description_fil` from DB.

### 6.7 PWA

- `public/manifest.json` — name: DIP, theme color from design tokens.
- `@serwist/next` or `next-pwa` for service worker.
- Offline: cache static assets + show offline fallback page. **Booking requires network.**

### 6.8 SEO

- Dynamic `metadata` per property, area, search.
- JSON-LD `Hotel` / `Resort` schema on property pages.
- `sitemap.ts` — all published properties + areas.
- Canonical URLs, Open Graph images from property hero photo.
- Filipino + English hreflang tags.

### 6.9 Design Tokens (keep from rebuild)

```css
--cream: #FFF8EE;
--ocean: #1E88E5;
--teal: #0E7C7B;
--gold: #F4A93E;
--ink: #1F2A2E;
```

Font: **Geologica** (already in layout). Maintain warm, eco-travel aesthetic adapted for Quezon hospitality.

### 6.10 Feature Flags

```typescript
// src/lib/feature-flags.ts
export const flags = {
  loyalty: process.env.FEATURE_FLAG_LOYALTY === 'true',
  compare: process.env.FEATURE_FLAG_COMPARE === 'true',
} as const;
```

UI for flagged features **must not render** when false. Do not leave dead nav links.

### 6.11 Testing (Frontend)

- **Required:** Playwright smoke tests — home, search, property detail, login.
- **Required:** Component tests for BookingForm validation (Vitest + Testing Library).
- Run before marking any booking flow task done.

---

## 7. Cross-Cutting Rules

### 7.1 Naming Conventions

| Item | Convention | Example |
|------|------------|---------|
| DB tables | snake_case, plural | `room_types` |
| DB columns | snake_case | `check_in_date` |
| TypeScript | camelCase | `checkInDate` |
| React components | PascalCase file + export | `PropertyCard.tsx` |
| Server actions | camelCase verb | `createBooking` |
| Route folders | kebab-case | `register/partner` |
| Enums (TS) | PascalCase type, snake_case values | `BookingStatus.pending_payment` |
| Git branches | `feat/`, `fix/`, `chore/` | `feat/booking-flow` |
| Commits | Conventional Commits | `feat(bookings): add instant book RPC` |

### 7.2 Error Handling

- User-facing errors: i18n keys, never raw DB errors.
- Log server errors with context (Sentry post-MVP; `console.error` + structured log MVP).
- PayMongo/webhook failures: retry-safe, alert admin via email on repeated failure.

### 7.3 Image Standards

- Property photos: WebP, max 2000px wide, stored in Supabase Storage bucket `property-images`.
- RLS on storage: public read for published; partner write own folder `{partner_id}/`.

### 7.4 Security Checklist

- [ ] RLS enabled on every public table
- [ ] Service role key server-only
- [ ] Webhook signature verification
- [ ] Rate limit auth endpoints (middleware or Upstash)
- [ ] Input validation with Zod on all actions
- [ ] Guest ID docs in private bucket — signed URLs only
- [ ] Partner verification docs — admin + owning partner only

### 7.5 PH Data Privacy

- Store only necessary PII; document purpose in privacy policy page.
- Guest ID images: encrypted at rest (Supabase default), auto-expire post-checkout + 30 days (cron post-MVP; manual deletion MVP).
- Provide account deletion request flow (admin manual MVP).

---

## 8. Week Sprint Priority

Execute in this order. Do not start later phases until earlier blockers are done.

| Day | Focus | Deliverable |
|-----|-------|-------------|
| **1** | Schema + Auth + RLS | Migrations applied; roles work; areas seeded |
| **2** | Public browse | Search, filters, property detail, map pin |
| **3** | Booking + PayMongo | Instant book, downpayment, webhook, emails |
| **4** | Partner portal | Property/room/availability/rates CRUD |
| **5** | Customer account | Bookings list, wishlist, promo codes |
| **6** | Admin + reviews + partner approval | Approval queue, review submission |
| **7** | PWA + SEO + polish | Manifest, i18n pass, Playwright smoke, demo seed |

**Daily rule:** Ship a demoable vertical slice each day.

---

## 9. Definition of Done

A task is **done** only when ALL apply:

- [ ] Code follows this guide's patterns
- [ ] Zod validation on inputs
- [ ] RLS policies cover new tables
- [ ] Types regenerated if schema changed
- [ ] EN + FIL strings added for new UI
- [ ] No `any` types without comment justification
- [ ] Lint passes (`npm run lint`)
- [ ] Build passes (`npm run build`)
- [ ] Tests written/updated for booking, auth, or payment changes
- [ ] No secrets committed
- [ ] TBD items not silently decided — documented in TBD registry if unresolved

---

## 10. Anti-Patterns

**Do NOT:**

- Use client-side Supabase mutations for bookings or payments
- Store payment card details (PayMongo handles PCI)
- Hardcode Quezon locations in components (use `areas` table)
- Create duplicate `Attraction` mock types (legacy code — delete during rebuild)
- Build separate REST API server unless this guide is updated
- Skip RLS "for speed" — use service role in tests only
- Implement channel manager sync in MVP
- Add npm dependencies without checking bundle size impact
- Leave `console.log` in production paths
- Mix Bahasa/other locale files — only `en` and `fil`

**Legacy code to remove during rebuild:**

- `src/data/attractions.ts`
- `src/lib/attractions.ts` (mock)
- `src/components/sections/*` (alternate unused UI)
- Duplicate navbars — one layout system only

---

## Appendix A: Demo Seed Requirements

For presentation, seed:

- 5+ properties across 3 areas
- 2 partner accounts (1 approved, 1 pending)
- 1 admin account
- 1 customer with sample booking history
- Sample promo code: `DIPQUEZON10`

Document demo credentials in `.env.example` comments only — not committed real passwords.

---

## Appendix B: Splitting This Guide Later

When ready, split into:

- `docs/BACKEND_AGENT.md` — Sections 5, 5.x, backend parts of 7, 8 (days 1,3,4,6 backend)
- `docs/FRONTEND_AGENT.md` — Sections 6, 6.x, frontend parts of 7, 8 (days 2,5,7)

Until then, **this file is authoritative**.

---

*Last updated: 2026-07-30 — Backend architecture review pass. Update TBD registry when product decisions change.*
