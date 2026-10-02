---
paths:
  - "supabase/**"
  - "src/lib/actions/**"
  - "src/actions/**"
  - "src/app/api/**"
  - "src/lib/supabase/**"
---

# Backend Rules (DIP)

Full detail: `AGENTS.md` §5. This file is the condensed, load-on-touch version — read the linked section if you need the "why," not just the "what."

## Role Model (§5.2)

- `profiles`: `role` enum (`customer|partner_owner|partner_staff|admin`), plus `partner_id` (FK) and `staff_role` (`manager|front_desk`) directly on the row — **no separate `partner_staff` table**.
- `staff_role='manager'`: full partner access except ownership transfer. `front_desk`: check-in, booking view, room assignment only.
- Helper functions `is_admin()`, `get_my_partner_id()`, `get_my_role()` are `SECURITY DEFINER`, `STABLE` — use them in every policy instead of inlining subqueries.
- JWT claims (`role`, `partner_id`) are for fast middleware routing only. **RLS always re-validates against `profiles`** — JWT is convenience, not authority.

## Booking State Machine (§5.4)

```
pending_payment → confirmed → checked_in → checked_out
       ↓              ↓            ↓
   expired        cancelled    cancelled (partner/admin only)
       ↓              ↓
                  refund_pending → refunded
```

- `pending_payment`: inventory held for 15 minutes via `hold_expires_at` (counts against rooms left until it lapses). A job only relabels lapsed holds to `expired`; never expire client-side.
- `confirmed`: set only from a verified `payment.paid` webhook. Never from the client.
- Every transition writes a `booking_status_history` row (`from_status`, `to_status`, `changed_by`) — append-only, no UPDATE via RLS.
- Enforce valid transitions **inside the RPC**, not just the UI — an invalid transition throws a DB error.
- Reviews gated to `checked_out` status in RLS, not app code.

## Concurrency & Availability (§5.5)

Two layers, both required: `room_type_availability(room_type_id, date, available_count)` for quantity, `rooms.status` (`available|occupied|maintenance`) for physical units.

`room_type_availability.available_count` is the partner's allotment (default `total_inventory`), never decremented. Rooms left = allotment − active bookings, computed by `stay_nights()`.

Inside `create_booking()` RPC, always in one transaction:
```sql
PERFORM 1 FROM room_types WHERE id = p_room_type_id FOR UPDATE;  -- serialize per room type
-- re-quote via quote_stay()/stay_nights(); RAISE reason code (SOLD_OUT, MIN_STAY_NOT_MET, ...) if not bookable
-- insert booking + booking_status_history
```
Use `FOR UPDATE` row locks, not optimistic locking — the double-booking window is real on peak weekends.

Price per night: `price_override` if set, else `base_price` + top-priority active `pricing_rules.price_modifier` + `rate_plans.price_modifier`. Minimum stay: override → top-priority rule with `minimum_stay` → rate plan → 1.

## Payments (§5.6)

```
BookingForm → Server Action (Zod + promo check) → create_booking() RPC (transaction,
  FOR UPDATE lock → re-quote + validate → insert booking pending_payment →
  insert booking_status_history) → PayMongo Payment Intent (downpayment) →
  { bookingId, paymentUrl } → client redirects to PayMongo checkout

Webhook POST /api/webhooks/paymongo:
  verify HMAC (reject 401 if invalid) → idempotent upsert into payment_events
  (unique on external_event_id) → if already processed, return 200 immediately →
  update booking → confirmed → insert payments row → insert commission_ledger row
  (rate from partner.commission_rate) → insert booking_status_history →
  send confirmation email async (never block webhook response) → return 200
```

Amount calc:
```
subtotal   = Σ(room nights × effective_rate) + Σ(package_item prices)
discount   = percentage ? subtotal × (value/100) : min(value, subtotal)  -- capped by maximum_discount if set
net        = subtotal - discount
commission = net × partner.commission_rate
downpayment = net × property.downpayment_rate  -- default 0.30
balance_due = net - downpayment
```
All money as `numeric(10,2)` PHP peso. Never floats.

## API Response Shape (§5.9)

```typescript
// src/lib/api/response.ts
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; fieldErrors?: Record<string, string[]> } };
```
Error codes map to i18n keys (`errors.booking.unavailable`). Never surface raw Postgres errors.

HTTP status: 200/201 success, 400 validation, 401 unauthenticated/bad webhook signature, 403 wrong role, 404 not found, 409 double-book conflict, 500 unexpected.

## Migrations (§5.12)

- One concern per migration file (`create_core_tables`, `create_rls_policies`, `create_booking_rpc` — separate).
- Never edit an applied migration — new migration to fix anything.
- RLS ships in the same PR as the table it protects.
- Include a `-- Down:` rollback comment at the top of every migration.
- Regenerate `database.types.ts` after any schema change.

## Client Separation

Three distinct Supabase clients: browser (anon, RLS-scoped), server (anon + session cookie, RLS-scoped), admin (service role, server-only, never imported into client bundles). Mixing them is a security defect, not a style issue.