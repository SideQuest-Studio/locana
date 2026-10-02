-- Migration: partner_bookings_rpcs_v2
-- Down: DROP FUNCTION public.get_partner_bookings_stats(),
--         public.get_partner_bookings(text, date, date, text, integer, integer, text),
--         public.partner_effective_status(public.booking_status, timestamptz);
--       recreate the uuid-parameter versions from 20260825120000_partner_bookings_rpcs.sql.
--
-- The v1 functions ran as the caller and inner-joined profiles, which RLS hides from partners,
-- so every booking made by another customer disappeared from the partner's list.

DROP FUNCTION IF EXISTS public.get_partner_bookings_stats(uuid);
DROP FUNCTION IF EXISTS public.get_partner_bookings(uuid, text, date, date, text, integer, integer, text);

-- A lapsed unpaid hold is shown as expired even before a job relabels it.
CREATE OR REPLACE FUNCTION public.partner_effective_status(p_status public.booking_status, p_hold timestamptz)
RETURNS text LANGUAGE sql STABLE SET search_path = public AS $$
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
  ), today AS (
    SELECT (now() AT TIME ZONE 'Asia/Manila')::date AS d
  )
  SELECT
    (SELECT count(*) FROM mine WHERE eff <> 'expired'),
    (SELECT count(*) FROM mine WHERE eff = 'confirmed'
       AND check_in BETWEEN (SELECT d FROM today) AND (SELECT d FROM today) + 7),
    (SELECT count(*) FROM mine WHERE eff IN ('confirmed', 'checked_in')
       AND check_in <= (SELECT d FROM today) AND check_out > (SELECT d FROM today)),
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
      (SELECT pi.image_url FROM public.property_images pi
       WHERE pi.property_id = p.id ORDER BY pi.is_cover DESC, pi.display_order LIMIT 1) AS image
    FROM public.properties p
    WHERE public.is_approved_partner() AND p.partner_id = public.get_my_partner_id()
  ), base AS (
    SELECT b.*, rt.name_en AS rt_name,
      public.partner_effective_status(b.status, b.hold_expires_at) AS eff,
      pr.first_name, pr.last_name, pr.email, pr.phone_number, pr.avatar_url
    FROM public.bookings b
    JOIN public.room_types rt ON rt.id = b.room_type_id
    JOIN prop ON prop.id = rt.property_id
    LEFT JOIN public.profiles pr ON pr.id = b.customer_id
  ), filtered AS (
    SELECT f.*, count(*) OVER () AS full_count
    FROM base f
    WHERE (NULLIF(btrim(p_search), '') IS NULL
        OR f.reference ILIKE '%' || btrim(p_search) || '%'
        OR f.first_name ILIKE '%' || btrim(p_search) || '%'
        OR f.last_name ILIKE '%' || btrim(p_search) || '%'
        OR f.email ILIKE '%' || btrim(p_search) || '%'
        OR f.phone_number ILIKE '%' || btrim(p_search) || '%')
      AND (p_start_date IS NULL OR f.check_in >= p_start_date)
      AND (p_end_date IS NULL OR f.check_out <= p_end_date)
      AND (NULLIF(p_status, '') IS NULL OR f.eff = p_status)
  )
  SELECT f.id, f.reference, f.created_at,
    btrim(COALESCE(f.first_name, '') || ' ' || COALESCE(f.last_name, '')),
    COALESCE(f.email, ''), COALESCE(f.phone_number, ''), COALESCE(f.avatar_url, ''),
    (SELECT name FROM prop), COALESCE((SELECT address FROM prop), ''), COALESCE((SELECT image FROM prop), ''),
    f.check_in, f.check_out, f.adults_count, f.children_count, f.total_amount, f.eff, f.rt_name, f.full_count
  FROM filtered f
  ORDER BY
    CASE WHEN p_sort_by = 'created_at_asc' THEN f.created_at END ASC,
    CASE WHEN p_sort_by = 'check_in_asc'   THEN f.check_in END ASC,
    CASE WHEN p_sort_by = 'check_in_desc'  THEN f.check_in END DESC,
    CASE WHEN p_sort_by = 'amount_asc'     THEN f.total_amount END ASC,
    CASE WHEN p_sort_by = 'amount_desc'    THEN f.total_amount END DESC,
    f.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION public.get_partner_bookings_stats(),
  public.get_partner_bookings(text, date, date, text, integer, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_partner_bookings_stats(),
  public.get_partner_bookings(text, date, date, text, integer, integer, text) TO authenticated;
