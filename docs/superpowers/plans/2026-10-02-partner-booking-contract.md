# Partner Lockdown + Booking Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make partner data the single source of truth for inventory/pricing/booking rules behind RPCs the customer side can call, and close the partner-side security holes from the 2026-10-02 audit.

**Architecture:** Postgres owns the rules: one internal `stay_nights()` calculation feeds `quote_stay`, `get_property_offers`, `create_booking` and the partner calendar. Inventory is derived (allotment − active bookings) and serialized with a `FOR UPDATE` lock on the `room_types` row. Partner server actions switch from the service-role client to the session client so RLS (tightened to approved partners, owner/manager for config) is the enforcement boundary.

**Tech Stack:** Supabase Postgres 17 (plpgsql, RLS, pgTAP), Next.js 16 server actions, `@supabase/ssr`, Zod 3.

**Spec:** `docs/superpowers/specs/2026-10-02-partner-booking-contract-design.md`

## Global Constraints

- Nightly price = `price_override` if set, else `base_price + top-priority active rule price_modifier + rate_plan price_modifier` (₱ absolute).
- Minimum stay = override → top-priority rule with non-null `minimum_stay` → rate plan → 1, evaluated on the arrival night.
- Active booking = `confirmed`, `checked_in`, or `pending_payment` with `hold_expires_at > now()`. Hold = 15 minutes.
- Visible property = partner `approved` AND property `published` AND `deleted_at IS NULL`.
- "Today" = `(now() AT TIME ZONE 'Asia/Manila')::date`. Max stay 30 nights.
- `can manage` = approved partner AND (`partner_owner` OR `partner_staff` with `staff_role='manager'`). `front_desk` = read + check-in/out + room assignment only.
- Every new `SECURITY DEFINER` function: `SET search_path = public`, `REVOKE ALL … FROM PUBLIC`, explicit `GRANT`.
- Every migration: one concern, `-- Down:` comment at top, never edit applied migrations.
- Actions return `ActionResult<T>`; never concatenate `error.message` into client-facing messages.
- Hosted Supabase is never touched; all verification is local.

## Review Focus

1. **Booking spanning a partner calendar edit** — partner lowers allotment below already-booked count: existing bookings stay, `rooms_left` floors at 0, no new bookings. Test in Task 4.
2. **Pricing rule that sets only minimum stay** (null `price_modifier`) outranking a surge rule — price must come from the surge rule, min-stay from the min-stay rule. Test in Task 4.
3. **Room assigned to two bookings on overlapping dates** — second assignment rejected; non-overlapping allowed. Test in Task 7.
4. **Staff `front_desk` calling config actions or cancel** — rejected by RLS and by `partner_cancel_booking`. Test in Tasks 3 and 7.
5. **Expired hold still listed as pending** — partner list shows effective status `expired`, stats exclude it, inventory freed. Test in Tasks 4 and 7.

---

## File Map

**Migrations (new, `supabase/migrations/`):**
| File | Concern |
|---|---|
| `20261002100000_booking_contract_columns.sql` | `bookings.reference/rate_plan_id/special_requests`, indexes |
| `20261002100100_partner_access_policies.sql` | access helpers; tightened policies on properties, room_types, rooms, availability, rate_plans, pricing_rules, property_images, storage |
| `20261002100200_lock_down_definer_rpcs.sql` | fix/revoke unsafe `SECURITY DEFINER` RPCs; dashboard stats v2 |
| `20261002100300_rls_remaining_tables.sql` | RLS on the 21 uncovered tables |
| `20261002100400_audit_log_triggers.sql` | audit triggers |
| `20261002100500_stay_pricing_functions.sql` | `stay_nights`, `quote_stay`, `get_property_offers`, `get_partner_room_calendar` |
| `20261002100600_create_booking_rpc.sql` | `create_booking` |
| `20261002100700_partner_bookings_rpcs_v2.sql` | list/stats SECURITY DEFINER, reference, effective status |
| `20261002100800_partner_room_assignment_fixes.sql` | assign/unassign/check-in/out/cancel/detail fixes |

**Tests (new, `supabase/tests/`):** `fixtures.psql` (shared seed, `\ir`-included), `01_access_rls.test.sql`, `02_stay_pricing.test.sql`, `03_create_booking.test.sql`, `04_partner_bookings.test.sql`, `05_audit.test.sql`, `concurrency/last_room.sh`.

**App (modify):** `src/actions/partner/{property,rooms,rates,availability}.ts`, `src/app/api/bookings/route.ts`, `src/app/(partner)/dashboard/page.tsx`, `src/app/(partner)/dashboard/bookings/page.tsx`, `src/components/partner/bookings/BookingsPageContent.tsx`, `src/components/partner/{property-management,rooms/rooms-management,rates/rates-management,availability/availability-calendar}.tsx`, `src/types/database.types.ts`.
**App (create):** `src/lib/auth/partner-guard.ts`, `src/lib/api/db-errors.ts`.
**App (delete):** `src/actions/partner/{update-property,add-room}.ts`, `src/components/partner/{property-form,add-room-form,room-type-form}.tsx`, `src/lib/dashboard/mock-data.ts` (after dashboard rewire).
**Docs:** `dip_schema_v3.dbml`, `CLAUDE.md` rule 3, `AGENTS.md` §5.4/§5.5, `.claude/rules/backend.md`.

---

### Task 1: Local DB harness + test fixtures

**Files:** Create `supabase/tests/fixtures.psql`, `supabase/tests/00_harness.test.sql`.

**Interfaces — Produces** (fixture ids, all fixed UUIDs, used by every later test):
- users: `a0000000-0000-0000-0000-00000000000a` owner A, `…0aa` front-desk A, `…00b` owner B, `…00c` owner C (pending), `…0c1` customer X, `…0c2` customer Y
- partners `p…a/b/c`; properties `d…a` (A, published), `d…b` (B, published), `d…c` (C, published but partner pending)
- room types `e…a1` (A: base 3000, inventory 2, capacity 3, max_adults 2, max_children 1), `e…b1` (B: base 2000, inventory 1)
- rate plan `f…a1` (on `e…a1`, +500, breakfast), `f…b1` (on `e…b1`)
- rooms `9…a1`, `9…a2` (type `e…a1`), `9…a3` maintenance
- psql vars: `:d0` = current_date + 30 (a Wednesday-agnostic base date)
- helper: `SELECT tests_login('<uuid>')` / `tests_logout()` set `request.jwt.claims` and role.

- [ ] **Step 1:** Start stack: `npx -y supabase@2 start` (Docker running). Then `npx supabase@2 db reset` to apply all migrations from scratch. Expected: all existing migrations apply. If any fails, stop and report — do not edit applied migrations.
- [ ] **Step 2:** Check table privileges match hosted behaviour: `docker exec supabase_db_DIP psql -U postgres -c "select has_table_privilege('anon','public.bookings','select')"`. If `f`, the local default differs from the (older) hosted project; set `auto_expose_new_tables = true` under `[api]` in `supabase/config.toml` and reset again so tests reflect hosted grants.
- [ ] **Step 3:** Write `fixtures.psql` (runs as `postgres` inside the test transaction):

```sql
SET LOCAL session_replication_role = replica; -- bypass profile guard + auth triggers for seeding

CREATE OR REPLACE FUNCTION pg_temp.tests_login(p_uid uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END $$;
CREATE OR REPLACE FUNCTION pg_temp.tests_anon() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  EXECUTE 'SET LOCAL ROLE anon';
END $$;
CREATE OR REPLACE FUNCTION pg_temp.tests_logout() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', '', true);
END $$;

INSERT INTO auth.users (id, email, aud, role) VALUES
 ('a0000000-0000-0000-0000-00000000000a','owner-a@test.dip','authenticated','authenticated'),
 ('a0000000-0000-0000-0000-0000000000aa','desk-a@test.dip','authenticated','authenticated'),
 ('a0000000-0000-0000-0000-00000000000b','owner-b@test.dip','authenticated','authenticated'),
 ('a0000000-0000-0000-0000-00000000000c','owner-c@test.dip','authenticated','authenticated'),
 ('a0000000-0000-0000-0000-0000000000c1','cust-x@test.dip','authenticated','authenticated'),
 ('a0000000-0000-0000-0000-0000000000c2','cust-y@test.dip','authenticated','authenticated');

INSERT INTO public.partners (id, owner_id, business_name, status) VALUES
 ('b0000000-0000-0000-0000-00000000000a','a0000000-0000-0000-0000-00000000000a','Resort A','approved'),
 ('b0000000-0000-0000-0000-00000000000b','a0000000-0000-0000-0000-00000000000b','Resort B','approved'),
 ('b0000000-0000-0000-0000-00000000000c','a0000000-0000-0000-0000-00000000000c','Resort C','pending');

INSERT INTO public.profiles (id, email, first_name, last_name, role, partner_id, staff_role) VALUES
 ('a0000000-0000-0000-0000-00000000000a','owner-a@test.dip','Ana','Owner','partner_owner','b0000000-0000-0000-0000-00000000000a',NULL),
 ('a0000000-0000-0000-0000-0000000000aa','desk-a@test.dip','Dan','Desk','partner_staff','b0000000-0000-0000-0000-00000000000a','front_desk'),
 ('a0000000-0000-0000-0000-00000000000b','owner-b@test.dip','Ben','Owner','partner_owner','b0000000-0000-0000-0000-00000000000b',NULL),
 ('a0000000-0000-0000-0000-00000000000c','owner-c@test.dip','Cy','Owner','partner_owner','b0000000-0000-0000-0000-00000000000c',NULL),
 ('a0000000-0000-0000-0000-0000000000c1','cust-x@test.dip','Xia','Guest','customer',NULL,NULL),
 ('a0000000-0000-0000-0000-0000000000c2','cust-y@test.dip','Yul','Guest','customer',NULL,NULL);

INSERT INTO public.areas (id, name_en, name_fil, slug) VALUES
 ('c0000000-0000-0000-0000-000000000001','Test Town','Test Bayan','test-town')
ON CONFLICT DO NOTHING;

INSERT INTO public.properties (id, partner_id, area_id, name, slug, property_type, status) VALUES
 ('d0000000-0000-0000-0000-00000000000a','b0000000-0000-0000-0000-00000000000a','c0000000-0000-0000-0000-000000000001','Resort A','test-resort-a','resort','published'),
 ('d0000000-0000-0000-0000-00000000000b','b0000000-0000-0000-0000-00000000000b','c0000000-0000-0000-0000-000000000001','Resort B','test-resort-b','resort','published'),
 ('d0000000-0000-0000-0000-00000000000c','b0000000-0000-0000-0000-00000000000c','c0000000-0000-0000-0000-000000000001','Resort C','test-resort-c','resort','published');

INSERT INTO public.room_types (id, property_id, name_en, capacity, max_adults, max_children, base_price, total_inventory) VALUES
 ('e0000000-0000-0000-0000-0000000000a1','d0000000-0000-0000-0000-00000000000a','Garden Room',3,2,1,3000,2),
 ('e0000000-0000-0000-0000-0000000000b1','d0000000-0000-0000-0000-00000000000b','Beach Hut',2,2,0,2000,1),
 ('e0000000-0000-0000-0000-0000000000c1','d0000000-0000-0000-0000-00000000000c','Hidden Room',2,2,0,1000,1);

INSERT INTO public.rate_plans (id, room_type_id, name_en, price_modifier, includes_breakfast) VALUES
 ('f0000000-0000-0000-0000-0000000000a1','e0000000-0000-0000-0000-0000000000a1','With Breakfast',500,true),
 ('f0000000-0000-0000-0000-0000000000b1','e0000000-0000-0000-0000-0000000000b1','Room Only',0,false);

INSERT INTO public.rooms (id, room_type_id, room_number, status) VALUES
 ('90000000-0000-0000-0000-0000000000a1','e0000000-0000-0000-0000-0000000000a1','101','available'),
 ('90000000-0000-0000-0000-0000000000a2','e0000000-0000-0000-0000-0000000000a1','102','available'),
 ('90000000-0000-0000-0000-0000000000a3','e0000000-0000-0000-0000-0000000000a1','103','maintenance'),
 ('90000000-0000-0000-0000-0000000000b1','e0000000-0000-0000-0000-0000000000b1','B1','available');

SET LOCAL session_replication_role = origin;
SELECT (current_date + 30) AS d0 \gset
```

- [ ] **Step 4:** Write `00_harness.test.sql` proving the harness works:

```sql
BEGIN;
\ir fixtures.psql
SELECT plan(2);
SELECT pg_temp.tests_login('a0000000-0000-0000-0000-0000000000c1');
SELECT is(auth.uid(), 'a0000000-0000-0000-0000-0000000000c1'::uuid, 'login sets auth.uid()');
SELECT pg_temp.tests_logout();
SELECT is((SELECT count(*)::int FROM public.room_types WHERE id::text LIKE 'e0000000%'), 3, 'fixtures seeded');
SELECT * FROM finish();
ROLLBACK;
```

- [ ] **Step 5:** Run `npx supabase@2 test db`. Expected: `00_harness … ok`. If `\ir` is unsupported by the runner, inline `fixtures.psql` via a `supabase/tests/run.sh` that concatenates fixture + test into a temp file and runs `pg_prove` inside the db container; record which approach works in the file header.
- [ ] **Step 6:** Commit `test: add local pgTAP harness and partner fixtures`.

---

### Task 2: Booking contract columns

**Files:** Create `supabase/migrations/20261002100000_booking_contract_columns.sql`; Modify `dip_schema_v3.dbml` (Table bookings), `src/types/database.types.ts` (`Booking`).

**Interfaces — Produces:** `bookings.reference text not null unique` (`DIP-XXXXXXXX`), `bookings.rate_plan_id uuid null`, `bookings.special_requests text null`.

- [ ] **Step 1: Failing test** — append to a new `supabase/tests/01_access_rls.test.sql` header block (file grows in Task 3):

```sql
BEGIN;
\ir fixtures.psql
SELECT plan(3);
SELECT has_column('public','bookings','reference','bookings.reference exists');
SELECT col_is_unique('public','bookings','reference','reference unique');
SELECT has_column('public','bookings','rate_plan_id','bookings.rate_plan_id exists');
SELECT * FROM finish();
ROLLBACK;
```

- [ ] **Step 2:** `npx supabase@2 test db` → FAIL (column missing).
- [ ] **Step 3: Migration:**

