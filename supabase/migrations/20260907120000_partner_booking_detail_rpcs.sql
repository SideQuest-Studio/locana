-- Migration: partner_booking_detail_rpcs
-- Down:
--   DROP FUNCTION IF EXISTS public.partner_unassign_rooms(uuid,uuid[]);
--   DROP FUNCTION IF EXISTS public.partner_assign_rooms(uuid,uuid[]);
--   DROP FUNCTION IF EXISTS public.partner_cancel_booking(uuid,text);
--   DROP FUNCTION IF EXISTS public.partner_check_out_booking(uuid);
--   DROP FUNCTION IF EXISTS public.partner_check_in_booking(uuid);
--   DROP FUNCTION IF EXISTS public.get_partner_booking_detail(uuid);
--   DROP FUNCTION IF EXISTS public.get_my_partner_booking(uuid);

-- ============================================================
-- Core ownership guard.
-- Returns the booking ONLY when the authenticated user is an
-- approved partner (owner or staff) whose property owns the
-- booking's room type. Used as the single authorization gate for
-- the detail view and every partner booking transition.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_partner_booking(p_booking_id uuid)
RETURNS TABLE (
  booking_id    uuid,
  room_type_id  uuid,
  status        public.booking_status
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT b.id, b.room_type_id, b.status
  FROM public.bookings b
  JOIN public.room_types rt ON rt.id = b.room_type_id
  JOIN public.properties pr ON pr.id = rt.property_id
  WHERE b.id = p_booking_id
    AND public.is_approved_partner()
    AND pr.partner_id = public.get_my_partner_id();
$$;

-- ============================================================
-- get_partner_booking_detail
-- Full detail document for one booking. Returns NULL when the
-- caller does not own the booking (no existence leak).
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_partner_booking_detail(p_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_status public.booking_status;
BEGIN
  SELECT g.status INTO v_status FROM public.get_my_partner_booking(p_booking_id) g;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'booking', to_jsonb(b),
      'guest', (
        SELECT to_jsonb(pr)
        FROM public.profiles pr
        WHERE pr.id = b.customer_id
      ),
      'room_type', (
        SELECT to_jsonb(rt)
        FROM public.room_types rt
        WHERE rt.id = b.room_type_id
      ),
      'property', (
        SELECT to_jsonb(pp)
        FROM public.properties pp
        WHERE pp.id = (SELECT rt.property_id FROM public.room_types rt WHERE rt.id = b.room_type_id)
      ),
      'payments', (
        SELECT COALESCE(jsonb_agg(to_jsonb(pay) ORDER BY pay.created_at), '[]'::jsonb)
        FROM public.payments pay
        WHERE pay.booking_id = b.id
      ),
      'assigned_rooms', (
        SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.room_number), '[]'::jsonb)
        FROM public.booking_rooms br
        JOIN public.rooms r ON r.id = br.room_id
        WHERE br.booking_id = b.id
      ),
      'available_rooms', (
        SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.room_number), '[]'::jsonb)
        FROM public.rooms r
        WHERE r.room_type_id = b.room_type_id
          AND r.status = 'available'
      ),
      'status_history', (
        SELECT COALESCE(jsonb_agg(to_jsonb(bsh) ORDER BY bsh.created_at), '[]'::jsonb)
        FROM public.booking_status_history bsh
        WHERE bsh.booking_id = b.id
      )
    )
    FROM public.bookings b
    WHERE b.id = p_booking_id
  );
END;
$$;

-- ============================================================
-- partner_assign_rooms
-- Assigns room units to a confirmed/checked_in booking.
-- Rooms are validated to belong to the booking's room type and
-- to be currently available. Runs a status-history audit note.
-- ============================================================
CREATE OR REPLACE FUNCTION public.partner_assign_rooms(p_booking_id uuid, p_room_ids uuid[])
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_status        public.booking_status;
  v_room_type_id  uuid;
  v_bad_room      integer;
  v_already       integer;
  v_count         integer;
