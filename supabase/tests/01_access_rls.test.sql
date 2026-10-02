BEGIN;
\ir fixtures.psql
SELECT plan(24);

-- Sensitive rows that anonymous and unrelated users must never see.
SET LOCAL session_replication_role = replica;
INSERT INTO public.bookings (id, customer_id, room_type_id, check_in, check_out, subtotal, total_amount, downpayment_amount, status)
VALUES ('71000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-0000000000c2', 'e0000000-0000-0000-0000-0000000000a1',
        :'d0'::date, :'d0'::date + 1, 3000, 3000, 900, 'confirmed');
INSERT INTO public.payments (booking_id, transaction_reference, amount, status)
VALUES ('71000000-0000-0000-0000-000000000001', 'test-txn-1', 900, 'paid');
INSERT INTO public.payment_events (external_event_id, payload) VALUES ('evt_test_1', '{}');
INSERT INTO public.audit_logs (action, entity_type, entity_id) VALUES ('update', 'properties', 'd0000000-0000-0000-0000-00000000000a');
INSERT INTO public.guest_id_documents (booking_id, uploaded_by, document_url)
VALUES ('71000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-0000000000c2', 'private/doc.pdf');
SET LOCAL session_replication_role = origin;

-- Schema
SELECT has_column('public', 'bookings', 'reference', 'bookings.reference exists');
SELECT col_is_unique('public', 'bookings', 'reference', 'reference unique');
SELECT has_column('public', 'bookings', 'rate_plan_id', 'bookings.rate_plan_id exists');

-- Partner A cannot touch partner B
SELECT pg_temp.tests_login('a0000000-0000-0000-0000-00000000000a');
SELECT is((SELECT count(*)::int FROM public.rooms WHERE room_type_id = 'e0000000-0000-0000-0000-0000000000b1'), 0, 'A cannot read B rooms');
UPDATE public.room_types SET base_price = 1 WHERE id = 'e0000000-0000-0000-0000-0000000000b1';
SELECT pg_temp.tests_logout();
SELECT is((SELECT base_price FROM public.room_types WHERE id = 'e0000000-0000-0000-0000-0000000000b1'), 2000.00::numeric, 'A cannot update B room type');

SELECT pg_temp.tests_login('a0000000-0000-0000-0000-00000000000a');
SELECT throws_ok($$INSERT INTO public.rate_plans (room_type_id, name_en) VALUES ('e0000000-0000-0000-0000-0000000000b1', 'Hack')$$,
  '42501', NULL, 'A cannot add rate plan to B');
SELECT throws_ok($$INSERT INTO public.room_type_availability (room_type_id, date, available_count) VALUES ('e0000000-0000-0000-0000-0000000000b1', current_date + 5, 0)$$,
  '42501', NULL, 'A cannot block B dates');
SELECT lives_ok($$UPDATE public.rate_plans SET price_modifier = 600 WHERE id = 'f0000000-0000-0000-0000-0000000000a1'$$, 'A can edit own rate plan');
DELETE FROM public.rooms WHERE id = '90000000-0000-0000-0000-0000000000a3';
SELECT pg_temp.tests_logout();
SELECT is((SELECT count(*)::int FROM public.rooms WHERE id = '90000000-0000-0000-0000-0000000000a3'), 0, 'A can delete own room unit');

-- Front desk is read-only for configuration
SELECT pg_temp.tests_login('a0000000-0000-0000-0000-0000000000aa');
SELECT is((SELECT count(*)::int FROM public.room_types WHERE id = 'e0000000-0000-0000-0000-0000000000a1'), 1, 'front desk can read own room type');
UPDATE public.rate_plans SET price_modifier = 1 WHERE id = 'f0000000-0000-0000-0000-0000000000a1';
SELECT pg_temp.tests_logout();
SELECT is((SELECT price_modifier FROM public.rate_plans WHERE id = 'f0000000-0000-0000-0000-0000000000a1'), 600.00::numeric, 'front desk cannot edit rate plan');

-- Pending partner cannot write
SELECT pg_temp.tests_login('a0000000-0000-0000-0000-00000000000c');
SELECT throws_ok($$INSERT INTO public.room_types (property_id, name_en, base_price) VALUES ('d0000000-0000-0000-0000-00000000000c', 'x', 1)$$,
  '42501', NULL, 'pending partner cannot add room types');
SELECT pg_temp.tests_logout();

-- Public visibility and sensitive tables
SELECT pg_temp.tests_anon();
SELECT is((SELECT count(*)::int FROM public.properties WHERE id = 'd0000000-0000-0000-0000-00000000000c'), 0, 'pending partner property hidden from public');
SELECT is((SELECT count(*)::int FROM public.properties WHERE id = 'd0000000-0000-0000-0000-00000000000a'), 1, 'approved published property visible');
SELECT is((SELECT count(*)::int FROM public.rooms), 0, 'anon cannot list room units');
SELECT is((SELECT count(*)::int FROM public.payments), 0, 'anon cannot read payments');
SELECT is((SELECT count(*)::int FROM public.audit_logs), 0, 'anon cannot read audit logs');
SELECT is((SELECT count(*)::int FROM public.payment_events), 0, 'anon cannot read payment events');
SELECT throws_ok($$INSERT INTO public.audit_logs (action, entity_type, entity_id) VALUES ('create', 'x', gen_random_uuid())$$,
  '42501', NULL, 'anon cannot write audit logs');
SELECT throws_ok($$SELECT public.update_user_role('a0000000-0000-0000-0000-0000000000c1', 'admin')$$,
  '42501', NULL, 'anon cannot call update_user_role');
SELECT throws_ok($$SELECT public.bulk_upsert_availability_rpc('e0000000-0000-0000-0000-0000000000a1', current_date, current_date, 0, NULL, NULL, false, false)$$,
  '42501', NULL, 'anon cannot bulk edit availability');
SELECT pg_temp.tests_logout();

-- Customers cannot use partner RPCs or read other guests' IDs
SELECT pg_temp.tests_login('a0000000-0000-0000-0000-0000000000c1');
SELECT throws_ok($$SELECT public.save_property_details_rpc('Hijack', 'resort', 'c0000000-0000-0000-0000-000000000001', 'descr long', 'descr long', 'addr', NULL, NULL, '14:00', '12:00', 0, 0, 0.3, ARRAY[]::uuid[])$$,
  'FORBIDDEN', 'customer cannot save property');
SELECT is((SELECT count(*)::int FROM public.guest_id_documents), 0, 'customer sees no foreign guest IDs');
SELECT pg_temp.tests_logout();

SELECT is((SELECT count(*)::int FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity), 0, 'every public table has RLS');

SELECT * FROM finish();
ROLLBACK;