```sql
-- Migration: booking_contract_columns
-- Down:
--   ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_reference_key;
--   ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_dates_check;
--   DROP INDEX IF EXISTS bookings_room_type_dates_idx, booking_rooms_room_id_idx, booking_rooms_booking_id_idx;
--   ALTER TABLE public.bookings DROP COLUMN IF EXISTS reference, DROP COLUMN IF EXISTS rate_plan_id, DROP COLUMN IF EXISTS special_requests;

ALTER TABLE public.bookings
  ADD COLUMN reference text,
  ADD COLUMN rate_plan_id uuid REFERENCES public.rate_plans(id) ON DELETE SET NULL,
  ADD COLUMN special_requests text;

-- Keep the reference customers already saw (DIP- + first 8 hex of id).
UPDATE public.bookings
SET reference = 'DIP-' || upper(left(replace(id::text, '-', ''), 8))
WHERE reference IS NULL;

ALTER TABLE public.bookings
  ALTER COLUMN reference SET DEFAULT ('DIP-' || upper(substr(md5(gen_random_uuid()::text), 1, 8))),
  ALTER COLUMN reference SET NOT NULL,
  ADD CONSTRAINT bookings_reference_key UNIQUE (reference),
  ADD CONSTRAINT bookings_dates_check CHECK (check_out > check_in) NOT VALID;

CREATE INDEX IF NOT EXISTS bookings_room_type_dates_idx ON public.bookings (room_type_id, check_in, check_out);
CREATE INDEX IF NOT EXISTS booking_rooms_room_id_idx ON public.booking_rooms (room_id);
CREATE INDEX IF NOT EXISTS booking_rooms_booking_id_idx ON public.booking_rooms (booking_id);
```

- [ ] **Step 4:** `npx supabase@2 db reset && npx supabase@2 test db` → PASS.
- [ ] **Step 5:** dbml — in `Table bookings` add after `room_type_id`: `rate_plan_id uuid [ref: > rate_plans.id, note: 'Plan booked; null if room type has none']`, after `id`: `reference varchar [not null, unique, note: 'DIP-XXXXXXXX, shown to guest and partner']`, after `children_count`: `special_requests text`. `database.types.ts` `Booking`: add `reference: string; rate_plan_id: string | null; special_requests: string | null;`.
- [ ] **Step 6:** Commit `feat(db): add booking reference, rate plan and special requests`.

---

### Task 3: Partner access helpers, tightened policies, unsafe RPCs, remaining RLS

**Files:** Create migrations `…100100_partner_access_policies.sql`, `…100200_lock_down_definer_rpcs.sql`, `…100300_rls_remaining_tables.sql`; extend `supabase/tests/01_access_rls.test.sql`.

**Interfaces — Produces (SQL):** `can_manage_partner() → boolean`, `owns_property(uuid) → boolean`, `owns_room_type(uuid) → boolean`, `is_property_public(uuid) → boolean`, `partner_owns_booking(uuid) → boolean`; `save_property_details_rpc(p_name text, p_property_type text, p_area_id uuid, p_description_en text, p_description_fil text, p_address text, p_latitude numeric, p_longitude numeric, p_check_in_time time, p_check_out_time time, p_early_checkin_fee numeric, p_late_checkout_fee numeric, p_downpayment_rate numeric, p_amenity_ids uuid[]) → uuid` (no partner param); `get_partner_dashboard_stats() → table(total_listings bigint, today_bookings bigint, pending_checkins bigint, avg_rating numeric)`.

- [ ] **Step 1: Failing tests** — replace `01_access_rls.test.sql` plan with `plan(24)` and add:

```sql
-- partner A cannot touch partner B
SELECT pg_temp.tests_login('a0000000-0000-0000-0000-00000000000a');
SELECT is((SELECT count(*)::int FROM public.rooms WHERE room_type_id='e0000000-0000-0000-0000-0000000000b1'), 0, 'A cannot read B rooms');
UPDATE public.room_types SET base_price = 1 WHERE id = 'e0000000-0000-0000-0000-0000000000b1';
SELECT pg_temp.tests_logout();
SELECT is((SELECT base_price FROM public.room_types WHERE id='e0000000-0000-0000-0000-0000000000b1'), 2000.00::numeric, 'A cannot update B room type');
SELECT pg_temp.tests_login('a0000000-0000-0000-0000-00000000000a');
SELECT throws_ok($$INSERT INTO public.rate_plans (room_type_id, name_en) VALUES ('e0000000-0000-0000-0000-0000000000b1','Hack')$$, '42501', NULL, 'A cannot add rate plan to B');
SELECT throws_ok($$INSERT INTO public.room_type_availability (room_type_id, date, available_count) VALUES ('e0000000-0000-0000-0000-0000000000b1', current_date + 5, 0)$$, '42501', NULL, 'A cannot block B dates');
SELECT lives_ok($$UPDATE public.rate_plans SET price_modifier = 600 WHERE id = 'f0000000-0000-0000-0000-0000000000a1'$$, 'A can edit own rate plan');
SELECT lives_ok($$DELETE FROM public.rooms WHERE id = '90000000-0000-0000-0000-0000000000a3'$$, 'A can delete own room unit');
SELECT pg_temp.tests_logout();
-- front desk is read-only for config
SELECT pg_temp.tests_login('a0000000-0000-0000-0000-0000000000aa');
SELECT is((SELECT count(*)::int FROM public.room_types WHERE id='e0000000-0000-0000-0000-0000000000a1'), 1, 'front desk can read own room type');
UPDATE public.rate_plans SET price_modifier = 1 WHERE id = 'f0000000-0000-0000-0000-0000000000a1';
SELECT pg_temp.tests_logout();
SELECT is((SELECT price_modifier FROM public.rate_plans WHERE id='f0000000-0000-0000-0000-0000000000a1'), 600.00::numeric, 'front desk cannot edit rate plan');
-- pending partner C cannot write
SELECT pg_temp.tests_login('a0000000-0000-0000-0000-00000000000c');
SELECT throws_ok($$INSERT INTO public.room_types (property_id, name_en, base_price) VALUES ('d0000000-0000-0000-0000-00000000000c','x',1)$$, '42501', NULL, 'pending partner cannot add room types');
SELECT pg_temp.tests_logout();
-- public visibility
SELECT pg_temp.tests_anon();
SELECT is((SELECT count(*)::int FROM public.properties WHERE id='d0000000-0000-0000-0000-00000000000c'), 0, 'pending partner property hidden from public');
SELECT is((SELECT count(*)::int FROM public.properties WHERE id='d0000000-0000-0000-0000-00000000000a'), 1, 'approved published property visible');
SELECT is((SELECT count(*)::int FROM public.rooms), 0, 'anon cannot list room units');
SELECT is((SELECT count(*)::int FROM public.payments), 0, 'anon cannot read payments');
SELECT is((SELECT count(*)::int FROM public.audit_logs), 0, 'anon cannot read audit logs');
SELECT is((SELECT count(*)::int FROM public.payment_events), 0, 'anon cannot read payment events');
SELECT throws_ok($$INSERT INTO public.audit_logs (action, entity_type, entity_id) VALUES ('create','x',gen_random_uuid())$$, '42501', NULL, 'anon cannot write audit logs');
SELECT throws_ok($$SELECT public.update_user_role('a0000000-0000-0000-0000-0000000000c1','admin')$$, '42501', NULL, 'anon cannot call update_user_role');
SELECT throws_ok($$SELECT public.bulk_upsert_availability_rpc('e0000000-0000-0000-0000-0000000000a1', current_date, current_date, 0, NULL, NULL, false, false)$$, '42501', NULL, 'anon cannot bulk edit availability');
SELECT pg_temp.tests_logout();
-- customer cannot use partner RPC on someone else's property
SELECT pg_temp.tests_login('a0000000-0000-0000-0000-0000000000c1');
SELECT throws_ok($$SELECT public.save_property_details_rpc('Hijack','resort','c0000000-0000-0000-0000-000000000001','descr long','descr long','addr', NULL, NULL, '14:00','12:00',0,0,0.3, ARRAY[]::uuid[])$$, 'FORBIDDEN', 'customer cannot save property');
SELECT is((SELECT count(*)::int FROM public.guest_id_documents), 0, 'customer sees no foreign guest IDs');
SELECT pg_temp.tests_logout();
SELECT is((SELECT count(*)::int FROM (SELECT tablename FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity) t), 0, 'every public table has RLS');
```

- [ ] **Step 2:** Run → FAIL on most assertions.
- [ ] **Step 3: `…100100_partner_access_policies.sql`:**

```sql
-- Migration: partner_access_policies
-- Down: drop the policies created below, recreate those from 20260810123000, 20260812200000,
--       20260812210000, 20260812220000, 20260814100000, 20260815120000, 20260816100000;
--       DROP FUNCTION can_manage_partner(), owns_property(uuid), owns_room_type(uuid),
--       is_property_public(uuid), partner_owns_booking(uuid).

CREATE OR REPLACE FUNCTION public.can_manage_partner()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p JOIN public.partners pt ON pt.id = p.partner_id
    WHERE p.id = auth.uid() AND pt.status = 'approved'
      AND (p.role = 'partner_owner' OR (p.role = 'partner_staff' AND p.staff_role = 'manager'))
  );
$$;

CREATE OR REPLACE FUNCTION public.owns_property(p_property_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_approved_partner() AND EXISTS (
    SELECT 1 FROM public.properties pr
    WHERE pr.id = p_property_id AND pr.partner_id = public.get_my_partner_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.owns_room_type(p_room_type_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_approved_partner() AND EXISTS (
    SELECT 1 FROM public.room_types rt JOIN public.properties pr ON pr.id = rt.property_id
    WHERE rt.id = p_room_type_id AND pr.partner_id = public.get_my_partner_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_property_public(p_property_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.properties pr JOIN public.partners pt ON pt.id = pr.partner_id
    WHERE pr.id = p_property_id AND pt.status = 'approved'
      AND pr.status = 'published' AND pr.deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.partner_owns_booking(p_booking_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_approved_partner() AND EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.room_types rt ON rt.id = b.room_type_id
    JOIN public.properties pr ON pr.id = rt.property_id
    WHERE b.id = p_booking_id AND pr.partner_id = public.get_my_partner_id()
  );
$$;

REVOKE ALL ON FUNCTION public.can_manage_partner(), public.owns_property(uuid), public.owns_room_type(uuid),
  public.is_property_public(uuid), public.partner_owns_booking(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_partner(), public.owns_property(uuid), public.owns_room_type(uuid),
  public.is_property_public(uuid), public.partner_owns_booking(uuid) TO anon, authenticated;

-- properties
DROP POLICY IF EXISTS "partner_update_own_property" ON public.properties;
DROP POLICY IF EXISTS "partner_insert_own_property" ON public.properties;
DROP POLICY IF EXISTS "public_select_properties" ON public.properties;
CREATE POLICY properties_select ON public.properties FOR SELECT
  USING (public.is_property_public(id) OR public.owns_property(id) OR public.is_admin());
CREATE POLICY properties_manage ON public.properties FOR ALL
  USING (public.is_admin() OR (public.can_manage_partner() AND partner_id = public.get_my_partner_id()))
  WITH CHECK (public.is_admin() OR (public.can_manage_partner() AND partner_id = public.get_my_partner_id()));

-- room_types
DROP POLICY IF EXISTS "partner_insert_own_room_types" ON public.room_types;
DROP POLICY IF EXISTS "partner_update_own_room_types" ON public.room_types;
DROP POLICY IF EXISTS "partner_read_own_room_types" ON public.room_types;
DROP POLICY IF EXISTS "public_select_room_types" ON public.room_types;
CREATE POLICY room_types_select ON public.room_types FOR SELECT
  USING (public.is_property_public(property_id) OR public.owns_property(property_id) OR public.is_admin());
CREATE POLICY room_types_manage ON public.room_types FOR ALL
  USING (public.is_admin() OR (public.can_manage_partner() AND public.owns_property(property_id)))
  WITH CHECK (public.is_admin() OR (public.can_manage_partner() AND public.owns_property(property_id)));

-- rooms (units are operational data: never public)
DROP POLICY IF EXISTS "partner_insert_own_rooms" ON public.rooms;
DROP POLICY IF EXISTS "partner_update_own_rooms" ON public.rooms;
DROP POLICY IF EXISTS "partner_read_own_rooms" ON public.rooms;
DROP POLICY IF EXISTS "public_select_rooms" ON public.rooms;
CREATE POLICY rooms_select ON public.rooms FOR SELECT
  USING (public.owns_room_type(room_type_id) OR public.is_admin());
CREATE POLICY rooms_manage ON public.rooms FOR ALL
  USING (public.is_admin() OR (public.can_manage_partner() AND public.owns_room_type(room_type_id)))
  WITH CHECK (public.is_admin() OR (public.can_manage_partner() AND public.owns_room_type(room_type_id)));

-- room_type_availability
DROP POLICY IF EXISTS "public_select_room_availability" ON public.room_type_availability;
DROP POLICY IF EXISTS "partner_all_room_availability" ON public.room_type_availability;
CREATE POLICY availability_select ON public.room_type_availability FOR SELECT
  USING (public.owns_room_type(room_type_id) OR public.is_admin());
CREATE POLICY availability_manage ON public.room_type_availability FOR ALL
  USING (public.is_admin() OR (public.can_manage_partner() AND public.owns_room_type(room_type_id)))
  WITH CHECK (public.is_admin() OR (public.can_manage_partner() AND public.owns_room_type(room_type_id)));

-- rate_plans
DROP POLICY IF EXISTS "public_select_rate_plans" ON public.rate_plans;
DROP POLICY IF EXISTS "partner_all_rate_plans" ON public.rate_plans;
CREATE POLICY rate_plans_select ON public.rate_plans FOR SELECT
  USING (public.owns_room_type(room_type_id) OR public.is_admin() OR EXISTS (
    SELECT 1 FROM public.room_types rt WHERE rt.id = rate_plans.room_type_id AND public.is_property_public(rt.property_id)));
CREATE POLICY rate_plans_manage ON public.rate_plans FOR ALL
  USING (public.is_admin() OR (public.can_manage_partner() AND public.owns_room_type(room_type_id)))
  WITH CHECK (public.is_admin() OR (public.can_manage_partner() AND public.owns_room_type(room_type_id)));

-- pricing_rules
DROP POLICY IF EXISTS "public_select_pricing_rules" ON public.pricing_rules;
DROP POLICY IF EXISTS "partner_all_pricing_rules" ON public.pricing_rules;
CREATE POLICY pricing_rules_select ON public.pricing_rules FOR SELECT
  USING (public.owns_property(property_id) OR public.is_admin());
CREATE POLICY pricing_rules_manage ON public.pricing_rules FOR ALL
  USING (public.is_admin() OR (public.can_manage_partner() AND public.owns_property(property_id)))
  WITH CHECK (public.is_admin() OR (public.can_manage_partner() AND public.owns_property(property_id)
    AND (room_type_id IS NULL OR public.owns_room_type(room_type_id))));

-- property_images
DROP POLICY IF EXISTS "property_images_select" ON public.property_images;
DROP POLICY IF EXISTS "property_images_all_partner" ON public.property_images;
CREATE POLICY property_images_select ON public.property_images FOR SELECT
  USING (public.is_property_public(property_id) OR public.owns_property(property_id) OR public.is_admin());
CREATE POLICY property_images_manage ON public.property_images FOR ALL
  USING (public.is_admin() OR (public.can_manage_partner() AND public.owns_property(property_id)))
  WITH CHECK (public.is_admin() OR (public.can_manage_partner() AND public.owns_property(property_id)));

-- storage: partners write only under their own "<partner_id>/" folder
DROP POLICY IF EXISTS "Authenticated users can upload property images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete property images" ON storage.objects;
CREATE POLICY property_images_partner_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'property-images' AND public.can_manage_partner()
    AND (storage.foldername(name))[1] = public.get_my_partner_id()::text);
CREATE POLICY property_images_partner_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'property-images' AND public.can_manage_partner()
    AND (storage.foldername(name))[1] = public.get_my_partner_id()::text);
```

