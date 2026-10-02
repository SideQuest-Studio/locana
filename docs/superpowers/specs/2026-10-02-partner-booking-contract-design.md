# Partner Lockdown + Booking Contract — Design

Date: 2026-10-02 · Branch: `partner-booking-contract` · Status: approved in conversation

## Goal

Make the partner side the single source of truth for inventory, pricing and booking rules, exposed as a small set of database RPCs the customer UI can call later, and close the security holes found in the 2026-10-02 audit.

Success means:
- A booking created through the contract respects every partner setting (allotment, overrides, rules, rate plans, min-stay, closed-to-arrival/departure, capacity, approval/publish status) and cannot overbook under concurrency.
- The partner bookings list shows real guests' bookings with the same reference the guest sees.
- No partner action can read or mutate another partner's data, and no table in `public` is readable/writable by anon without a policy.

## Locked decisions (from brainstorming)

| Topic | Decision |
|---|---|
| Scope | Lockdown + contract + partner bookings fixes. PayMongo, promos, search "from" price, customer UI: out of scope. |
| Nightly price | `price_override` if set (replaces everything) else `base_price + top-priority active pricing_rule.price_modifier + rate_plan.price_modifier`. Modifiers are absolute ₱/night. |
| Minimum stay | Most specific non-null wins: override → top-priority rule → rate plan → 1. Evaluated on the arrival night. |
| Inventory | Derived. `room_type_availability.available_count` = partner allotment (default `total_inventory`). Rooms left = allotment − active bookings covering the night. Active = `confirmed`, `checked_in`, or `pending_payment` with `hold_expires_at > now()`. Concurrency: `SELECT … FOR UPDATE` on the `room_types` row. |
| `/api/bookings` POST | Becomes a thin wrapper over `create_booking`, same response shape. |
| Hosted DB | Untouched. Migrations verified locally; push is the user's call. |

## Contract (public RPCs)

- `quote_stay(p_room_type_id, p_rate_plan_id, p_check_in, p_check_out, p_adults, p_children) → jsonb` — anon + authenticated.
- `get_property_offers(p_property_id, p_check_in, p_check_out, p_adults, p_children) → jsonb` — anon + authenticated; one quote per room type × rate plan (rate plan null when a room type has none).
- `create_booking(p_room_type_id, p_rate_plan_id, p_check_in, p_check_out, p_adults, p_children, p_special_requests) → jsonb` — authenticated only.

Quote shape: `{ bookable, reason, room_type_id, rate_plan_id, check_in, check_out, nights, nightly: [{date, price, rooms_left}], subtotal, downpayment_rate, downpayment, balance, minimum_stay }`.

Reason codes (also raised as exception messages by `create_booking`): `UNAUTHENTICATED`, `PROPERTY_UNAVAILABLE`, `RATE_PLAN_INVALID`, `INVALID_DATES`, `MIN_STAY_NOT_MET`, `CLOSED_TO_ARRIVAL`, `CLOSED_TO_DEPARTURE`, `OVER_CAPACITY`, `SOLD_OUT`. Mapped in `src/lib/api/db-errors.ts`.

Validation: check-in ≥ today (Asia/Manila), check-out > check-in, ≤ 30 nights, adults ≥ 1, adults ≤ `max_adults`, children ≤ `max_children`, adults+children ≤ `capacity`. Visible = partner `approved` AND property `published`.

Internal: `stay_nights(room_type, rate_plan, check_in, check_out)` returns per-night price/allotment/booked/rooms_left/flags/min-stay. Used by quote, create_booking, and partner calendar. Not granted to anon.

## Schema additions (`bookings`)

- `reference text unique not null` default `'DIP-' || upper(substr(md5(gen_random_uuid()::text),1,8))`, backfilled.
- `rate_plan_id uuid null references rate_plans(id) on delete set null`.
- `special_requests text null`.

## Lockdown

- `requirePartner()` (`src/lib/auth/partner-guard.ts`): session + approved partner → `{ userId, partnerId, propertyId }`. Called first in every partner action.
- Partner actions use the session client; partner id never accepted from the client. Admin client only for storage, after the guard.
- Existing partner policies additionally require `is_approved_partner()`. Storage `property-images` writes scoped to the partner's own property folder.
- RLS enabled + policies on the 21 uncovered tables (grouping per conversation: public reference, property-linked, booking children, money, server-only, audit, guest IDs, promos, reviews, loyalty).
- Audit triggers on `properties`, `room_types`, `rate_plans`, `pricing_rules`, `room_type_availability`, `partners` write `audit_logs` (actor = `auth.uid()`, before/after). Manual audit inserts in `approve-partner.ts` removed.
- `get_partner_dashboard_stats` derives the caller's partner.

## Partner bookings fixes

- `get_partner_bookings` / `_stats` → `SECURITY DEFINER`, caller-derived partner, return `reference`, search by reference, exclude expired holds; today's-bookings counts only `confirmed`/`checked_in`.
- `partner_assign_rooms` rejects maintenance rooms and rooms assigned to another active booking with overlapping dates; assignment no longer flips status. Check-in sets `occupied`; check-out/cancel release.
- `get_partner_booking_detail` guest payload limited to name/email/phone/avatar.
- Calendar shows booked / rooms left; dashboard home uses real data; `mock-data.ts` removed.

## Testing

pgTAP in `supabase/tests/`, local Supabase via Docker, written before each function. Then `npm ci`, lint, build, and a manual pass through every partner page plus one end-to-end booking.

## Out of scope / known gaps

PayMongo + hold-expiry status job, promo codes, i18n infrastructure (codes returned, English fallback messages), search page visibility filter, customer bookings page status badge.
