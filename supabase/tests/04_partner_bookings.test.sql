BEGIN;
\ir fixtures.psql
SELECT plan(13);

INSERT INTO public.bookings (id, customer_id, room_type_id, check_in, check_out, subtotal, total_amount, downpayment_amount, status, hold_expires_at) VALUES
 ('70000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-0000000000c1', 'e0000000-0000-0000-0000-0000000000a1', :'d0'::date,     :'d0'::date + 3, 1, 1, 1, 'confirmed', NULL),
 ('70000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-0000000000c2', 'e0000000-0000-0000-0000-0000000000a1', :'d0'::date + 1, :'d0'::date + 2, 1, 1, 1, 'confirmed', NULL),
 ('70000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-0000000000c2', 'e0000000-0000-0000-0000-0000000000a1', :'d0'::date + 5, :'d0'::date + 6, 1, 1, 1, 'confirmed', NULL),
 ('70000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-0000000000c2', 'e0000000-0000-0000-0000-0000000000a1', :'d0'::date + 8, :'d0'::date + 9, 1, 1, 1, 'pending_payment', now() - interval '1 minute');

SELECT pg_temp.tests_login('a0000000-0000-0000-0000-00000000000a');
SELECT is((SELECT count(*)::int FROM public.get_partner_bookings()), 4, 'owner A sees other customers bookings');
SELECT is((SELECT booking_ref FROM public.get_partner_bookings() WHERE booking_id = '70000000-0000-0000-0000-000000000001'),
  (SELECT reference FROM public.bookings WHERE id = '70000000-0000-0000-0000-000000000001'), 'partner sees guest reference');
SELECT is((SELECT status FROM public.get_partner_bookings() WHERE booking_id = '70000000-0000-0000-0000-000000000004'),
  'expired', 'lapsed hold shows expired');
SELECT is((SELECT total_bookings::int FROM public.get_partner_bookings_stats()), 3, 'stats exclude expired holds');
SELECT is((SELECT count(*)::int FROM public.get_partner_bookings(p_search := (SELECT reference FROM public.bookings WHERE id = '70000000-0000-0000-0000-000000000003'))),
  1, 'search by reference');

SELECT lives_ok($$SELECT public.partner_assign_rooms('70000000-0000-0000-0000-000000000001', ARRAY['90000000-0000-0000-0000-0000000000a1']::uuid[])$$,
  'assign room 101');
SELECT is((SELECT status::text FROM public.rooms WHERE id = '90000000-0000-0000-0000-0000000000a1'), 'available',
  'assignment does not occupy room early');
SELECT throws_ok($$SELECT public.partner_assign_rooms('70000000-0000-0000-0000-000000000002', ARRAY['90000000-0000-0000-0000-0000000000a1']::uuid[])$$,
  'ROOM_UNAVAILABLE', 'overlapping assignment rejected');
SELECT lives_ok($$SELECT public.partner_assign_rooms('70000000-0000-0000-0000-000000000003', ARRAY['90000000-0000-0000-0000-0000000000a1']::uuid[])$$,
  'non-overlapping assignment allowed');
SELECT throws_ok($$SELECT public.partner_assign_rooms('70000000-0000-0000-0000-000000000002', ARRAY['90000000-0000-0000-0000-0000000000a3']::uuid[])$$,
  'ROOM_UNAVAILABLE', 'maintenance room rejected');
SELECT is((SELECT guest ? 'role' FROM (SELECT public.get_partner_booking_detail('70000000-0000-0000-0000-000000000001')->'guest' AS guest) g),
  false, 'booking detail does not leak full guest profile');
SELECT pg_temp.tests_logout();

SELECT pg_temp.tests_login('a0000000-0000-0000-0000-0000000000aa');
SELECT throws_ok($$SELECT public.partner_cancel_booking('70000000-0000-0000-0000-000000000002', 'x')$$,
  'FORBIDDEN', 'front desk cannot cancel');
SELECT pg_temp.tests_logout();

SELECT pg_temp.tests_login('a0000000-0000-0000-0000-00000000000b');
SELECT is((SELECT count(*)::int FROM public.get_partner_bookings()), 0, 'partner B sees none of A');
SELECT pg_temp.tests_logout();

SELECT * FROM finish();
ROLLBACK;