- [ ] **Step 4: `…100200_lock_down_definer_rpcs.sql`:**

```sql
-- Migration: lock_down_definer_rpcs
-- Down: recreate update_property_rpc (20260810140000), save_property_details_rpc(uuid,…) (20260814100000),
--       get_partner_dashboard_stats(uuid) (20260813120000); GRANT EXECUTE ON update_user_role/create_partner_rpc TO PUBLIC.

-- Server-only RPCs: called exclusively with the service-role client.
REVOKE ALL ON FUNCTION public.update_user_role(uuid, public.user_role, uuid, public.staff_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_partner_rpc(uuid, text, text, text) FROM PUBLIC, anon, authenticated;

-- Dead, unauthenticated upsert of any partner's property.
DROP FUNCTION IF EXISTS public.update_property_rpc(uuid, text, text, text, text);

-- Property save: caller-derived partner, runs under the caller's RLS.
DROP FUNCTION IF EXISTS public.save_property_details_rpc(uuid, text, text, uuid, text, text, text, numeric, numeric, time, time, numeric, numeric, numeric, uuid[]);
CREATE FUNCTION public.save_property_details_rpc(
  p_name text, p_property_type text, p_area_id uuid, p_description_en text, p_description_fil text,
  p_address text, p_latitude numeric, p_longitude numeric, p_check_in_time time, p_check_out_time time,
  p_early_checkin_fee numeric, p_late_checkout_fee numeric, p_downpayment_rate numeric, p_amenity_ids uuid[]
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_partner_id uuid := public.get_my_partner_id();
  v_property_id uuid;
BEGIN
  IF v_partner_id IS NULL OR NOT public.can_manage_partner() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  INSERT INTO public.properties (
    partner_id, name, slug, property_type, area_id, description_en, description_fil, address,
    latitude, longitude, check_in_time, check_out_time, early_checkin_fee, late_checkout_fee,
    downpayment_rate, status, updated_at
  ) VALUES (
    v_partner_id, p_name, public.slugify(p_name), p_property_type::public.property_type, p_area_id,
    p_description_en, p_description_fil, p_address, p_latitude, p_longitude,
    COALESCE(p_check_in_time, '14:00'), COALESCE(p_check_out_time, '12:00'),
    COALESCE(p_early_checkin_fee, 0), COALESCE(p_late_checkout_fee, 0),
    COALESCE(p_downpayment_rate, 0.30), 'published', now()
  )
  ON CONFLICT (partner_id) DO UPDATE SET
    name = EXCLUDED.name, slug = EXCLUDED.slug, property_type = EXCLUDED.property_type,
    area_id = EXCLUDED.area_id, description_en = EXCLUDED.description_en,
    description_fil = EXCLUDED.description_fil, address = EXCLUDED.address,
    latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
    check_in_time = EXCLUDED.check_in_time, check_out_time = EXCLUDED.check_out_time,
    early_checkin_fee = EXCLUDED.early_checkin_fee, late_checkout_fee = EXCLUDED.late_checkout_fee,
    downpayment_rate = EXCLUDED.downpayment_rate, updated_at = now()
  RETURNING id INTO v_property_id;

  IF p_amenity_ids IS NOT NULL THEN
    DELETE FROM public.property_amenities WHERE property_id = v_property_id;
    INSERT INTO public.property_amenities (property_id, amenity_id)
    SELECT v_property_id, a FROM unnest(p_amenity_ids) a
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_property_id;
END;
$$;
REVOKE ALL ON FUNCTION public.save_property_details_rpc(text, text, uuid, text, text, text, numeric, numeric, time, time, numeric, numeric, numeric, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_property_details_rpc(text, text, uuid, text, text, text, numeric, numeric, time, time, numeric, numeric, numeric, uuid[]) TO authenticated;

-- Bulk availability: same signature, now runs under caller RLS with a range guard.
CREATE OR REPLACE FUNCTION public.bulk_upsert_availability_rpc(
  p_room_type_id uuid, p_start_date date, p_end_date date, p_available_count int,
  p_price_override numeric, p_minimum_stay int, p_closed_to_arrival boolean, p_closed_to_departure boolean
) RETURNS int LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_count int;
BEGIN
  IF p_end_date < p_start_date OR p_end_date - p_start_date > 366 THEN
    RAISE EXCEPTION 'INVALID_DATES';
  END IF;
  INSERT INTO public.room_type_availability (room_type_id, date, available_count, price_override,
    minimum_stay, closed_to_arrival, closed_to_departure)
  SELECT p_room_type_id, d::date, p_available_count, p_price_override, p_minimum_stay,
         COALESCE(p_closed_to_arrival, false), COALESCE(p_closed_to_departure, false)
  FROM generate_series(p_start_date, p_end_date, interval '1 day') d
  ON CONFLICT (room_type_id, date) DO UPDATE SET
    available_count = EXCLUDED.available_count, price_override = EXCLUDED.price_override,
    minimum_stay = EXCLUDED.minimum_stay, closed_to_arrival = EXCLUDED.closed_to_arrival,
    closed_to_departure = EXCLUDED.closed_to_departure;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.bulk_upsert_availability_rpc(uuid, date, date, int, numeric, int, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bulk_upsert_availability_rpc(uuid, date, date, int, numeric, int, boolean, boolean) TO authenticated;

-- Dashboard stats: caller-derived partner.
DROP FUNCTION IF EXISTS public.get_partner_dashboard_stats(uuid);
CREATE FUNCTION public.get_partner_dashboard_stats()
RETURNS TABLE (total_listings bigint, today_bookings bigint, pending_checkins bigint, avg_rating numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (
    SELECT public.get_my_partner_id() AS partner_id WHERE public.is_approved_partner()
  ), mine AS (
    SELECT b.* FROM public.bookings b
    JOIN public.room_types rt ON rt.id = b.room_type_id
    JOIN public.properties p ON p.id = rt.property_id
    WHERE p.partner_id = (SELECT partner_id FROM me)
  ), today AS (SELECT (now() AT TIME ZONE 'Asia/Manila')::date AS d)
  SELECT
    (SELECT count(*) FROM public.properties WHERE partner_id = (SELECT partner_id FROM me) AND status = 'published'),
    (SELECT count(*) FROM mine WHERE check_in = (SELECT d FROM today) AND status IN ('confirmed','checked_in')),
    (SELECT count(*) FROM mine WHERE check_in = (SELECT d FROM today) AND status = 'confirmed'),
    (SELECT COALESCE(avg(r.rating), 0)::numeric(3,2) FROM public.reviews r
       JOIN public.properties p ON p.id = r.property_id WHERE p.partner_id = (SELECT partner_id FROM me));
$$;
REVOKE ALL ON FUNCTION public.get_partner_dashboard_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_partner_dashboard_stats() TO authenticated;
```

- [ ] **Step 5: `…100300_rls_remaining_tables.sql`:**

```sql
-- Migration: rls_remaining_tables
-- Down: DROP POLICY … (each policy below); ALTER TABLE … DISABLE ROW LEVEL SECURITY for the 21 tables.

-- Public reference data
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['areas','amenities','amenity_categories','tags'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (true)', t || '_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())', t || '_admin', t);
  END LOOP;
END $$;

-- Property-linked
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['property_amenities','property_tags','packages'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (public.is_property_public(property_id) OR public.owns_property(property_id) OR public.is_admin())', t || '_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (public.is_admin() OR (public.can_manage_partner() AND public.owns_property(property_id))) WITH CHECK (public.is_admin() OR (public.can_manage_partner() AND public.owns_property(property_id)))', t || '_manage', t);
  END LOOP;
END $$;

ALTER TABLE public.package_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY package_items_select ON public.package_items FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.packages pk WHERE pk.id = package_items.package_id
    AND (public.is_property_public(pk.property_id) OR public.owns_property(pk.property_id) OR public.is_admin())));
CREATE POLICY package_items_manage ON public.package_items FOR ALL
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.packages pk WHERE pk.id = package_items.package_id
    AND public.can_manage_partner() AND public.owns_property(pk.property_id)))
  WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.packages pk WHERE pk.id = package_items.package_id
    AND public.can_manage_partner() AND public.owns_property(pk.property_id)));

-- Booking children: readable by the booking's customer, owning partner, admin. Writes only via RPCs.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['booking_rooms','booking_status_history','booking_packages','payments'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$CREATE POLICY %I ON public.%I FOR SELECT USING (
      public.is_admin() OR public.partner_owns_booking(booking_id)
      OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = %I.booking_id AND b.customer_id = auth.uid()))$f$,
      t || '_select', t, t);
  END LOOP;
END $$;

-- Guest IDs: customer uploads/reads own; owning partner and admin read.
ALTER TABLE public.guest_id_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY guest_id_documents_select ON public.guest_id_documents FOR SELECT USING (
  public.is_admin() OR public.partner_owns_booking(booking_id) OR uploaded_by = auth.uid());
CREATE POLICY guest_id_documents_insert ON public.guest_id_documents FOR INSERT WITH CHECK (
  uploaded_by = auth.uid() AND EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.id = guest_id_documents.booking_id AND b.customer_id = auth.uid()));

-- Money: partner reads own, admin reads all; no client writes.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['commission_ledger','payouts'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (public.is_admin() OR (public.is_approved_partner() AND partner_id = public.get_my_partner_id()))', t || '_select', t);
  END LOOP;
END $$;

-- Server-only
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY promo_redemptions_admin_select ON public.promo_redemptions FOR SELECT USING (public.is_admin());

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_admin_select ON public.audit_logs FOR SELECT USING (public.is_admin());

-- Promo codes: no public read (prevents enumeration); validation happens server-side.
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY promo_codes_select ON public.promo_codes FOR SELECT USING (
  public.is_admin() OR (public.is_approved_partner() AND partner_id = public.get_my_partner_id()));
CREATE POLICY promo_codes_manage ON public.promo_codes FOR ALL
  USING (public.is_admin() OR (public.can_manage_partner() AND partner_id = public.get_my_partner_id()))
  WITH CHECK (public.is_admin() OR (public.can_manage_partner() AND partner_id = public.get_my_partner_id()));

-- Reviews: public read for visible properties; insert only after own checked_out stay at that property.
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY reviews_select ON public.reviews FOR SELECT USING (
  public.is_property_public(property_id) OR public.owns_property(property_id)
  OR customer_id = auth.uid() OR public.is_admin());
CREATE POLICY reviews_insert ON public.reviews FOR INSERT WITH CHECK (
  customer_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.bookings b JOIN public.room_types rt ON rt.id = b.room_type_id
    WHERE b.id = reviews.booking_id AND b.customer_id = auth.uid()
      AND b.status = 'checked_out' AND rt.property_id = reviews.property_id));

ALTER TABLE public.loyalty_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY loyalty_accounts_select ON public.loyalty_accounts FOR SELECT USING (
  customer_id = auth.uid() OR public.is_admin());
```

- [ ] **Step 6:** `npx supabase@2 db reset && npx supabase@2 test db` → `01_access_rls` PASS.
- [ ] **Step 7:** Commit `feat(db): lock down partner data with RLS and safe RPCs`.

---

### Task 4: Stay pricing + quote functions

**Files:** Create `…100400_audit_log_triggers.sql` (Task 5 owns it — skip here), `…100500_stay_pricing_functions.sql`; Test `supabase/tests/02_stay_pricing.test.sql`.

**Interfaces — Produces:**
- `stay_nights(p_room_type_id uuid, p_rate_plan_id uuid, p_check_in date, p_check_out date) → table(night date, price numeric(10,2), allotment int, booked int, rooms_left int, closed_to_arrival boolean, closed_to_departure boolean, minimum_stay int)` — internal, no grants.
- `quote_stay(p_room_type_id uuid, p_rate_plan_id uuid, p_check_in date, p_check_out date, p_adults int DEFAULT 1, p_children int DEFAULT 0) → jsonb` `{bookable boolean, reason text|null, room_type_id, rate_plan_id, check_in, check_out, nights int, nightly:[{date, price, rooms_left}], subtotal numeric, downpayment_rate numeric, downpayment numeric, balance numeric, minimum_stay int}` — anon + authenticated.
- `get_property_offers(p_property_id uuid, p_check_in date, p_check_out date, p_adults int DEFAULT 1, p_children int DEFAULT 0) → jsonb` `{property_id, reason text|null, offers:[quote + {room_type:{id,name_en,name_fil,capacity,max_adults,max_children,base_price,bed_configuration,size_sqm}, rate_plan:{id,name_en,name_fil,includes_breakfast,cancellation_policy}|null}]}` — anon + authenticated.
- `get_partner_room_calendar(p_room_type_id uuid, p_from date, p_to date) → setof stay_nights row` — authenticated; returns nothing unless `owns_room_type`.

- [ ] **Step 1: Failing tests** `02_stay_pricing.test.sql`:

