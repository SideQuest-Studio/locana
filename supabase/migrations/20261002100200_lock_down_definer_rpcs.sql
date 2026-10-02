-- Migration: lock_down_definer_rpcs
-- Down: recreate update_property_rpc (20260810140000), save_property_details_rpc(uuid, ...) (20260814100000),
--       get_partner_dashboard_stats(uuid) (20260813120000), bulk_upsert_availability_rpc as SECURITY DEFINER
--       (20260815120000); GRANT EXECUTE ON update_user_role / create_partner_rpc TO PUBLIC.

-- Server-only RPCs: called exclusively with the service-role client.
REVOKE ALL ON FUNCTION public.update_user_role(uuid, public.user_role, uuid, public.staff_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_partner_rpc(uuid, text, text, text) FROM PUBLIC, anon, authenticated;

-- Unauthenticated upsert of any partner's property; no longer referenced by the app.
DROP FUNCTION IF EXISTS public.update_property_rpc(uuid, text, text, text, text);

-- Property save: partner derived from the caller, runs under the caller's RLS.
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

-- Bulk availability: same signature, now runs under the caller's RLS with a range guard.
CREATE OR REPLACE FUNCTION public.bulk_upsert_availability_rpc(
  p_room_type_id uuid, p_start_date date, p_end_date date, p_available_count int,
  p_price_override numeric, p_minimum_stay int, p_closed_to_arrival boolean, p_closed_to_departure boolean
) RETURNS int LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_count int;
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

-- Dashboard stats: partner derived from the caller.
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
  ), today AS (
    SELECT (now() AT TIME ZONE 'Asia/Manila')::date AS d
  )
  SELECT
    (SELECT count(*) FROM public.properties WHERE partner_id = (SELECT partner_id FROM me) AND status = 'published'),
    (SELECT count(*) FROM mine WHERE check_in = (SELECT d FROM today) AND status IN ('confirmed', 'checked_in')),
    (SELECT count(*) FROM mine WHERE check_in = (SELECT d FROM today) AND status = 'confirmed'),
    (SELECT COALESCE(avg(r.rating), 0)::numeric(3,2) FROM public.reviews r
       JOIN public.properties p ON p.id = r.property_id
     WHERE p.partner_id = (SELECT partner_id FROM me));
$$;
REVOKE ALL ON FUNCTION public.get_partner_dashboard_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_partner_dashboard_stats() TO authenticated;
