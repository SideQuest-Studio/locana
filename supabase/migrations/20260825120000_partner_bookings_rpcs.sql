-- Migration: partner_bookings_rpcs
-- Down: DROP FUNCTION IF EXISTS get_partner_bookings_stats(uuid); DROP FUNCTION IF EXISTS get_partner_bookings(uuid,text,date,date,text,integer,integer,text);

-- ============================================================
-- 1. get_partner_bookings_stats
--    Returns the 5 metric cards for the partner bookings page.
-- ============================================================
CREATE OR REPLACE FUNCTION get_partner_bookings_stats(p_partner_id uuid)
RETURNS TABLE (
  total_bookings    bigint,
  upcoming_checkins bigint,
  ongoing_stays     bigint,
  completed         bigint,
  cancelled         bigint
)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  WITH partner_property AS (
    SELECT p.id AS property_id
    FROM properties p
    WHERE p.partner_id = p_partner_id
    LIMIT 1
  ),
  partner_room_types AS (
    SELECT rt.id
    FROM room_types rt
    WHERE rt.property_id = (SELECT property_id FROM partner_property)
  ),
  partner_bookings AS (
    SELECT b.*
    FROM bookings b
    WHERE b.room_type_id IN (SELECT id FROM partner_room_types)
  )
  SELECT
    (SELECT count(*) FROM partner_bookings)                               AS total_bookings,
    (SELECT count(*) FROM partner_bookings
     WHERE status IN ('confirmed')
       AND check_in >= current_date
       AND check_in <= current_date + interval '7 days')                  AS upcoming_checkins,
    (SELECT count(*) FROM partner_bookings
     WHERE status IN ('confirmed','checked_in')
       AND check_in <= current_date
       AND check_out > current_date)                                      AS ongoing_stays,
    (SELECT count(*) FROM partner_bookings
     WHERE status = 'checked_out')                                         AS completed,
    (SELECT count(*) FROM partner_bookings
     WHERE status = 'cancelled')                                          AS cancelled;
$$;

-- ============================================================
-- 2. get_partner_bookings
--    Paginated, filterable, searchable bookings list for a partner.
--    Returns joined guest + listing info.
-- ============================================================
CREATE OR REPLACE FUNCTION get_partner_bookings(
  p_partner_id  uuid,
  p_search      text    DEFAULT NULL,
  p_start_date  date    DEFAULT NULL,
  p_end_date    date    DEFAULT NULL,
  p_status      text    DEFAULT NULL,
  p_limit       integer DEFAULT 10,
  p_offset      integer DEFAULT 0,
  p_sort_by     text    DEFAULT 'created_at_desc'
)
RETURNS TABLE (
  booking_id        uuid,
  booking_ref       text,
  booking_date      timestamptz,
  guest_name        text,
  guest_email       text,
  guest_phone       text,
  guest_avatar_url  text,
  listing_name      text,
  listing_location  text,
  listing_image     text,
  check_in          date,
  check_out         date,
  adults_count      integer,
  children_count    integer,
  total_amount      numeric,
  status            text,
  room_type_name    text,
  total_count       bigint
)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  WITH partner_property AS (
    SELECT p.id AS property_id, p.name AS property_name, p.address AS property_address,
           COALESCE(pi.image_url, '') AS property_image
    FROM properties p
    LEFT JOIN property_images pi ON pi.property_id = p.id AND pi.is_cover = true
    WHERE p.partner_id = p_partner_id
    LIMIT 1
  ),
  partner_room_types AS (
    SELECT rt.id, rt.name_en
    FROM room_types rt
    WHERE rt.property_id = (SELECT property_id FROM partner_property)
  ),
  filtered_bookings AS (
    SELECT
      b.*,
      rt.name_en AS room_type_name_text
    FROM bookings b
    JOIN partner_room_types rt ON rt.id = b.room_type_id
    WHERE
      -- search filter
      (p_search IS NULL OR p_search = '' OR
        EXISTS (
          SELECT 1 FROM profiles pr
          WHERE pr.id = b.customer_id
            AND (
              pr.first_name ILIKE '%' || p_search || '%'
              OR pr.last_name ILIKE '%' || p_search || '%'
              OR pr.email ILIKE '%' || p_search || '%'
              OR pr.phone_number ILIKE '%' || p_search || '%'
            )
        )
      )
      -- date range filter
      AND (p_start_date IS NULL OR b.check_in >= p_start_date)
      AND (p_end_date IS NULL OR b.check_out <= p_end_date)
      -- status filter
      AND (p_status IS NULL OR p_status = '' OR b.status::text = p_status)
  ),
  counted AS (
    SELECT fb.*, count(*) OVER() AS full_count
    FROM filtered_bookings fb
  )
  SELECT
    c.id                                                              AS booking_id,
    ('BK-' || left(c.id::text, 8))                                   AS booking_ref,
    c.created_at                                                      AS booking_date,
    (COALESCE(pr.first_name, '') || ' ' || COALESCE(pr.last_name, '')) AS guest_name,
    COALESCE(pr.email, '')                                            AS guest_email,
    COALESCE(pr.phone_number, '')                                     AS guest_phone,
    COALESCE(pr.avatar_url, '')                                       AS guest_avatar_url,
    COALESCE(pp.property_name, '')                                    AS listing_name,
    COALESCE(pp.property_address, '')                                 AS listing_location,
    COALESCE(pp.property_image, '')                                   AS listing_image,
    c.check_in,
    c.check_out,
    c.adults_count,
    c.children_count,
    c.total_amount,
    c.status::text,
    COALESCE(c.room_type_name_text, '')                               AS room_type_name,
    c.full_count                                                      AS total_count
  FROM counted c
  JOIN profiles pr ON pr.id = c.customer_id
  CROSS JOIN partner_property pp
  ORDER BY
    CASE WHEN p_sort_by = 'created_at_asc'  THEN c.created_at END ASC,
    CASE WHEN p_sort_by = 'created_at_desc' THEN c.created_at END DESC,
    CASE WHEN p_sort_by = 'check_in_asc'    THEN c.check_in    END ASC,
    CASE WHEN p_sort_by = 'check_in_desc'   THEN c.check_in    END DESC,
    CASE WHEN p_sort_by = 'amount_asc'      THEN c.total_amount END ASC,
    CASE WHEN p_sort_by = 'amount_desc'     THEN c.total_amount END DESC,
    c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;