```sql
BEGIN;
\ir fixtures.psql
SELECT plan(22);
-- helper: price of a single night
CREATE FUNCTION pg_temp.price(p_rp uuid, p_d date) RETURNS numeric LANGUAGE sql AS $$
  SELECT price FROM public.stay_nights('e0000000-0000-0000-0000-0000000000a1', p_rp, p_d, p_d + 1) $$;

SELECT is(pg_temp.price(NULL, :'d0'::date), 3000.00, 'base price');
SELECT is(pg_temp.price('f0000000-0000-0000-0000-0000000000a1', :'d0'::date), 3500.00, 'base + rate plan');

INSERT INTO public.pricing_rules (property_id, name, rule_type, days_of_week, price_modifier, priority)
VALUES ('d0000000-0000-0000-0000-00000000000a','Surge','weekend', ARRAY[extract(dow from :'d0'::date)::int], 800, 10),
       ('d0000000-0000-0000-0000-00000000000a','Low','date_range', NULL, 100, 1);
UPDATE public.pricing_rules SET start_date = :'d0'::date, end_date = :'d0'::date + 10 WHERE name = 'Low';
SELECT is(pg_temp.price('f0000000-0000-0000-0000-0000000000a1', :'d0'::date), 4300.00, 'stack: base + top-priority rule + plan');
SELECT is(pg_temp.price(NULL, :'d0'::date + 1), 3100.00, 'lower-priority rule applies when top rule does not match');

INSERT INTO public.pricing_rules (property_id, name, rule_type, start_date, end_date, minimum_stay, priority)
VALUES ('d0000000-0000-0000-0000-00000000000a','MinOnly','holiday', :'d0'::date, :'d0'::date, 3, 99);
SELECT is(pg_temp.price(NULL, :'d0'::date), 3800.00, 'min-stay-only rule does not wipe surge price');
SELECT is((SELECT minimum_stay FROM public.stay_nights('e0000000-0000-0000-0000-0000000000a1', NULL, :'d0'::date, :'d0'::date + 1)), 3, 'min-stay from top rule with min-stay');

INSERT INTO public.room_type_availability (room_type_id, date, available_count, price_override, minimum_stay)
VALUES ('e0000000-0000-0000-0000-0000000000a1', :'d0'::date, 2, 9999, 1);
SELECT is(pg_temp.price('f0000000-0000-0000-0000-0000000000a1', :'d0'::date), 9999.00, 'override replaces everything');
SELECT is((SELECT minimum_stay FROM public.stay_nights('e0000000-0000-0000-0000-0000000000a1', NULL, :'d0'::date, :'d0'::date + 1)), 1, 'override min-stay wins');
DELETE FROM public.room_type_availability; DELETE FROM public.pricing_rules;

-- quote reasons (as anon)
SELECT pg_temp.tests_anon();
CREATE FUNCTION pg_temp.reason(p_rt uuid, p_rp uuid, p_in date, p_out date, p_a int DEFAULT 1, p_c int DEFAULT 0) RETURNS text
  LANGUAGE sql AS $$ SELECT public.quote_stay(p_rt, p_rp, p_in, p_out, p_a, p_c)->>'reason' $$;
SELECT is(pg_temp.reason('e0000000-0000-0000-0000-0000000000a1', NULL, :'d0'::date, :'d0'::date + 2), NULL, 'bookable quote has no reason');
SELECT is((public.quote_stay('e0000000-0000-0000-0000-0000000000a1','f0000000-0000-0000-0000-0000000000a1', :'d0'::date, :'d0'::date + 2)->>'subtotal')::numeric, 7000.00, 'subtotal 2 nights x 3500');
SELECT is((public.quote_stay('e0000000-0000-0000-0000-0000000000a1','f0000000-0000-0000-0000-0000000000a1', :'d0'::date, :'d0'::date + 2)->>'downpayment')::numeric, 2100.00, '30% downpayment');
SELECT is(pg_temp.reason('e0000000-0000-0000-0000-0000000000c1', NULL, :'d0'::date, :'d0'::date + 1), 'PROPERTY_UNAVAILABLE', 'pending partner not bookable');
SELECT is(pg_temp.reason('e0000000-0000-0000-0000-0000000000a1', 'f0000000-0000-0000-0000-0000000000b1', :'d0'::date, :'d0'::date + 1), 'RATE_PLAN_INVALID', 'foreign rate plan rejected');
SELECT is(pg_temp.reason('e0000000-0000-0000-0000-0000000000a1', NULL, current_date - 1, current_date + 1), 'INVALID_DATES', 'past check-in');
SELECT is(pg_temp.reason('e0000000-0000-0000-0000-0000000000a1', NULL, :'d0'::date, :'d0'::date), 'INVALID_DATES', 'zero nights');
SELECT is(pg_temp.reason('e0000000-0000-0000-0000-0000000000a1', NULL, :'d0'::date, :'d0'::date + 31), 'INVALID_DATES', '31 nights');
SELECT is(pg_temp.reason('e0000000-0000-0000-0000-0000000000a1', NULL, :'d0'::date, :'d0'::date + 1, 3, 0), 'OVER_CAPACITY', 'too many adults');
SELECT pg_temp.tests_logout();

INSERT INTO public.room_type_availability (room_type_id, date, available_count, closed_to_arrival)
VALUES ('e0000000-0000-0000-0000-0000000000a1', :'d0'::date + 5, 2, true),
       ('e0000000-0000-0000-0000-0000000000a1', :'d0'::date + 9, 2, false);
UPDATE public.room_type_availability SET closed_to_departure = true WHERE date = :'d0'::date + 9;
INSERT INTO public.room_type_availability (room_type_id, date, available_count)
VALUES ('e0000000-0000-0000-0000-0000000000a1', :'d0'::date + 12, 0);
SELECT is(pg_temp.reason('e0000000-0000-0000-0000-0000000000a1', NULL, :'d0'::date + 5, :'d0'::date + 6), 'CLOSED_TO_ARRIVAL', 'closed to arrival');
SELECT is(pg_temp.reason('e0000000-0000-0000-0000-0000000000a1', NULL, :'d0'::date + 7, :'d0'::date + 9), 'CLOSED_TO_DEPARTURE', 'closed to departure');
SELECT is(pg_temp.reason('e0000000-0000-0000-0000-0000000000a1', NULL, :'d0'::date + 11, :'d0'::date + 13), 'SOLD_OUT', 'blocked night sold out');

-- derived inventory: confirmed counts, expired hold does not, allotment below booked floors at 0
INSERT INTO public.bookings (customer_id, room_type_id, check_in, check_out, subtotal, total_amount, downpayment_amount, status, hold_expires_at) VALUES
 ('a0000000-0000-0000-0000-0000000000c1','e0000000-0000-0000-0000-0000000000a1', :'d0'::date + 20, :'d0'::date + 21, 1,1,1,'confirmed', NULL),
 ('a0000000-0000-0000-0000-0000000000c2','e0000000-0000-0000-0000-0000000000a1', :'d0'::date + 20, :'d0'::date + 21, 1,1,1,'pending_payment', now() - interval '1 minute');
SELECT is((SELECT rooms_left FROM public.stay_nights('e0000000-0000-0000-0000-0000000000a1', NULL, :'d0'::date + 20, :'d0'::date + 21)), 1, 'confirmed counts, expired hold does not');
INSERT INTO public.room_type_availability (room_type_id, date, available_count) VALUES ('e0000000-0000-0000-0000-0000000000a1', :'d0'::date + 20, 0);
SELECT is((SELECT rooms_left FROM public.stay_nights('e0000000-0000-0000-0000-0000000000a1', NULL, :'d0'::date + 20, :'d0'::date + 21)), 0, 'allotment below booked floors at 0');
SELECT * FROM finish();
ROLLBACK;
```

- [ ] **Step 2:** Run → FAIL (functions missing).
- [ ] **Step 3: `…100500_stay_pricing_functions.sql`:**

```sql
-- Migration: stay_pricing_functions
-- Down: DROP FUNCTION get_property_offers(uuid,date,date,int,int), quote_stay(uuid,uuid,date,date,int,int),
--       get_partner_room_calendar(uuid,date,date), stay_nights(uuid,uuid,date,date);

CREATE OR REPLACE FUNCTION public.stay_nights(
  p_room_type_id uuid, p_rate_plan_id uuid, p_check_in date, p_check_out date
) RETURNS TABLE (
  night date, price numeric(10,2), allotment int, booked int, rooms_left int,
  closed_to_arrival boolean, closed_to_departure boolean, minimum_stay int
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH rt AS (
    SELECT id, property_id, base_price, total_inventory FROM public.room_types WHERE id = p_room_type_id
  ), rp AS (
    SELECT price_modifier, minimum_stay FROM public.rate_plans
    WHERE id = p_rate_plan_id AND room_type_id = p_room_type_id
  )
  SELECT
    n.night,
    COALESCE(a.price_override,
      rt.base_price + COALESCE(pr_price.price_modifier, 0) + COALESCE((SELECT price_modifier FROM rp), 0)
    )::numeric(10,2),
    COALESCE(a.available_count, rt.total_inventory),
    bk.cnt::int,
    GREATEST(COALESCE(a.available_count, rt.total_inventory) - bk.cnt::int, 0),
    COALESCE(a.closed_to_arrival, false),
    COALESCE(a.closed_to_departure, false),
    COALESCE(a.minimum_stay, pr_min.minimum_stay, (SELECT minimum_stay FROM rp), 1)
  FROM rt
  CROSS JOIN LATERAL (
    SELECT d::date AS night FROM generate_series(p_check_in, p_check_out - 1, interval '1 day') d
  ) n
  LEFT JOIN public.room_type_availability a ON a.room_type_id = rt.id AND a.date = n.night
  LEFT JOIN LATERAL (
    SELECT r.price_modifier FROM public.pricing_rules r
    WHERE r.property_id = rt.property_id AND r.is_active AND r.price_modifier IS NOT NULL
      AND (r.room_type_id IS NULL OR r.room_type_id = rt.id)
      AND (r.start_date IS NULL OR n.night >= r.start_date)
      AND (r.end_date IS NULL OR n.night <= r.end_date)
      AND (r.days_of_week IS NULL OR cardinality(r.days_of_week) = 0
           OR extract(dow FROM n.night)::int = ANY (r.days_of_week))
    ORDER BY r.priority DESC, (r.room_type_id IS NOT NULL) DESC, r.created_at DESC
    LIMIT 1
  ) pr_price ON true
  LEFT JOIN LATERAL (
    SELECT r.minimum_stay FROM public.pricing_rules r
    WHERE r.property_id = rt.property_id AND r.is_active AND r.minimum_stay IS NOT NULL
      AND (r.room_type_id IS NULL OR r.room_type_id = rt.id)
      AND (r.start_date IS NULL OR n.night >= r.start_date)
      AND (r.end_date IS NULL OR n.night <= r.end_date)
      AND (r.days_of_week IS NULL OR cardinality(r.days_of_week) = 0
           OR extract(dow FROM n.night)::int = ANY (r.days_of_week))
    ORDER BY r.priority DESC, (r.room_type_id IS NOT NULL) DESC, r.created_at DESC
    LIMIT 1
  ) pr_min ON true
  CROSS JOIN LATERAL (
    SELECT count(*) AS cnt FROM public.bookings b
    WHERE b.room_type_id = rt.id AND b.check_in <= n.night AND b.check_out > n.night
      AND (b.status IN ('confirmed', 'checked_in')
           OR (b.status = 'pending_payment' AND b.hold_expires_at > now()))
  ) bk
  ORDER BY n.night;
$$;
REVOKE ALL ON FUNCTION public.stay_nights(uuid, uuid, date, date) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.quote_stay(
  p_room_type_id uuid, p_rate_plan_id uuid, p_check_in date, p_check_out date,
  p_adults int DEFAULT 1, p_children int DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rt public.room_types%ROWTYPE;
  v_today date := (now() AT TIME ZONE 'Asia/Manila')::date;
  v_base jsonb;
  v_rate numeric;
  v_nightly jsonb;
  v_subtotal numeric(10,2);
  v_sold_out boolean;
  v_min_stay int;
  v_cta boolean;
  v_ctd boolean;
  v_down numeric(10,2);
  v_reason text;
BEGIN
  v_base := jsonb_build_object('room_type_id', p_room_type_id, 'rate_plan_id', p_rate_plan_id,
    'check_in', p_check_in, 'check_out', p_check_out);

  SELECT * INTO v_rt FROM public.room_types WHERE id = p_room_type_id;
  IF NOT FOUND OR NOT public.is_property_public(v_rt.property_id) THEN
    RETURN v_base || jsonb_build_object('bookable', false, 'reason', 'PROPERTY_UNAVAILABLE');
  END IF;
  IF p_rate_plan_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.rate_plans WHERE id = p_rate_plan_id AND room_type_id = p_room_type_id) THEN
    RETURN v_base || jsonb_build_object('bookable', false, 'reason', 'RATE_PLAN_INVALID');
  END IF;
  IF p_check_in IS NULL OR p_check_out IS NULL OR p_check_in < v_today
     OR p_check_out <= p_check_in OR p_check_out - p_check_in > 30 THEN
    RETURN v_base || jsonb_build_object('bookable', false, 'reason', 'INVALID_DATES');
  END IF;
  IF COALESCE(p_adults, 0) < 1 OR COALESCE(p_children, 0) < 0
     OR p_adults > COALESCE(v_rt.max_adults, v_rt.capacity)
     OR COALESCE(p_children, 0) > COALESCE(v_rt.max_children, 0)
     OR p_adults + COALESCE(p_children, 0) > v_rt.capacity THEN
    RETURN v_base || jsonb_build_object('bookable', false, 'reason', 'OVER_CAPACITY');
  END IF;

  SELECT jsonb_agg(jsonb_build_object('date', s.night, 'price', s.price, 'rooms_left', s.rooms_left) ORDER BY s.night),
         sum(s.price), bool_or(s.rooms_left < 1)
    INTO v_nightly, v_subtotal, v_sold_out
  FROM public.stay_nights(p_room_type_id, p_rate_plan_id, p_check_in, p_check_out) s;

  SELECT s.minimum_stay, s.closed_to_arrival INTO v_min_stay, v_cta
  FROM public.stay_nights(p_room_type_id, p_rate_plan_id, p_check_in, p_check_in + 1) s;

  SELECT COALESCE(a.closed_to_departure, false) INTO v_ctd
  FROM public.room_type_availability a WHERE a.room_type_id = p_room_type_id AND a.date = p_check_out;

  v_reason := CASE
    WHEN p_check_out - p_check_in < v_min_stay THEN 'MIN_STAY_NOT_MET'
    WHEN v_cta THEN 'CLOSED_TO_ARRIVAL'
    WHEN COALESCE(v_ctd, false) THEN 'CLOSED_TO_DEPARTURE'
    WHEN v_sold_out THEN 'SOLD_OUT'
  END;

  SELECT COALESCE(downpayment_rate, 0.30) INTO v_rate FROM public.properties WHERE id = v_rt.property_id;
  v_down := round(v_subtotal * v_rate, 2);

  RETURN v_base || jsonb_build_object(
    'bookable', v_reason IS NULL, 'reason', v_reason,
    'nights', p_check_out - p_check_in, 'nightly', v_nightly,
    'subtotal', v_subtotal, 'downpayment_rate', v_rate,
    'downpayment', v_down, 'balance', v_subtotal - v_down,
    'minimum_stay', v_min_stay);
END;
$$;
REVOKE ALL ON FUNCTION public.quote_stay(uuid, uuid, date, date, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.quote_stay(uuid, uuid, date, date, int, int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_property_offers(
  p_property_id uuid, p_check_in date, p_check_out date, p_adults int DEFAULT 1, p_children int DEFAULT 0
) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN NOT public.is_property_public(p_property_id) THEN
    jsonb_build_object('property_id', p_property_id, 'reason', 'PROPERTY_UNAVAILABLE', 'offers', '[]'::jsonb)
  ELSE jsonb_build_object('property_id', p_property_id, 'reason', NULL, 'offers', COALESCE((
    SELECT jsonb_agg(
      public.quote_stay(rt.id, rp.id, p_check_in, p_check_out, p_adults, p_children)
      || jsonb_build_object(
        'room_type', jsonb_build_object('id', rt.id, 'name_en', rt.name_en, 'name_fil', rt.name_fil,
          'capacity', rt.capacity, 'max_adults', rt.max_adults, 'max_children', rt.max_children,
          'base_price', rt.base_price, 'bed_configuration', rt.bed_configuration, 'size_sqm', rt.size_sqm),
        'rate_plan', CASE WHEN rp.id IS NULL THEN NULL ELSE jsonb_build_object('id', rp.id,
          'name_en', rp.name_en, 'name_fil', rp.name_fil, 'includes_breakfast', rp.includes_breakfast,
          'cancellation_policy', rp.cancellation_policy) END)
      ORDER BY rt.base_price, rt.name_en, rp.is_default DESC NULLS LAST, rp.price_modifier)
    FROM public.room_types rt
    LEFT JOIN public.rate_plans rp ON rp.room_type_id = rt.id
    WHERE rt.property_id = p_property_id), '[]'::jsonb))
  END;
$$;
REVOKE ALL ON FUNCTION public.get_property_offers(uuid, date, date, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_property_offers(uuid, date, date, int, int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_partner_room_calendar(p_room_type_id uuid, p_from date, p_to date)
RETURNS TABLE (night date, price numeric, allotment int, booked int, rooms_left int,
  closed_to_arrival boolean, closed_to_departure boolean, minimum_stay int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.* FROM public.stay_nights(p_room_type_id, NULL, p_from, p_to + 1) s
  WHERE public.owns_room_type(p_room_type_id) AND p_to - p_from <= 62;
$$;
REVOKE ALL ON FUNCTION public.get_partner_room_calendar(uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_partner_room_calendar(uuid, date, date) TO authenticated;
```

