BEGIN;
\ir fixtures.psql
SELECT plan(24);

CREATE FUNCTION pg_temp.price(p_rp uuid, p_d date) RETURNS numeric LANGUAGE sql AS $$
  SELECT price FROM public.stay_nights('e0000000-0000-0000-0000-0000000000a1', p_rp, p_d, p_d + 1)
$$;
CREATE FUNCTION pg_temp.min_stay(p_d date) RETURNS int LANGUAGE sql AS $$
  SELECT minimum_stay FROM public.stay_nights('e0000000-0000-0000-0000-0000000000a1', NULL, p_d, p_d + 1)
$$;
CREATE FUNCTION pg_temp.reason(p_rt uuid, p_rp uuid, p_in date, p_out date, p_a int DEFAULT 1, p_c int DEFAULT 0)
RETURNS text LANGUAGE sql AS $$
  SELECT public.quote_stay(p_rt, p_rp, p_in, p_out, p_a, p_c)->>'reason'
$$;

-- Price precedence: override > top-priority rule > rate plan > base (rule and plan stack on base)
SELECT is(pg_temp.price(NULL, :'d0'::date), 3000.00, 'base price');
SELECT is(pg_temp.price('f0000000-0000-0000-0000-0000000000a1', :'d0'::date), 3500.00, 'base + rate plan');

INSERT INTO public.pricing_rules (property_id, name, rule_type, days_of_week, price_modifier, priority)
VALUES ('d0000000-0000-0000-0000-00000000000a', 'Surge', 'weekend', ARRAY[extract(dow FROM :'d0'::date)::int], 800, 10);
INSERT INTO public.pricing_rules (property_id, name, rule_type, start_date, end_date, price_modifier, priority)
VALUES ('d0000000-0000-0000-0000-00000000000a', 'Low', 'date_range', :'d0'::date, :'d0'::date + 10, 100, 1);
SELECT is(pg_temp.price('f0000000-0000-0000-0000-0000000000a1', :'d0'::date), 4300.00, 'stack: base + top-priority rule + plan');
SELECT is(pg_temp.price(NULL, :'d0'::date + 1), 3100.00, 'lower-priority rule applies when top rule does not match');

INSERT INTO public.pricing_rules (property_id, name, rule_type, start_date, end_date, minimum_stay, priority)
VALUES ('d0000000-0000-0000-0000-00000000000a', 'MinOnly', 'holiday', :'d0'::date, :'d0'::date, 3, 99);
SELECT is(pg_temp.price(NULL, :'d0'::date), 3800.00, 'min-stay-only rule does not wipe surge price');
SELECT is(pg_temp.min_stay(:'d0'::date), 3, 'min-stay from top rule that sets one');

INSERT INTO public.room_type_availability (room_type_id, date, available_count, price_override, minimum_stay)
VALUES ('e0000000-0000-0000-0000-0000000000a1', :'d0'::date, 2, 9999, 1);
SELECT is(pg_temp.price('f0000000-0000-0000-0000-0000000000a1', :'d0'::date), 9999.00, 'override replaces everything');
SELECT is(pg_temp.min_stay(:'d0'::date), 1, 'override min-stay wins');
DELETE FROM public.room_type_availability;
DELETE FROM public.pricing_rules;

-- Quote reasons, as an anonymous guest
SELECT pg_temp.tests_anon();
SELECT is(pg_temp.reason('e0000000-0000-0000-0000-0000000000a1', NULL, :'d0'::date, :'d0'::date + 2), NULL, 'bookable quote has no reason');
SELECT is((public.quote_stay('e0000000-0000-0000-0000-0000000000a1', 'f0000000-0000-0000-0000-0000000000a1', :'d0'::date, :'d0'::date + 2)->>'subtotal')::numeric,
  7000.00, 'subtotal 2 nights x 3500');
SELECT is((public.quote_stay('e0000000-0000-0000-0000-0000000000a1', 'f0000000-0000-0000-0000-0000000000a1', :'d0'::date, :'d0'::date + 2)->>'downpayment')::numeric,
  2100.00, '30% downpayment');
