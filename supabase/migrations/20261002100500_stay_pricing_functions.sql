-- Migration: stay_pricing_functions
-- Down: DROP FUNCTION public.get_property_offers(uuid, date, date, int, int),
--         public.quote_stay(uuid, uuid, date, date, int, int),
--         public.get_partner_room_calendar(uuid, date, date),
--         public.stay_nights(uuid, uuid, date, date);

-- One row per night of [p_check_in, p_check_out). The single source of nightly price and
-- availability for quotes, create_booking and the partner calendar.
--   price      = price_override, else base + top-priority active rule modifier + rate plan modifier
--   min stay   = override, else top-priority rule that sets one, else rate plan, else 1
--   rooms_left = allotment (override row or total_inventory) - active bookings covering the night
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

-- Priced quote for one room type + rate plan. Never trusts a client price.
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
REVOKE ALL ON FUNCTION public.quote_stay(uuid, uuid, date, date, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.quote_stay(uuid, uuid, date, date, int, int) TO anon, authenticated;

-- Every room type x rate plan of a visible property, quoted for the given stay.
-- A room type without rate plans yields one offer with rate_plan = null.
CREATE OR REPLACE FUNCTION public.get_property_offers(
  p_property_id uuid, p_check_in date, p_check_out date, p_adults int DEFAULT 1, p_children int DEFAULT 0
) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN NOT public.is_property_public(p_property_id) THEN
    jsonb_build_object('property_id', p_property_id, 'reason', 'PROPERTY_UNAVAILABLE', 'offers', '[]'::jsonb)
  ELSE
    jsonb_build_object('property_id', p_property_id, 'reason', NULL, 'offers', COALESCE((
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

-- Partner calendar view (inclusive range, max ~2 months) for the caller's own room type.
CREATE OR REPLACE FUNCTION public.get_partner_room_calendar(p_room_type_id uuid, p_from date, p_to date)
RETURNS TABLE (night date, price numeric, allotment int, booked int, rooms_left int,
  closed_to_arrival boolean, closed_to_departure boolean, minimum_stay int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.* FROM public.stay_nights(p_room_type_id, NULL, p_from, p_to + 1) s
  WHERE public.owns_room_type(p_room_type_id) AND p_to - p_from <= 62;
$$;
REVOKE ALL ON FUNCTION public.get_partner_room_calendar(uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_partner_room_calendar(uuid, date, date) TO authenticated;