- [ ] **Step 4:** Reset + test → `02_stay_pricing` PASS.
- [ ] **Step 5:** Commit `feat(db): add stay pricing, quote and property offers RPCs`.

---

### Task 5: Audit log triggers

**Files:** Create `…100400_audit_log_triggers.sql`; Test `supabase/tests/05_audit.test.sql`.

**Interfaces — Produces:** `write_audit_log()` trigger function; triggers `audit_<table>` on `properties`, `room_types`, `rate_plans`, `pricing_rules`, `room_type_availability`. (`partners` excluded: approvals run via service role, so `auth.uid()` would be null — `approve-partner.ts` keeps its explicit audit rows with the admin actor.)

- [ ] **Step 1: Failing test:**

```sql
BEGIN;
\ir fixtures.psql
SELECT plan(3);
SELECT pg_temp.tests_login('a0000000-0000-0000-0000-00000000000a');
UPDATE public.rate_plans SET price_modifier = 700 WHERE id = 'f0000000-0000-0000-0000-0000000000a1';
UPDATE public.rate_plans SET price_modifier = 700 WHERE id = 'f0000000-0000-0000-0000-0000000000a1';
SELECT pg_temp.tests_logout();
SELECT is((SELECT count(*)::int FROM public.audit_logs WHERE entity_id = 'f0000000-0000-0000-0000-0000000000a1'), 1, 'one row; no-op update skipped');
SELECT is((SELECT actor_id FROM public.audit_logs WHERE entity_id = 'f0000000-0000-0000-0000-0000000000a1'), 'a0000000-0000-0000-0000-00000000000a'::uuid, 'actor recorded');
SELECT is((SELECT (before->>'price_modifier')::numeric FROM public.audit_logs WHERE entity_id = 'f0000000-0000-0000-0000-0000000000a1'), 500.00, 'before captured');
SELECT * FROM finish();
ROLLBACK;
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Migration:**

```sql
-- Migration: audit_log_triggers
-- Down: DROP TRIGGER audit_<t> ON public.<t> for each table below; DROP FUNCTION public.write_audit_log();

CREATE OR REPLACE FUNCTION public.write_audit_log()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND to_jsonb(NEW) = to_jsonb(OLD) THEN
    RETURN NULL;
  END IF;
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  VALUES (
    auth.uid(),
    CASE TG_OP WHEN 'INSERT' THEN 'create' WHEN 'UPDATE' THEN 'update' ELSE 'delete' END::public.audit_action,
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END
  );
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.write_audit_log() FROM PUBLIC, anon, authenticated;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['properties','room_types','rate_plans','pricing_rules','room_type_availability'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'audit_' || t, t);
    EXECUTE format('CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.write_audit_log()', 'audit_' || t, t);
  END LOOP;
END $$;
```

- [ ] **Step 4:** Reset + test → all PASS (re-run 01–02 too: fixtures insert with `session_replication_role = replica`, so triggers do not fire during seeding).
- [ ] **Step 5:** Commit `feat(db): audit partner property, room, rate and availability changes`.

---

### Task 6: `create_booking` RPC

**Files:** Create `…100600_create_booking_rpc.sql`; Test `supabase/tests/03_create_booking.test.sql`, `supabase/tests/concurrency/last_room.sh`.

**Interfaces — Consumes:** `quote_stay`. **Produces:** `create_booking(p_room_type_id uuid, p_rate_plan_id uuid, p_check_in date, p_check_out date, p_adults int DEFAULT 1, p_children int DEFAULT 0, p_special_requests text DEFAULT NULL) → jsonb` `{booking_id, reference, status, check_in, check_out, nights, subtotal, total, downpayment, balance, hold_expires_at}`; raises exception whose message is one of the reason codes.

- [ ] **Step 1: Failing test:**

```sql
BEGIN;
\ir fixtures.psql
SELECT plan(9);
SELECT pg_temp.tests_anon();
SELECT throws_ok(format($$SELECT public.create_booking('e0000000-0000-0000-0000-0000000000b1', NULL, %L, %L)$$, :'d0'::date, :'d0'::date + 1), '42501', NULL, 'anon cannot book');
SELECT pg_temp.tests_logout();

SELECT pg_temp.tests_login('a0000000-0000-0000-0000-0000000000c1');
CREATE TEMP TABLE r AS SELECT public.create_booking('e0000000-0000-0000-0000-0000000000a1', 'f0000000-0000-0000-0000-0000000000a1', :'d0'::date, :'d0'::date + 2, 2, 1, '  late arrival  ') AS j;
SELECT matches((SELECT j->>'reference' FROM r), '^DIP-[0-9A-F]{8}$', 'reference format');
SELECT is((SELECT (j->>'total')::numeric FROM r), 7000.00, 'total from server-side quote');
SELECT is((SELECT (j->>'downpayment')::numeric FROM r), 2100.00, 'downpayment 30%');
SELECT pg_temp.tests_logout();
SELECT is((SELECT special_requests FROM public.bookings WHERE id = (SELECT (j->>'booking_id')::uuid FROM r)), 'late arrival', 'special requests trimmed and stored');
SELECT is((SELECT rate_plan_id FROM public.bookings WHERE id = (SELECT (j->>'booking_id')::uuid FROM r)), 'f0000000-0000-0000-0000-0000000000a1'::uuid, 'rate plan stored');
SELECT is((SELECT to_status::text FROM public.booking_status_history WHERE booking_id = (SELECT (j->>'booking_id')::uuid FROM r)), 'pending_payment', 'history row written');

SELECT pg_temp.tests_login('a0000000-0000-0000-0000-0000000000c2');
SELECT lives_ok(format($$SELECT public.create_booking('e0000000-0000-0000-0000-0000000000a1', NULL, %L, %L)$$, :'d0'::date, :'d0'::date + 1), 'second room still available');
SELECT throws_ok(format($$SELECT public.create_booking('e0000000-0000-0000-0000-0000000000a1', NULL, %L, %L)$$, :'d0'::date, :'d0'::date + 1), 'SOLD_OUT', 'third booking sold out');
SELECT * FROM finish();
ROLLBACK;
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Migration:**

```sql
-- Migration: create_booking_rpc
-- Down: DROP FUNCTION public.create_booking(uuid, uuid, date, date, int, int, text);

CREATE OR REPLACE FUNCTION public.create_booking(
  p_room_type_id uuid, p_rate_plan_id uuid, p_check_in date, p_check_out date,
  p_adults int DEFAULT 1, p_children int DEFAULT 0, p_special_requests text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_quote jsonb;
  v_hold timestamptz := now() + interval '15 minutes';
  v_booking public.bookings%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  -- Serialize bookings per room type; the quote below runs in a fresh snapshot after the lock.
  PERFORM 1 FROM public.room_types WHERE id = p_room_type_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROPERTY_UNAVAILABLE';
  END IF;

  v_quote := public.quote_stay(p_room_type_id, p_rate_plan_id, p_check_in, p_check_out, p_adults, p_children);
  IF NOT (v_quote->>'bookable')::boolean THEN
    RAISE EXCEPTION '%', v_quote->>'reason';
  END IF;

  INSERT INTO public.bookings (
    customer_id, room_type_id, rate_plan_id, check_in, check_out, adults_count, children_count,
    subtotal, discount_amount, total_amount, downpayment_amount, balance_due,
    status, payment_status, hold_expires_at, special_requests
  ) VALUES (
    v_uid, p_room_type_id, p_rate_plan_id, p_check_in, p_check_out, p_adults, COALESCE(p_children, 0),
    (v_quote->>'subtotal')::numeric, 0, (v_quote->>'subtotal')::numeric,
    (v_quote->>'downpayment')::numeric, (v_quote->>'balance')::numeric,
    'pending_payment', 'pending', v_hold, NULLIF(left(btrim(p_special_requests), 1000), '')
  ) RETURNING * INTO v_booking;

  INSERT INTO public.booking_status_history (booking_id, from_status, to_status, changed_by, note)
  VALUES (v_booking.id, NULL, 'pending_payment', v_uid, 'Booking created; awaiting downpayment');

  RETURN jsonb_build_object(
    'booking_id', v_booking.id, 'reference', v_booking.reference, 'status', v_booking.status,
    'check_in', v_booking.check_in, 'check_out', v_booking.check_out,
    'nights', v_booking.check_out - v_booking.check_in,
    'subtotal', v_booking.subtotal, 'total', v_booking.total_amount,
    'downpayment', v_booking.downpayment_amount, 'balance', v_booking.balance_due,
    'hold_expires_at', v_booking.hold_expires_at);
END;
$$;
REVOKE ALL ON FUNCTION public.create_booking(uuid, uuid, date, date, int, int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid, uuid, date, date, int, int, text) TO authenticated;
```

- [ ] **Step 4:** Reset + test → PASS.
- [ ] **Step 5: Concurrency check** `supabase/tests/concurrency/last_room.sh` — two sessions race for room type `e…b1` (inventory 1); exactly one succeeds:

```bash
#!/usr/bin/env bash
# Races two create_booking calls for the last room. Expects exactly one success.
set -euo pipefail
DB=supabase_db_DIP
SEED="$(dirname "$0")/../fixtures.psql"
docker exec -i "$DB" psql -U postgres -v ON_ERROR_STOP=1 -q <<SQL
BEGIN;
\$(sed 's/SET LOCAL/SET/' "$SEED")
COMMIT;
SQL
book() {
  docker exec -i "$DB" psql -U postgres -At -v ON_ERROR_STOP=0 <<SQL 2>&1 | tail -1
BEGIN;
SELECT set_config('request.jwt.claims', '{"sub":"$1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
SELECT public.create_booking('e0000000-0000-0000-0000-0000000000b1', NULL, current_date + 40, current_date + 41)->>'reference';
SELECT pg_sleep(1);
COMMIT;
SQL
}
book a0000000-0000-0000-0000-0000000000c1 > /tmp/dip_r1 & book a0000000-0000-0000-0000-0000000000c2 > /tmp/dip_r2 & wait
cat /tmp/dip_r1 /tmp/dip_r2
WINS=$(grep -c '^DIP-' /tmp/dip_r1 /tmp/dip_r2 | awk -F: '{s+=$2} END {print s}')
docker exec -i "$DB" psql -U postgres -q -c "DELETE FROM public.booking_status_history WHERE booking_id IN (SELECT id FROM public.bookings WHERE customer_id::text LIKE 'a0000000%'); DELETE FROM public.bookings WHERE customer_id::text LIKE 'a0000000%';" >/dev/null
[ "$WINS" = "1" ] && echo "PASS: exactly one booking won" || { echo "FAIL: $WINS winners"; exit 1; }
```

The seed step must leave fixtures committed for the race and is followed by `npx supabase@2 db reset` to clean up. If the heredoc-inlined seed is awkward, pipe `fixtures.psql` through `sed` into a temp file and `docker cp` it in; keep the race logic as above. Run: `bash supabase/tests/concurrency/last_room.sh` → `PASS`, then `npx supabase@2 db reset`.
- [ ] **Step 6:** Commit `feat(db): add transactional create_booking RPC`.

---

### Task 7: Partner bookings RPCs v2 + room assignment fixes

**Files:** Create `…100700_partner_bookings_rpcs_v2.sql`, `…100800_partner_room_assignment_fixes.sql`; Test `supabase/tests/04_partner_bookings.test.sql`.

**Interfaces — Produces:**
- `get_partner_bookings_stats() → table(total_bookings, upcoming_checkins, ongoing_stays, completed, cancelled bigint)`
- `get_partner_bookings(p_search text DEFAULT NULL, p_start_date date DEFAULT NULL, p_end_date date DEFAULT NULL, p_status text DEFAULT NULL, p_limit int DEFAULT 10, p_offset int DEFAULT 0, p_sort_by text DEFAULT 'created_at_desc')` → same columns as today (`booking_id, booking_ref, booking_date, guest_name, guest_email, guest_phone, guest_avatar_url, listing_name, listing_location, listing_image, check_in, check_out, adults_count, children_count, total_amount, status, room_type_name, total_count`) where `booking_ref` = `bookings.reference` and `status` = effective status (`expired` for lapsed holds).
- Same signatures as today for `partner_assign_rooms`, `partner_unassign_rooms`, `partner_check_in_booking`, `partner_check_out_booking`, `partner_cancel_booking`, `get_partner_booking_detail`.