SELECT is(pg_temp.reason('e0000000-0000-0000-0000-0000000000c1', NULL, :'d0'::date, :'d0'::date + 1), 'PROPERTY_UNAVAILABLE', 'pending partner not bookable');
SELECT is(pg_temp.reason('e0000000-0000-0000-0000-0000000000a1', 'f0000000-0000-0000-0000-0000000000b1', :'d0'::date, :'d0'::date + 1), 'RATE_PLAN_INVALID', 'foreign rate plan rejected');
SELECT is(pg_temp.reason('e0000000-0000-0000-0000-0000000000a1', NULL, current_date - 1, current_date + 1), 'INVALID_DATES', 'past check-in');
SELECT is(pg_temp.reason('e0000000-0000-0000-0000-0000000000a1', NULL, :'d0'::date, :'d0'::date), 'INVALID_DATES', 'zero nights');
SELECT is(pg_temp.reason('e0000000-0000-0000-0000-0000000000a1', NULL, :'d0'::date, :'d0'::date + 31), 'INVALID_DATES', '31 nights');
SELECT is(pg_temp.reason('e0000000-0000-0000-0000-0000000000a1', NULL, :'d0'::date, :'d0'::date + 1, 3, 0), 'OVER_CAPACITY', 'too many adults');
SELECT is(jsonb_array_length(public.get_property_offers('d0000000-0000-0000-0000-00000000000a', :'d0'::date, :'d0'::date + 2)->'offers'),
  1, 'offers: one per room type x rate plan');
SELECT is(public.get_property_offers('d0000000-0000-0000-0000-00000000000c', :'d0'::date, :'d0'::date + 2)->>'reason',
  'PROPERTY_UNAVAILABLE', 'offers hidden for pending partner');
SELECT pg_temp.tests_logout();

INSERT INTO public.room_type_availability (room_type_id, date, available_count, closed_to_arrival, closed_to_departure) VALUES
 ('e0000000-0000-0000-0000-0000000000a1', :'d0'::date + 5, 2, true, false),
 ('e0000000-0000-0000-0000-0000000000a1', :'d0'::date + 9, 2, false, true),
 ('e0000000-0000-0000-0000-0000000000a1', :'d0'::date + 12, 0, false, false);
SELECT is(pg_temp.reason('e0000000-0000-0000-0000-0000000000a1', NULL, :'d0'::date + 5, :'d0'::date + 6), 'CLOSED_TO_ARRIVAL', 'closed to arrival');
SELECT is(pg_temp.reason('e0000000-0000-0000-0000-0000000000a1', NULL, :'d0'::date + 7, :'d0'::date + 9), 'CLOSED_TO_DEPARTURE', 'closed to departure');
SELECT is(pg_temp.reason('e0000000-0000-0000-0000-0000000000a1', NULL, :'d0'::date + 11, :'d0'::date + 13), 'SOLD_OUT', 'blocked night sold out');

-- Derived inventory: confirmed counts, a lapsed hold does not, allotment below booked floors at 0
INSERT INTO public.bookings (customer_id, room_type_id, check_in, check_out, subtotal, total_amount, downpayment_amount, status, hold_expires_at) VALUES
 ('a0000000-0000-0000-0000-0000000000c1', 'e0000000-0000-0000-0000-0000000000a1', :'d0'::date + 20, :'d0'::date + 21, 1, 1, 1, 'confirmed', NULL),
 ('a0000000-0000-0000-0000-0000000000c2', 'e0000000-0000-0000-0000-0000000000a1', :'d0'::date + 20, :'d0'::date + 21, 1, 1, 1, 'pending_payment', now() - interval '1 minute');
SELECT is((SELECT rooms_left FROM public.stay_nights('e0000000-0000-0000-0000-0000000000a1', NULL, :'d0'::date + 20, :'d0'::date + 21)),
  1, 'confirmed counts, expired hold does not');
INSERT INTO public.room_type_availability (room_type_id, date, available_count)
VALUES ('e0000000-0000-0000-0000-0000000000a1', :'d0'::date + 20, 0);
SELECT is((SELECT rooms_left FROM public.stay_nights('e0000000-0000-0000-0000-0000000000a1', NULL, :'d0'::date + 20, :'d0'::date + 21)),
  0, 'allotment below booked floors at 0');

SELECT * FROM finish();
ROLLBACK;
