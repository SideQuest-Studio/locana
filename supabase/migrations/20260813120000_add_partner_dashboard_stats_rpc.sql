-- Migration to add get_partner_dashboard_stats RPC

CREATE OR REPLACE FUNCTION get_partner_dashboard_stats(p_partner_id uuid)
RETURNS TABLE (
  total_listings bigint,
  today_bookings bigint,
  pending_checkins bigint,
  avg_rating numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT count(*)::bigint FROM properties WHERE partner_id = p_partner_id AND status = 'published'),
    (SELECT count(*)::bigint FROM bookings b 
     JOIN room_types rt ON b.room_type_id = rt.id 
     JOIN properties p ON rt.property_id = p.id
     WHERE p.partner_id = p_partner_id AND b.check_in = CURRENT_DATE),
    (SELECT count(*)::bigint FROM bookings b 
     JOIN room_types rt ON b.room_type_id = rt.id 
     JOIN properties p ON rt.property_id = p.id
     WHERE p.partner_id = p_partner_id AND b.status = 'confirmed' AND b.check_in = CURRENT_DATE),
    (SELECT COALESCE(avg(rating), 0)::numeric(3,2) FROM reviews r
     JOIN properties p ON r.property_id = p.id
     WHERE p.partner_id = p_partner_id);
END;
$$;