- [ ] **Step 1: Failing test:**

```sql
BEGIN;
\ir fixtures.psql
SELECT plan(12);
INSERT INTO public.bookings (id, customer_id, room_type_id, check_in, check_out, subtotal, total_amount, downpayment_amount, status, hold_expires_at) VALUES
 ('70000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-0000000000c1','e0000000-0000-0000-0000-0000000000a1', :'d0'::date, :'d0'::date + 3, 1,1,1,'confirmed', NULL),
 ('70000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-0000000000c2','e0000000-0000-0000-0000-0000000000a1', :'d0'::date + 1, :'d0'::date + 2, 1,1,1,'confirmed', NULL),
 ('70000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-0000000000c2','e0000000-0000-0000-0000-0000000000a1', :'d0'::date + 5, :'d0'::date + 6, 1,1,1,'confirmed', NULL),
 ('70000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-0000000000c2','e0000000-0000-0000-0000-0000000000a1', :'d0'::date + 8, :'d0'::date + 9, 1,1,1,'pending_payment', now() - interval '1 minute');

SELECT pg_temp.tests_login('a0000000-0000-0000-0000-00000000000a');
SELECT is((SELECT count(*)::int FROM public.get_partner_bookings()), 4, 'owner A sees other customers bookings');
SELECT is((SELECT booking_ref FROM public.get_partner_bookings() WHERE booking_id = '70000000-0000-0000-0000-000000000001'),
          (SELECT reference FROM public.bookings WHERE id = '70000000-0000-0000-0000-000000000001'), 'partner sees guest reference');
SELECT is((SELECT status FROM public.get_partner_bookings() WHERE booking_id = '70000000-0000-0000-0000-000000000004'), 'expired', 'lapsed hold shows expired');
SELECT is((SELECT total_bookings::int FROM public.get_partner_bookings_stats()), 3, 'stats exclude expired holds');
SELECT is((SELECT count(*)::int FROM public.get_partner_bookings(p_search := (SELECT reference FROM public.bookings WHERE id = '70000000-0000-0000-0000-000000000003'))), 1, 'search by reference');
SELECT lives_ok($$SELECT public.partner_assign_rooms('70000000-0000-0000-0000-000000000001', ARRAY['90000000-0000-0000-0000-0000000000a1']::uuid[])$$, 'assign room 101');
SELECT is((SELECT status::text FROM public.rooms WHERE id = '90000000-0000-0000-0000-0000000000a1'), 'available', 'assignment does not occupy room early');
SELECT throws_ok($$SELECT public.partner_assign_rooms('70000000-0000-0000-0000-000000000002', ARRAY['90000000-0000-0000-0000-0000000000a1']::uuid[])$$, 'ROOM_UNAVAILABLE', 'overlapping assignment rejected');
SELECT lives_ok($$SELECT public.partner_assign_rooms('70000000-0000-0000-0000-000000000003', ARRAY['90000000-0000-0000-0000-0000000000a1']::uuid[])$$, 'non-overlapping assignment allowed');
SELECT throws_ok($$SELECT public.partner_assign_rooms('70000000-0000-0000-0000-000000000002', ARRAY['90000000-0000-0000-0000-0000000000a3']::uuid[])$$, 'ROOM_UNAVAILABLE', 'maintenance room rejected');
SELECT pg_temp.tests_logout();

SELECT pg_temp.tests_login('a0000000-0000-0000-0000-0000000000aa');
SELECT throws_ok($$SELECT public.partner_cancel_booking('70000000-0000-0000-0000-000000000002', 'x')$$, 'FORBIDDEN', 'front desk cannot cancel');
SELECT pg_temp.tests_logout();

SELECT pg_temp.tests_login('a0000000-0000-0000-0000-00000000000b');
SELECT is((SELECT count(*)::int FROM public.get_partner_bookings()), 0, 'partner B sees none of A');
SELECT pg_temp.tests_logout();
SELECT * FROM finish();
ROLLBACK;
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: `…100700_partner_bookings_rpcs_v2.sql`:**

```sql
-- Migration: partner_bookings_rpcs_v2
-- Down: DROP FUNCTION get_partner_bookings_stats(), get_partner_bookings(text,date,date,text,int,int,text);
--       recreate the uuid-parameter versions from 20260825120000.

DROP FUNCTION IF EXISTS public.get_partner_bookings_stats(uuid);
DROP FUNCTION IF EXISTS public.get_partner_bookings(uuid, text, date, date, text, integer, integer, text);

CREATE OR REPLACE FUNCTION public.partner_effective_status(p_status public.booking_status, p_hold timestamptz)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN p_status = 'pending_payment' AND p_hold IS NOT NULL AND p_hold <= now()
    THEN 'expired' ELSE p_status::text END;
$$;