BEGIN
  SELECT g.status, g.room_type_id INTO v_status, v_room_type_id
  FROM public.get_my_partner_booking(p_booking_id) g;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND';
  END IF;

  IF v_status NOT IN ('confirmed', 'checked_in') THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION';
  END IF;

  IF p_room_ids IS NULL OR array_length(p_room_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'INVALID_ROOM_COUNT';
  END IF;

  SELECT count(*) INTO v_bad_room
  FROM public.rooms r
  WHERE r.id = ANY(p_room_ids)
    AND r.room_type_id <> v_room_type_id;
  IF v_bad_room > 0 THEN
    RAISE EXCEPTION 'INVALID_ROOM';
  END IF;

  SELECT count(*) INTO v_already
  FROM public.booking_rooms br
  WHERE br.booking_id = p_booking_id
    AND br.room_id = ANY(p_room_ids);
  IF v_already > 0 THEN
    RAISE EXCEPTION 'ROOM_ALREADY_ASSIGNED';
  END IF;

  INSERT INTO public.booking_rooms (booking_id, room_id)
  SELECT DISTINCT p_booking_id, r.id
  FROM public.rooms r
  WHERE r.id = ANY(p_room_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.rooms r
  SET status = 'occupied', updated_at = now()
  WHERE r.id = ANY(p_room_ids)
    AND r.status = 'available';

  INSERT INTO public.booking_status_history (booking_id, from_status, to_status, changed_by, note)
  VALUES (p_booking_id, v_status, v_status, auth.uid(), v_count || ' room(s) assigned');

  RETURN v_count::text;
END;
$$;

-- ============================================================
-- partner_unassign_rooms
-- Removes assigned room units before check-in (status confirmed).
-- ============================================================
CREATE OR REPLACE FUNCTION public.partner_unassign_rooms(p_booking_id uuid, p_room_ids uuid[])
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_status        public.booking_status;
  v_room_type_id  uuid;
  v_count         integer;
BEGIN
  SELECT g.status, g.room_type_id INTO v_status, v_room_type_id
  FROM public.get_my_partner_booking(p_booking_id) g;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND';
  END IF;

  IF v_status <> 'confirmed' THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION';
  END IF;

  IF p_room_ids IS NULL OR array_length(p_room_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'INVALID_ROOM_COUNT';
  END IF;

  DELETE FROM public.booking_rooms br
  WHERE br.booking_id = p_booking_id
    AND br.room_id = ANY(p_room_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.rooms r
  SET status = 'available', updated_at = now()
  WHERE r.room_type_id = v_room_type_id
    AND r.id = ANY(p_room_ids);

  INSERT INTO public.booking_status_history (booking_id, from_status, to_status, changed_by, note)
  VALUES (p_booking_id, v_status, v_status, auth.uid(), v_count || ' room(s) unassigned');

  RETURN v_count::text;
END;
$$;

-- ============================================================
-- partner_check_in_booking
-- confirmed -> checked_in. Requires at least one assigned room.
-- ============================================================
CREATE OR REPLACE FUNCTION public.partner_check_in_booking(p_booking_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_status   public.booking_status;
  v_room_ct  integer;
BEGIN
  SELECT g.status INTO v_status FROM public.get_my_partner_booking(p_booking_id) g;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND';
  END IF;

  IF v_status <> 'confirmed' THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION';
  END IF;

  SELECT count(*) INTO v_room_ct
  FROM public.booking_rooms br
  WHERE br.booking_id = p_booking_id;

  IF v_room_ct = 0 THEN
    RAISE EXCEPTION 'ROOMS_NOT_ASSIGNED';
  END IF;

  UPDATE public.bookings
  SET status = 'checked_in', updated_at = now()
  WHERE id = p_booking_id;

  INSERT INTO public.booking_status_history (booking_id, from_status, to_status, changed_by, note)
  VALUES (p_booking_id, v_status, 'checked_in', auth.uid(), 'Checked in');

  RETURN 'checked_in';
END;
$$;

-- ============================================================
-- partner_check_out_booking
-- checked_in -> checked_out. Releases assigned rooms.
-- ============================================================
CREATE OR REPLACE FUNCTION public.partner_check_out_booking(p_booking_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_status        public.booking_status;
  v_room_type_id  uuid;
BEGIN
  SELECT g.status, g.room_type_id INTO v_status, v_room_type_id
  FROM public.get_my_partner_booking(p_booking_id) g;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND';
  END IF;

  IF v_status <> 'checked_in' THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION';
  END IF;

  UPDATE public.bookings
  SET status = 'checked_out', updated_at = now()
  WHERE id = p_booking_id;

  UPDATE public.rooms r
  SET status = 'available', updated_at = now()
  FROM public.booking_rooms br
  WHERE br.room_id = r.id
    AND br.booking_id = p_booking_id;

  INSERT INTO public.booking_status_history (booking_id, from_status, to_status, changed_by, note)
  VALUES (p_booking_id, v_status, 'checked_out', auth.uid(), 'Checked out');

  RETURN 'checked_out';
END;
$$;

-- ============================================================
-- partner_cancel_booking
-- pending_payment / confirmed / checked_in -> cancelled, or
-- refund_pending when a payment has already been captured.
-- Releases any assigned rooms.
-- ============================================================
CREATE OR REPLACE FUNCTION public.partner_cancel_booking(p_booking_id uuid, p_reason text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_status        public.booking_status;
  v_room_type_id  uuid;
  v_payment_paid  boolean;
  v_new_status    public.booking_status;
BEGIN
  SELECT g.status, g.room_type_id INTO v_status, v_room_type_id
  FROM public.get_my_partner_booking(p_booking_id) g;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND';
  END IF;

  IF v_status NOT IN ('pending_payment', 'confirmed', 'checked_in') THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.payments pay
    WHERE pay.booking_id = p_booking_id AND pay.status = 'paid'
    LIMIT 1
  ) INTO v_payment_paid;

  v_new_status := CASE WHEN v_payment_paid THEN 'refund_pending'::public.booking_status
                       ELSE 'cancelled'::public.booking_status END;

  UPDATE public.bookings
  SET status = v_new_status, updated_at = now()
  WHERE id = p_booking_id;

  UPDATE public.rooms r
  SET status = 'available', updated_at = now()
  FROM public.booking_rooms br
  WHERE br.room_id = r.id
    AND br.booking_id = p_booking_id;

  INSERT INTO public.booking_status_history (booking_id, from_status, to_status, changed_by, note)
  VALUES (p_booking_id, v_status, v_new_status, auth.uid(),
          COALESCE('Cancelled: ' || p_reason, 'Cancelled'));

  RETURN v_new_status::text;
END;
$$;

-- ============================================================
-- Grants (PostgREST runs RPCs as anon/authenticated roles)
-- ============================================================
GRANT EXECUTE ON FUNCTION public.get_my_partner_booking(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_partner_booking_detail(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.partner_assign_rooms(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_unassign_rooms(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_check_in_booking(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_check_out_booking(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_cancel_booking(uuid, text) TO authenticated;