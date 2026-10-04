-- Migration: quote_default_plan_and_hold_cap
-- Down: re-run quote_stay from 20261002100500_stay_pricing_functions.sql and create_booking from
--       20261002100600_create_booking_rpc.sql.
--
-- 1. A quote without a rate plan, for a room type that has plans, now resolves to the room type's
--    default plan (else its cheapest) so plan modifiers and minimum stays always apply. The
--    resolved plan id is returned in the quote and stored on the booking.
-- 2. A customer may hold at most 3 unpaid bookings at once (TBD-09 fallback), so one account
--    can't keep a resort "sold out" by re-booking every 15 minutes without paying.

CREATE OR REPLACE FUNCTION public.quote_stay(
  p_room_type_id uuid, p_rate_plan_id uuid, p_check_in date, p_check_out date,
  p_adults int DEFAULT 1, p_children int DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rt public.room_types%ROWTYPE;
  v_today date := (now() AT TIME ZONE 'Asia/Manila')::date;
  v_plan_id uuid := p_rate_plan_id;
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
  IF v_plan_id IS NULL THEN
    SELECT rp.id INTO v_plan_id FROM public.rate_plans rp
    WHERE rp.room_type_id = p_room_type_id
    ORDER BY rp.is_default DESC NULLS LAST, rp.price_modifier ASC NULLS FIRST, rp.created_at
    LIMIT 1;
  END IF;

  v_base := jsonb_build_object('room_type_id', p_room_type_id, 'rate_plan_id', v_plan_id,
    'check_in', p_check_in, 'check_out', p_check_out);

  SELECT * INTO v_rt FROM public.room_types WHERE id = p_room_type_id;
  IF NOT FOUND OR NOT public.is_property_public(v_rt.property_id) THEN
    RETURN v_base || jsonb_build_object('bookable', false, 'reason', 'PROPERTY_UNAVAILABLE');
  END IF;
  IF v_plan_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.rate_plans WHERE id = v_plan_id AND room_type_id = p_room_type_id) THEN
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
  FROM public.stay_nights(p_room_type_id, v_plan_id, p_check_in, p_check_out) s;

  SELECT s.minimum_stay, s.closed_to_arrival INTO v_min_stay, v_cta
  FROM public.stay_nights(p_room_type_id, v_plan_id, p_check_in, p_check_in + 1) s;

  SELECT a.closed_to_departure INTO v_ctd
  FROM public.room_type_availability a
  WHERE a.room_type_id = p_room_type_id AND a.date = p_check_out;

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

CREATE OR REPLACE FUNCTION public.create_booking(
  p_room_type_id uuid, p_rate_plan_id uuid, p_check_in date, p_check_out date,
  p_adults int DEFAULT 1, p_children int DEFAULT 0, p_special_requests text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_max_holds constant int := 3;
  v_quote jsonb;
  v_booking public.bookings%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  -- Serialize this customer's bookings so parallel requests can't slip past the hold cap.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));
  IF (SELECT count(*) FROM public.bookings
      WHERE customer_id = v_uid AND status = 'pending_payment' AND hold_expires_at > now()) >= v_max_holds THEN
    RAISE EXCEPTION 'TOO_MANY_HOLDS';
  END IF;

  -- Serialize bookings per room type. The quote below is a new statement, so under READ COMMITTED
  -- it sees every booking committed by whoever held the lock before us.
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
    v_uid, p_room_type_id, (v_quote->>'rate_plan_id')::uuid, p_check_in, p_check_out,
    p_adults, COALESCE(p_children, 0),
    (v_quote->>'subtotal')::numeric, 0, (v_quote->>'subtotal')::numeric,
    (v_quote->>'downpayment')::numeric, (v_quote->>'balance')::numeric,
    'pending_payment', 'pending', now() + interval '15 minutes',
    NULLIF(left(btrim(p_special_requests), 1000), '')
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