CREATE FUNCTION public.get_partner_bookings_stats()
RETURNS TABLE (total_bookings bigint, upcoming_checkins bigint, ongoing_stays bigint, completed bigint, cancelled bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH mine AS (
    SELECT b.*, public.partner_effective_status(b.status, b.hold_expires_at) AS eff
    FROM public.bookings b
    JOIN public.room_types rt ON rt.id = b.room_type_id
    JOIN public.properties p ON p.id = rt.property_id
    WHERE public.is_approved_partner() AND p.partner_id = public.get_my_partner_id()
  ), today AS (SELECT (now() AT TIME ZONE 'Asia/Manila')::date AS d)
  SELECT
    (SELECT count(*) FROM mine WHERE eff <> 'expired'),
    (SELECT count(*) FROM mine WHERE eff = 'confirmed' AND check_in BETWEEN (SELECT d FROM today) AND (SELECT d FROM today) + 7),
    (SELECT count(*) FROM mine WHERE eff IN ('confirmed','checked_in') AND check_in <= (SELECT d FROM today) AND check_out > (SELECT d FROM today)),
    (SELECT count(*) FROM mine WHERE eff = 'checked_out'),
    (SELECT count(*) FROM mine WHERE eff = 'cancelled');
$$;

CREATE FUNCTION public.get_partner_bookings(
  p_search text DEFAULT NULL, p_start_date date DEFAULT NULL, p_end_date date DEFAULT NULL,
  p_status text DEFAULT NULL, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0,
  p_sort_by text DEFAULT 'created_at_desc'
) RETURNS TABLE (
  booking_id uuid, booking_ref text, booking_date timestamptz, guest_name text, guest_email text,
  guest_phone text, guest_avatar_url text, listing_name text, listing_location text, listing_image text,
  check_in date, check_out date, adults_count integer, children_count integer, total_amount numeric,
  status text, room_type_name text, total_count bigint
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH prop AS (
    SELECT p.id, p.name, p.address,
      (SELECT pi.image_url FROM public.property_images pi WHERE pi.property_id = p.id
        ORDER BY pi.is_cover DESC, pi.display_order LIMIT 1) AS image
    FROM public.properties p
    WHERE public.is_approved_partner() AND p.partner_id = public.get_my_partner_id()
  ), rows AS (
    SELECT b.*, rt.name_en AS rt_name,
      public.partner_effective_status(b.status, b.hold_expires_at) AS eff,
      pr.first_name, pr.last_name, pr.email, pr.phone_number, pr.avatar_url
    FROM public.bookings b
    JOIN public.room_types rt ON rt.id = b.room_type_id
    JOIN prop ON prop.id = rt.property_id
    LEFT JOIN public.profiles pr ON pr.id = b.customer_id
  ), filtered AS (
    SELECT r.*, count(*) OVER () AS full_count FROM rows r
    WHERE (NULLIF(btrim(p_search), '') IS NULL
        OR r.reference ILIKE '%' || btrim(p_search) || '%'
        OR r.first_name ILIKE '%' || btrim(p_search) || '%'
        OR r.last_name ILIKE '%' || btrim(p_search) || '%'
        OR r.email ILIKE '%' || btrim(p_search) || '%'
        OR r.phone_number ILIKE '%' || btrim(p_search) || '%')
      AND (p_start_date IS NULL OR r.check_in >= p_start_date)
      AND (p_end_date IS NULL OR r.check_out <= p_end_date)
      AND (NULLIF(p_status, '') IS NULL OR r.eff = p_status)
  )
  SELECT f.id, f.reference, f.created_at,
    btrim(COALESCE(f.first_name, '') || ' ' || COALESCE(f.last_name, '')),
    COALESCE(f.email, ''), COALESCE(f.phone_number, ''), COALESCE(f.avatar_url, ''),
    (SELECT name FROM prop), COALESCE((SELECT address FROM prop), ''), COALESCE((SELECT image FROM prop), ''),
    f.check_in, f.check_out, f.adults_count, f.children_count, f.total_amount, f.eff, f.rt_name, f.full_count
  FROM filtered f
  ORDER BY
    CASE WHEN p_sort_by = 'created_at_asc'  THEN f.created_at END ASC,
    CASE WHEN p_sort_by = 'check_in_asc'    THEN f.check_in END ASC,
    CASE WHEN p_sort_by = 'check_in_desc'   THEN f.check_in END DESC,
    CASE WHEN p_sort_by = 'amount_asc'      THEN f.total_amount END ASC,
    CASE WHEN p_sort_by = 'amount_desc'     THEN f.total_amount END DESC,
    f.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION public.get_partner_bookings_stats(), public.get_partner_bookings(text, date, date, text, integer, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_partner_bookings_stats(), public.get_partner_bookings(text, date, date, text, integer, integer, text) TO authenticated;
```

- [ ] **Step 4: `…100800_partner_room_assignment_fixes.sql`:** redefine with `CREATE OR REPLACE` (same signatures):

```sql
-- Migration: partner_room_assignment_fixes
-- Down: re-run the function bodies from 20260907120000_partner_booking_detail_rpcs.sql.

-- A room is free for a booking when it is not in maintenance and no other active booking
-- with overlapping dates has it assigned.
CREATE OR REPLACE FUNCTION public.partner_room_conflicts(p_booking_id uuid, p_room_ids uuid[])
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.rooms r
  WHERE r.id = ANY (p_room_ids) AND (
    r.status = 'maintenance' OR EXISTS (
      SELECT 1 FROM public.booking_rooms br
      JOIN public.bookings o ON o.id = br.booking_id
      JOIN public.bookings me ON me.id = p_booking_id
      WHERE br.room_id = r.id AND o.id <> me.id
        AND o.status IN ('confirmed', 'checked_in')
        AND o.check_in < me.check_out AND o.check_out > me.check_in));
$$;
REVOKE ALL ON FUNCTION public.partner_room_conflicts(uuid, uuid[]) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.partner_assign_rooms(p_booking_id uuid, p_room_ids uuid[])
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status public.booking_status;
  v_room_type_id uuid;
  v_ids uuid[];
  v_count integer;
BEGIN
  SELECT g.status, g.room_type_id INTO v_status, v_room_type_id
  FROM public.get_my_partner_booking(p_booking_id) g;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;
  IF v_status NOT IN ('confirmed', 'checked_in') THEN RAISE EXCEPTION 'INVALID_STATUS_TRANSITION'; END IF;

  SELECT array_agg(DISTINCT x) INTO v_ids FROM unnest(p_room_ids) x;
  IF v_ids IS NULL THEN RAISE EXCEPTION 'INVALID_ROOM_COUNT'; END IF;

  -- Serialize assignments per room type.
  PERFORM 1 FROM public.room_types WHERE id = v_room_type_id FOR UPDATE;

  IF (SELECT count(*) FROM public.rooms WHERE id = ANY (v_ids) AND room_type_id = v_room_type_id) <> cardinality(v_ids) THEN
    RAISE EXCEPTION 'INVALID_ROOM';
  END IF;
  IF EXISTS (SELECT 1 FROM public.booking_rooms WHERE booking_id = p_booking_id AND room_id = ANY (v_ids)) THEN
    RAISE EXCEPTION 'ROOM_ALREADY_ASSIGNED';
  END IF;
  IF public.partner_room_conflicts(p_booking_id, v_ids) > 0 THEN
    RAISE EXCEPTION 'ROOM_UNAVAILABLE';
  END IF;

  INSERT INTO public.booking_rooms (booking_id, room_id) SELECT p_booking_id, x FROM unnest(v_ids) x;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_status = 'checked_in' THEN
    UPDATE public.rooms SET status = 'occupied', updated_at = now() WHERE id = ANY (v_ids);
  END IF;

  INSERT INTO public.booking_status_history (booking_id, from_status, to_status, changed_by, note)
  VALUES (p_booking_id, v_status, v_status, auth.uid(), v_count || ' room(s) assigned');
  RETURN v_count::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.partner_unassign_rooms(p_booking_id uuid, p_room_ids uuid[])
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status public.booking_status;
  v_count integer;
BEGIN
  SELECT g.status INTO v_status FROM public.get_my_partner_booking(p_booking_id) g;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;
  IF v_status <> 'confirmed' THEN RAISE EXCEPTION 'INVALID_STATUS_TRANSITION'; END IF;
  IF p_room_ids IS NULL OR cardinality(p_room_ids) = 0 THEN RAISE EXCEPTION 'INVALID_ROOM_COUNT'; END IF;

  DELETE FROM public.booking_rooms WHERE booking_id = p_booking_id AND room_id = ANY (p_room_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO public.booking_status_history (booking_id, from_status, to_status, changed_by, note)
  VALUES (p_booking_id, v_status, v_status, auth.uid(), v_count || ' room(s) unassigned');
  RETURN v_count::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.partner_release_rooms(p_booking_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.rooms r SET status = 'available', updated_at = now()
  FROM public.booking_rooms br
  WHERE br.booking_id = p_booking_id AND br.room_id = r.id AND r.status = 'occupied'
    AND NOT EXISTS (
      SELECT 1 FROM public.booking_rooms br2 JOIN public.bookings o ON o.id = br2.booking_id
      WHERE br2.room_id = r.id AND o.id <> p_booking_id AND o.status = 'checked_in');
$$;
REVOKE ALL ON FUNCTION public.partner_release_rooms(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.partner_check_in_booking(p_booking_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status public.booking_status;
BEGIN
  SELECT g.status INTO v_status FROM public.get_my_partner_booking(p_booking_id) g;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;
  IF v_status <> 'confirmed' THEN RAISE EXCEPTION 'INVALID_STATUS_TRANSITION'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.booking_rooms WHERE booking_id = p_booking_id) THEN
    RAISE EXCEPTION 'ROOMS_NOT_ASSIGNED';
  END IF;

  UPDATE public.bookings SET status = 'checked_in', updated_at = now() WHERE id = p_booking_id;
  UPDATE public.rooms r SET status = 'occupied', updated_at = now()
  FROM public.booking_rooms br WHERE br.booking_id = p_booking_id AND br.room_id = r.id;

  INSERT INTO public.booking_status_history (booking_id, from_status, to_status, changed_by, note)
  VALUES (p_booking_id, v_status, 'checked_in', auth.uid(), 'Checked in');
  RETURN 'checked_in';
END;
$$;

CREATE OR REPLACE FUNCTION public.partner_check_out_booking(p_booking_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status public.booking_status;
BEGIN
  SELECT g.status INTO v_status FROM public.get_my_partner_booking(p_booking_id) g;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;
  IF v_status <> 'checked_in' THEN RAISE EXCEPTION 'INVALID_STATUS_TRANSITION'; END IF;

  UPDATE public.bookings SET status = 'checked_out', updated_at = now() WHERE id = p_booking_id;
  PERFORM public.partner_release_rooms(p_booking_id);

  INSERT INTO public.booking_status_history (booking_id, from_status, to_status, changed_by, note)
  VALUES (p_booking_id, v_status, 'checked_out', auth.uid(), 'Checked out');
  RETURN 'checked_out';
END;
$$;

CREATE OR REPLACE FUNCTION public.partner_cancel_booking(p_booking_id uuid, p_reason text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status public.booking_status;
  v_new public.booking_status;
BEGIN
  SELECT g.status INTO v_status FROM public.get_my_partner_booking(p_booking_id) g;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;
  IF NOT public.can_manage_partner() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF v_status NOT IN ('pending_payment', 'confirmed', 'checked_in') THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION';
  END IF;

  v_new := CASE WHEN EXISTS (SELECT 1 FROM public.payments WHERE booking_id = p_booking_id AND status = 'paid')
    THEN 'refund_pending'::public.booking_status ELSE 'cancelled'::public.booking_status END;

  UPDATE public.bookings SET status = v_new, updated_at = now() WHERE id = p_booking_id;
  PERFORM public.partner_release_rooms(p_booking_id);

  INSERT INTO public.booking_status_history (booking_id, from_status, to_status, changed_by, note)
  VALUES (p_booking_id, v_status, v_new, auth.uid(), COALESCE('Cancelled: ' || NULLIF(left(btrim(p_reason), 500), ''), 'Cancelled'));
  RETURN v_new::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_partner_booking_detail(p_booking_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM 1 FROM public.get_my_partner_booking(p_booking_id);
  IF NOT FOUND THEN RETURN NULL; END IF;

  RETURN (
    SELECT jsonb_build_object(
      'booking', to_jsonb(b) || jsonb_build_object('effective_status', public.partner_effective_status(b.status, b.hold_expires_at)),
      'guest', (SELECT jsonb_build_object('id', pr.id, 'first_name', pr.first_name, 'last_name', pr.last_name,
                  'email', pr.email, 'phone_number', pr.phone_number, 'avatar_url', pr.avatar_url)
                FROM public.profiles pr WHERE pr.id = b.customer_id),
      'room_type', (SELECT to_jsonb(rt) FROM public.room_types rt WHERE rt.id = b.room_type_id),
      'rate_plan', (SELECT to_jsonb(rp) FROM public.rate_plans rp WHERE rp.id = b.rate_plan_id),
      'property', (SELECT to_jsonb(pp) FROM public.properties pp
                   WHERE pp.id = (SELECT rt.property_id FROM public.room_types rt WHERE rt.id = b.room_type_id)),
      'payments', (SELECT COALESCE(jsonb_agg(to_jsonb(pay) ORDER BY pay.created_at), '[]'::jsonb)
                   FROM public.payments pay WHERE pay.booking_id = b.id),
      'assigned_rooms', (SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.room_number), '[]'::jsonb)
                         FROM public.booking_rooms br JOIN public.rooms r ON r.id = br.room_id WHERE br.booking_id = b.id),
      'available_rooms', (SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.room_number), '[]'::jsonb)
                          FROM public.rooms r
                          WHERE r.room_type_id = b.room_type_id
                            AND NOT EXISTS (SELECT 1 FROM public.booking_rooms x WHERE x.booking_id = b.id AND x.room_id = r.id)
                            AND public.partner_room_conflicts(b.id, ARRAY[r.id]) = 0),
      'status_history', (SELECT COALESCE(jsonb_agg(to_jsonb(h) ORDER BY h.created_at), '[]'::jsonb)
                         FROM public.booking_status_history h WHERE h.booking_id = b.id))
    FROM public.bookings b WHERE b.id = p_booking_id);
END;
$$;
```

- [ ] **Step 5:** Reset + all tests → PASS.
- [ ] **Step 6:** Commit `feat(db): partner bookings show real guests; safe room assignment`.

---

### Task 8: Server-side guard + error mapping

**Files:** Create `src/lib/auth/partner-guard.ts`, `src/lib/api/db-errors.ts`.

**Interfaces — Produces:**
```ts
export type PartnerContext = { userId: string; partnerId: string; propertyId: string | null; canManage: boolean };
export type PartnerGuardResult =
  | { ok: true; ctx: PartnerContext; supabase: Awaited<ReturnType<typeof createClient>> }
  | { ok: false; error: ActionResult<never> };
export async function requirePartner(options?: { manage?: boolean }): Promise<PartnerGuardResult>;

export function mapDbError(error: { message?: string | null } | null | undefined, fallbackCode: string): { code: string; message: string };
export function dbFailure(error: { message?: string | null } | null | undefined, fallbackCode: string): ActionResult<never>;
```

- [ ] **Step 1: `partner-guard.ts`:**

```ts
import { createClient } from "@/src/lib/supabase/server";
import { failure, type ActionResult } from "@/src/lib/api/response";

export type PartnerContext = {
  userId: string;
  partnerId: string;
  propertyId: string | null;
  canManage: boolean;
};

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export type PartnerGuardResult =
  | { ok: true; ctx: PartnerContext; supabase: ServerClient }
  | { ok: false; error: ActionResult<never> };

/**
 * Resolves the calling partner from the session — never from client input.
 * `manage` additionally requires owner or manager staff (front desk is read/check-in only).
 * RLS enforces the same rules; this guard gives a clear error before hitting the database.
 */
export async function requirePartner(
  { manage = false }: { manage?: boolean } = {}
): Promise<PartnerGuardResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: failure("auth.unauthorized", "You must be signed in.") };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, staff_role, partner_id, partner:partners(status)")
    .eq("id", user.id)
    .single();

  const partner = Array.isArray(profile?.partner) ? profile?.partner[0] : profile?.partner;
  const isPartnerRole = profile?.role === "partner_owner" || profile?.role === "partner_staff";
  if (!profile?.partner_id || !isPartnerRole || partner?.status !== "approved") {
    return {
      ok: false,
      error: failure("partner.not_approved", "Your partner account is not approved yet."),
    };
  }

  const canManage =
    profile.role === "partner_owner" ||
    (profile.role === "partner_staff" && profile.staff_role === "manager");
  if (manage && !canManage) {
    return {
      ok: false,
      error: failure("partner.forbidden", "Your staff role can't change property settings."),
    };
  }

  const { data: property } = await supabase
    .from("properties")
    .select("id")
    .eq("partner_id", profile.partner_id)
    .maybeSingle();

  return {
    ok: true,
    supabase,
    ctx: {
      userId: user.id,
      partnerId: profile.partner_id,
      propertyId: property?.id ?? null,
      canManage,
    },
  };
}
```

- [ ] **Step 2: `db-errors.ts`:**

```ts
import { failure, type ActionResult } from "@/src/lib/api/response";

// Reason codes raised by DB functions (RAISE EXCEPTION '<CODE>') → client-safe code + fallback copy.
// Codes double as i18n keys once the i18n catalogue lands.
const KNOWN: Record<string, { code: string; message: string }> = {
  UNAUTHENTICATED: { code: "booking.unauthenticated", message: "Please sign in to book your stay." },
  PROPERTY_UNAVAILABLE: { code: "booking.property_unavailable", message: "This property isn't taking bookings right now." },
  RATE_PLAN_INVALID: { code: "booking.rate_plan_invalid", message: "That rate isn't available for this room." },
  INVALID_DATES: { code: "booking.invalid_dates", message: "Please choose valid dates (up to 30 nights, starting today or later)." },
  MIN_STAY_NOT_MET: { code: "booking.min_stay_not_met", message: "These dates need a longer minimum stay." },
  CLOSED_TO_ARRIVAL: { code: "booking.closed_to_arrival", message: "Check-in isn't available on that date." },
  CLOSED_TO_DEPARTURE: { code: "booking.closed_to_departure", message: "Check-out isn't available on that date." },
  OVER_CAPACITY: { code: "booking.over_capacity", message: "Too many guests for this room." },
  SOLD_OUT: { code: "booking.sold_out", message: "This room is sold out for your dates." },
  FORBIDDEN: { code: "partner.forbidden", message: "You don't have permission to do that." },
  BOOKING_NOT_FOUND: { code: "booking.not_found", message: "Booking not found." },
  INVALID_STATUS_TRANSITION: { code: "booking.invalid_transition", message: "That action isn't allowed for this booking's status." },
  ROOM_UNAVAILABLE: { code: "booking.room_unavailable", message: "That room is under maintenance or assigned to another guest for these dates." },
  ROOM_ALREADY_ASSIGNED: { code: "booking.room_already_assigned", message: "That room is already assigned to this booking." },
  ROOMS_NOT_ASSIGNED: { code: "booking.rooms_not_assigned", message: "Assign a room before checking in." },
  INVALID_ROOM: { code: "booking.invalid_room", message: "That room doesn't belong to this booking's room type." },
  INVALID_ROOM_COUNT: { code: "booking.invalid_room_count", message: "Select at least one room." },
};

const GENERIC = { message: "Something went wrong. Please try again." };

export function mapDbError(
  error: { message?: string | null } | null | undefined,
  fallbackCode: string
): { code: string; message: string } {
  const raw = error?.message?.trim() ?? "";
  return KNOWN[raw] ?? { code: fallbackCode, message: GENERIC.message };
}

export function dbFailure(
  error: { message?: string | null } | null | undefined,
  fallbackCode: string
): ActionResult<never> {
  const mapped = mapDbError(error, fallbackCode);
  return failure(mapped.code, mapped.message);
}
```

- [ ] **Step 3:** `npx tsc --noEmit -p .` → no new errors (baseline: 6 `dip.png` errors only).
- [ ] **Step 4:** Commit `feat: add partner guard and DB error mapping`.

---

### Task 9: Rewrite partner actions on the session client

**Files:** Modify `src/actions/partner/property.ts`, `rooms.ts`, `rates.ts`, `availability.ts`, and call sites in `property-management.tsx`, `rooms-management.tsx`, `rates-management.tsx`, `availability-calendar.tsx`. Delete `update-property.ts`, `add-room.ts`, `property-form.tsx`, `add-room-form.tsx`, `room-type-form.tsx`.

**Interfaces — Consumes:** `requirePartner`, `dbFailure`. **Produces (new signatures):**
```ts
savePropertyDetails(data: PropertyDetailsInput): Promise<ActionResult<{ propertyId: string }>>
uploadPropertyImage(formData: FormData): Promise<ActionResult<{ id: string; imageUrl: string }>>
deletePropertyImage(imageId: string): Promise<ActionResult<void>>
setCoverPropertyImage(imageId: string): Promise<ActionResult<void>>
createRoomType(data: RoomTypeInput): Promise<ActionResult<{ id: string }>>
updateRoomType(roomTypeId: string, data: RoomTypeInput): Promise<ActionResult<void>>
deleteRoomType(roomTypeId: string): Promise<ActionResult<void>>
addRoomUnit(roomTypeId: string, data: RoomUnitInput): Promise<ActionResult<{ id: string }>>      // unchanged shape
updateRoomUnitStatus(roomId: string, status: RoomStatus): Promise<ActionResult<void>>             // unchanged
deleteRoomUnit(roomId: string): Promise<ActionResult<void>>                                        // unchanged
batchCreateRoomUnits(roomTypeId: string, prefix: string, startNumber: number, count: number, floor?: string) // unchanged
createRatePlan / updateRatePlan / deleteRatePlan                                                  // unchanged
createPricingRule(data: PricingRuleInput): Promise<ActionResult<{ id: string }>>
updatePricingRule(ruleId: string, data: PricingRuleInput): Promise<ActionResult<void>>
togglePricingRule / deletePricingRule                                                             // unchanged
fetchMonthlyAvailability(roomTypeId, year, month) → days[date] gains `booked: number; rooms_left: number`
saveDailyOverride / bulkUpdateAvailability / resetAvailabilityDates                               // unchanged shape
```

Rules applied to every action in this task (each is listed explicitly per file below):
1. First line: `const guard = await requirePartner({ manage: true }); if (!guard.ok) return guard.error; const { supabase, ctx } = guard;` (`fetchMonthlyAvailability` uses `requirePartner()` without `manage`).
2. Validate every id argument with `idSchema = z.string().uuid()`; invalid → `failure("validation.failed", "Invalid request.")`.
3. All reads/writes use `supabase` (session); remove `createAdminClient` imports from these four files.
4. `propertyId` comes from `ctx.propertyId`; if null where required → `failure("property.missing", "Create your property profile first.")`.
5. DB errors → `return dbFailure(error, "<domain>.<op>_failed")`; never `+ error.message`.
6. A write that RLS silently filters (0 rows) must report not-found: use `.select("id")` on update/delete and check `data?.length`.

- [ ] **Step 1: `property.ts`** — `savePropertyDetails(data)`:

```ts
export async function savePropertyDetails(
  data: PropertyDetailsInput
): Promise<ActionResult<{ propertyId: string }>> {
  try {
    const guard = await requirePartner({ manage: true });
    if (!guard.ok) return guard.error;
    const { supabase } = guard;

    const parsed = propertyDetailsSchema.safeParse(data);
    if (!parsed.success) {
      return failure("validation.failed", "Please fix form validation errors.", parsed.error.flatten().fieldErrors);
    }

    const { data: propertyId, error } = await supabase.rpc("save_property_details_rpc", {
      p_name: parsed.data.name,
      p_property_type: parsed.data.property_type,
      p_area_id: parsed.data.area_id,
      p_description_en: parsed.data.description_en,
      p_description_fil: parsed.data.description_fil,
      p_address: parsed.data.address,
      p_latitude: parsed.data.latitude ?? null,
      p_longitude: parsed.data.longitude ?? null,
      p_check_in_time: parsed.data.check_in_time,
      p_check_out_time: parsed.data.check_out_time,
      p_early_checkin_fee: parsed.data.early_checkin_fee,
      p_late_checkout_fee: parsed.data.late_checkout_fee,
      p_downpayment_rate: parsed.data.downpayment_rate,
      p_amenity_ids: parsed.data.amenity_ids,
    });
    if (error || !propertyId) {
      console.error("savePropertyDetails failed:", error);
      return dbFailure(error, "property.save_failed");
    }

    revalidatePath("/dashboard/property");
    revalidatePath("/dashboard");
    revalidatePath("/search");
    return success({ propertyId });
  } catch (err) {
    console.error("Unexpected error in savePropertyDetails:", err);
    return failure("unexpected.error", "An error occurred while saving property details.");
  }
}
```

`uploadPropertyImage(formData)`: guard(manage) → require `ctx.propertyId` → same file checks as today → `storagePath = \`${ctx.partnerId}/${ctx.propertyId}/${Date.now()}_${sanitizedFilename}\`` → `supabase.storage.from("property-images").upload(...)` → `getPublicUrl` → count existing via `supabase.from("property_images").select("id", { count: "exact", head: true }).eq("property_id", ctx.propertyId)` → insert with session client; on insert failure remove the uploaded object (`supabase.storage.from("property-images").remove([storagePath])`) so storage doesn't leak orphans.

`deletePropertyImage(imageId)`: guard(manage) → uuid check → select `id, is_cover, storage_path` by `id` and `property_id = ctx.propertyId` → delete row with `.select("id")` → promote next cover as today → `supabase.storage…remove([storage_path])`; log (not fail) storage removal error.

`setCoverPropertyImage(imageId)`: guard(manage) → uuid check → verify image exists for `ctx.propertyId` first (select) → clear covers → set cover; all with session client.

- [ ] **Step 2: `rooms.ts`:** `createRoomType(data)` inserts with `property_id: ctx.propertyId`; `updateRoomType(roomTypeId, data)` updates `.eq("id", roomTypeId).eq("property_id", ctx.propertyId).select("id")`; `deleteRoomType(roomTypeId)` first checks bookings: `supabase.from("bookings").select("id", { count: "exact", head: true }).eq("room_type_id", roomTypeId)` — if count > 0 return `failure("room_type.has_bookings", "This room type has bookings and can't be deleted.")`; else delete rooms then room type (both `.select("id")`). Unit actions: guard(manage) + uuid checks + session client; ownership is enforced by RLS (`rooms_manage`) and a zero-row result returns `failure("room.not_found", "Room unit not found.")`. `batchCreateRoomUnits` additionally validates `prefix` (≤ 20 chars) and `startNumber` (integer ≥ 0) with Zod.
- [ ] **Step 3: `rates.ts`:** every function guard(manage) + session client. `createPricingRule(data)`/`updatePricingRule(ruleId, data)` use `property_id: ctx.propertyId` / `.eq("property_id", ctx.propertyId)`. Add to `pricingRuleSchema` a `.refine(d => !d.start_date || !d.end_date || d.end_date >= d.start_date, { message: "End date must be on or after start date", path: ["end_date"] })` and make date fields `z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable()`. `deleteRatePlan`: plans referenced by bookings keep history via `ON DELETE SET NULL` (Task 2), so delete stays allowed.
- [ ] **Step 4: `availability.ts`:** `fetchMonthlyAvailability` → `requirePartner()`; read `room_types` (`base_price, total_inventory`) and the month's overrides with the session client, plus `supabase.rpc("get_partner_room_calendar", { p_room_type_id, p_from: startStr, p_to: endStr })`; merge `booked` and `rooms_left` by date into `DayAvailabilityRecord` (add both fields to the interface). `saveDailyOverride`, `bulkUpdateAvailability` → guard(manage), session client (`bulk_upsert_availability_rpc` is now INVOKER). `resetAvailabilityDates` → guard(manage), uuid + date regex validation, session delete.
- [ ] **Step 5: Call sites:**
  - `property-management.tsx:136` → `savePropertyDetails(payload)`; `:163` → `uploadPropertyImage(data)`; `:187` → `deletePropertyImage(imageId)`; `:201` → `setCoverPropertyImage(imageId)`. Remove now-unused `partnerId` usage only if nothing else in the component reads it.
  - `rooms-management.tsx:130` → `updateRoomType(editingType.id, typeForm)`; `:153` → `createRoomType(typeForm)`; `:187` → `deleteRoomType(roomTypeId)`.
  - `rates-management.tsx:284` → `updatePricingRule(editingRule.id, ruleForm)`; `:305` → `createPricingRule(ruleForm)`.
  - `availability-calendar.tsx`: in the day cell, under the count, render `{day.booked > 0 && <span>{day.rooms_left} of {day.available_count} left</span>}` styled like the existing secondary text in that cell (read the component and reuse its class names).
- [ ] **Step 6:** Delete dead files: `git rm src/actions/partner/update-property.ts src/actions/partner/add-room.ts src/components/partner/property-form.tsx src/components/partner/add-room-form.tsx src/components/partner/room-type-form.tsx`. Confirm `grep -rn "admin" src/actions/partner/{property,rooms,rates,availability}.ts` returns nothing.
- [ ] **Step 7:** `npx tsc --noEmit -p .` → only baseline errors.
- [ ] **Step 8:** Commit `fix(partner): enforce ownership via session client and RLS in partner actions`.

---

### Task 10: Partner bookings UI + dashboard on real data

**Files:** Modify `src/app/(partner)/dashboard/bookings/page.tsx`, `src/components/partner/bookings/BookingsPageContent.tsx`, `src/components/partner/bookings/BookingDetailContent.tsx` (error mapping only), `src/app/(partner)/dashboard/page.tsx`; delete `src/lib/dashboard/mock-data.ts` if unused afterwards.

**Interfaces — Consumes:** `get_partner_bookings(...)` (no `p_partner_id`), `get_partner_bookings_stats()`, `get_partner_dashboard_stats()`, `mapDbError`.

- [ ] **Step 1:** Remove `p_partner_id` from every `rpc("get_partner_bookings"…)`, `rpc("get_partner_bookings_stats"…)` and `rpc("get_partner_dashboard_stats"…)` call (`bookings/page.tsx:21,26`, `BookingsPageContent.tsx:60,93`, `dashboard/page.tsx:28`). Drop the now-unused `partnerId` prop if it has no other use.
- [ ] **Step 2:** `BookingDetailContent.tsx:138` — after `rpc(rpcName, …)`, on error show `mapDbError(error, "booking.action_failed").message` instead of the raw message (read the component's current error display and keep its toast/inline pattern).
- [ ] **Step 3:** Dashboard home: replace `mockRecentBookings` with `get_partner_bookings({ p_limit: 5, p_sort_by: "created_at_desc" })` mapped to the `RecentBookings` prop type (read `RecentBookings.tsx` and `mock-data.ts` for the exact shape; map `booking_ref → id/ref`, `guest_name`, `check_in`, `check_out`, `status`, `total_amount`). Replace `mockListings` with the partner's property (`properties` select `id, name, address, status` + cover image) mapped to `ListingsSection`'s item type; if no property, pass `[]` (the section's empty state handles it — verify it has one; if not, render a link to `/dashboard/property` using the existing button style). `mockQuickActions` is static navigation config, not fake data: move it into `QuickActions.tsx` as a module constant and delete `mock-data.ts`.
- [ ] **Step 4:** `npx tsc --noEmit -p .` → baseline only. Commit `fix(partner): bookings list and dashboard use real partner data`.

---

### Task 11: `/api/bookings` POST → `create_booking`

**Files:** Modify `src/app/api/bookings/route.ts` (POST only).

**Interfaces — Consumes:** `create_booking`, `mapDbError`. **Produces:** same JSON shape as today (`{ success, message, booking: { id, referenceNumber, propertyName, roomName, areaName, checkIn, checkOut, nights, adults, children, nightlyRate, totalAmount, downpaymentAmount, balanceDue, status, holdExpiresAt } }`), with `referenceNumber` from the DB and HTTP 409 for `SOLD_OUT`, 400 for other reason codes.

- [ ] **Step 1:** Replace POST body with:

```ts
const bookingBodySchema = z.object({
  roomTypeId: z.string().uuid(),
  ratePlanId: z.string().uuid().nullish(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.coerce.number().int().min(1).max(20).default(1),
  children: z.coerce.number().int().min(0).max(20).default(0),
  specialRequests: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "UNAUTHENTICATED", message: "Please sign in or create an account to book your stay" },
        { status: 401 }
      );
    }

    const parsed = bookingBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "validation.failed", message: "Please choose a room and valid dates." },
        { status: 400 }
      );
    }
    const b = parsed.data;

    const { data, error } = await supabase.rpc("create_booking", {
      p_room_type_id: b.roomTypeId,
      p_rate_plan_id: b.ratePlanId ?? null,
      p_check_in: b.checkIn,
      p_check_out: b.checkOut,
      p_adults: b.adults,
      p_children: b.children,
      p_special_requests: b.specialRequests ?? null,
    });
    if (error || !data) {
      const mapped = mapDbError(error, "booking.create_failed");
      if (mapped.code === "booking.create_failed") console.error("create_booking failed:", error);
      const status = mapped.code === "booking.sold_out" ? 409 : mapped.code === "booking.create_failed" ? 500 : 400;
      return NextResponse.json({ success: false, error: mapped.code, message: mapped.message }, { status });
    }

    const { data: rt } = await supabase
      .from("room_types")
      .select("name_en, property:properties(name, area:areas(name_en))")
      .eq("id", b.roomTypeId)
      .single();
    const property = Array.isArray(rt?.property) ? rt?.property[0] : rt?.property;
    const area = Array.isArray(property?.area) ? property?.area[0] : property?.area;
    const nights = Number(data.nights);

    return NextResponse.json({
      success: true,
      message: `Reservation held for ${property?.name ?? "your stay"}`,
      booking: {
        id: data.booking_id,
        referenceNumber: data.reference,
        propertyName: property?.name ?? "",
        roomName: rt?.name_en ?? "",
        areaName: area?.name_en ?? "Quezon",
        checkIn: data.check_in,
        checkOut: data.check_out,
        nights,
        adults: b.adults,
        children: b.children,
        nightlyRate: Math.round((Number(data.subtotal) / nights) * 100) / 100,
        totalAmount: Number(data.total),
        downpaymentAmount: Number(data.downpayment),
        balanceDue: Number(data.balance),
        status: data.status,
        holdExpiresAt: data.hold_expires_at,
      },
    });
  } catch (error) {
    console.error("Unexpected error in POST /api/bookings:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
```

Remove the now-unused `isUUID` helper if GET doesn't use it, and the `createAdminClient` import only if GET no longer needs it (GET is unchanged and still uses it).
- [ ] **Step 2:** The search page currently sends `propertyId` and an optional `roomTypeId`. Confirm `search-page-content.tsx:118` always sends `roomTypeId` from `selectedRoom?.id`; the new route requires it — when absent the user gets a 400 "Please choose a room and valid dates." (acceptable; customer UI rewiring is out of scope, noted in summary).
- [ ] **Step 3:** `npx tsc --noEmit -p .` → baseline. Commit `fix(api): route instant booking through create_booking RPC`.

---

### Task 12: Docs, types, full verification

**Files:** Modify `CLAUDE.md`, `AGENTS.md`, `.claude/rules/backend.md`, `dip_schema_v3.dbml` (room_type_availability note), `src/types/database.types.ts`.

- [ ] **Step 1: CLAUDE.md** rule 3 → "**Booking-critical paths are transactional.** `create_booking()` locks the room type (`SELECT … FOR UPDATE`), recomputes the quote from `stay_nights()`, checks rooms left (allotment − active bookings), and inserts the booking + status history in one transaction. Partial success is a bug, not an edge case."
- [ ] **Step 2: AGENTS.md §5.4/§5.5 and `.claude/rules/backend.md`:** replace "decremented"/"decrement" wording with: "`room_type_availability.available_count` is the partner's allotment for that night (default `room_types.total_inventory`). Rooms left = allotment − active bookings (`confirmed`, `checked_in`, or `pending_payment` with unexpired hold). Expired holds stop counting immediately; the hold-expiry job only relabels status to `expired`." Replace the §5.5 SQL sample with the `FOR UPDATE` on `room_types` + `stay_nights()` pattern. dbml note on `room_type_availability` updated likewise.
- [ ] **Step 3: `database.types.ts`:** confirm `Booking` has `reference`, `rate_plan_id`, `special_requests` (Task 2).
- [ ] **Step 4: DB:** `npx supabase@2 db reset && npx supabase@2 test db` → all files PASS; `bash supabase/tests/concurrency/last_room.sh` → PASS; reset again.
- [ ] **Step 5: App:** `npm run build` → succeeds (also generates `next-env.d.ts`, clearing the baseline `.png` type errors). Lint: `npx eslint src` currently crashes inside `eslint-plugin-react` (pre-existing ESLint 10 incompatibility) — record as a known gap, do not fix in this branch.
- [ ] **Step 6: Manual run** against local Supabase: create `.env.local` pointing at `http://127.0.0.1:54321` with the local anon/service keys from `npx supabase@2 status` (do not commit). Seed an approved partner with a property + room type + rate plan via the fixtures (committed variant). `npm run dev`, then with the `run`/`webapp-testing` skill:
  1. Log in as owner A → visit property, rooms, rates, availability, bookings, dashboard; perform one save on each; screenshot at 375px and 1280px.
  2. Log in as customer X → search → instant book → toast shows `DIP-XXXXXXXX`.
  3. Back as owner A → bookings list shows that guest with the same reference; calendar shows "1 of 2 left" on those nights.
  4. Log in as front desk → rates save is rejected with the friendly message.
- [ ] **Step 7:** Commit `docs: describe derived inventory model and booking contract`.

---

## Self-review notes

- Spec coverage: lockdown (Tasks 3, 8, 9), contract (4, 6, 11), bookings fixes (7, 10), audit (5; `partners` deliberately excluded with reason), testing (1–7, 12), docs (12). Spec says audit triggers include `partners` — superseded here because approvals run as service role (actor would be lost); spec updated in Task 12 Step 2 commit.
- `get_property_offers` returns one offer per room type when it has no rate plans (`rp.id` null via LEFT JOIN) — covered by fixture `e…a1` having a plan; add `e…b1` offer count assertion if time permits.
