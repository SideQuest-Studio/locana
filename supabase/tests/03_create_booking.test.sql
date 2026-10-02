BEGIN;
\ir fixtures.psql
SELECT plan(9);

SELECT pg_temp.tests_anon();
SELECT throws_ok(format($$SELECT public.create_booking('e0000000-0000-0000-0000-0000000000b1', NULL, %L, %L)$$, :'d0'::date, :'d0'::date + 1),
  '42501', NULL, 'anon cannot book');
SELECT pg_temp.tests_logout();

SELECT pg_temp.tests_login('a0000000-0000-0000-0000-0000000000c1');
CREATE TEMP TABLE r ON COMMIT DROP AS
  SELECT public.create_booking('e0000000-0000-0000-0000-0000000000a1', 'f0000000-0000-0000-0000-0000000000a1',
    :'d0'::date, :'d0'::date + 2, 2, 1, '  late arrival  ') AS j;
SELECT matches((SELECT j->>'reference' FROM r), '^DIP-[0-9A-F]{8}$', 'reference format');
SELECT is((SELECT (j->>'total')::numeric FROM r), 7000.00, 'total from server-side quote');
SELECT is((SELECT (j->>'downpayment')::numeric FROM r), 2100.00, 'downpayment 30%');
SELECT pg_temp.tests_logout();

SELECT is((SELECT special_requests FROM public.bookings WHERE id = (SELECT (j->>'booking_id')::uuid FROM r)),
  'late arrival', 'special requests trimmed and stored');
SELECT is((SELECT rate_plan_id FROM public.bookings WHERE id = (SELECT (j->>'booking_id')::uuid FROM r)),
  'f0000000-0000-0000-0000-0000000000a1'::uuid, 'rate plan stored');
SELECT is((SELECT to_status::text FROM public.booking_status_history WHERE booking_id = (SELECT (j->>'booking_id')::uuid FROM r)),
  'pending_payment', 'history row written');

SELECT pg_temp.tests_login('a0000000-0000-0000-0000-0000000000c2');
SELECT lives_ok(format($$SELECT public.create_booking('e0000000-0000-0000-0000-0000000000a1', NULL, %L, %L)$$, :'d0'::date, :'d0'::date + 1),
  'second room still available');
SELECT throws_ok(format($$SELECT public.create_booking('e0000000-0000-0000-0000-0000000000a1', NULL, %L, %L)$$, :'d0'::date, :'d0'::date + 1),
  'SOLD_OUT', 'third booking sold out');
SELECT pg_temp.tests_logout();

SELECT * FROM finish();
ROLLBACK;
