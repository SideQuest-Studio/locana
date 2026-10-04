-- Migration: partner_room_assignment_fixes
-- Down: re-run the function bodies from 20260907120000_partner_booking_detail_rpcs.sql;
--       DROP FUNCTION public.partner_room_conflicts(uuid, uuid[]), public.partner_release_rooms(uuid);
--
-- Room status now tracks physical occupancy only: assignment reserves a unit for a date range,
-- check-in marks it occupied, check-out/cancel free it (unless another checked-in stay holds it).

-- Units unusable for this booking: in maintenance, or assigned to another active booking
-- whose dates overlap.
CREATE OR REPLACE FUNCTION public.partner_room_conflicts(p_booking_id uuid, p_room_ids uuid[])
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.rooms r
  WHERE r.id = ANY (p_room_ids) AND (
    r.status = 'maintenance' OR EXISTS (
      SELECT 1 FROM public.booking_rooms br
      JOIN public.bookings o ON o.id = br.booking_id
      JOIN public.bookings me ON me.id = p_booking_id
      WHERE br.room_id = r.id AND o.id <> me.id
        AND o.status IN ('confirmed', 'checked_in')
        AND o.check_in < me.check_out AND o.check_out > me.check_in));
$$;
REVOKE ALL ON FUNCTION public.partner_room_conflicts(uuid, uuid[]) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.partner_release_rooms(p_booking_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.rooms r SET status = 'available', updated_at = now()
  FROM public.booking_rooms br
  WHERE br.booking_id = p_booking_id AND br.room_id = r.id AND r.status = 'occupied'
    AND NOT EXISTS (
      SELECT 1 FROM public.booking_rooms br2
      JOIN public.bookings o ON o.id = br2.booking_id
      WHERE br2.room_id = r.id AND o.id <> p_booking_id AND o.status = 'checked_in');
$$;
REVOKE ALL ON FUNCTION public.partner_release_rooms(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.partner_assign_rooms(p_booking_id uuid, p_room_ids uuid[])
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status public.booking_status;
  v_room_type_id uuid;
  v_ids uuid[];
  v_count integer;
BEGIN
  SELECT g.status, g.room_type_id INTO v_status, v_room_type_id
  FROM public.get_my_partner_booking(p_booking_id) g;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND';
  END IF;
  IF v_status NOT IN ('confirmed', 'checked_in') THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION';
  END IF;

  SELECT array_agg(DISTINCT x) INTO v_ids FROM unnest(p_room_ids) x;
  IF v_ids IS NULL THEN
    RAISE EXCEPTION 'INVALID_ROOM_COUNT';
  END IF;

  -- Serialize assignments per room type so two staff can't give one unit to overlapping stays.
  PERFORM 1 FROM public.room_types WHERE id = v_room_type_id FOR UPDATE;

  IF (SELECT count(*) FROM public.rooms WHERE id = ANY (v_ids) AND room_type_id = v_room_type_id) <> cardinality(v_ids) THEN
    RAISE EXCEPTION 'INVALID_ROOM';
  END IF;
  IF EXISTS (SELECT 1 FROM public.booking_rooms WHERE booking_id = p_booking_id AND room_id = ANY (v_ids)) THEN
    RAISE EXCEPTION 'ROOM_ALREADY_ASSIGNED';
  END IF;
  IF public.partner_room_conflicts(p_booking_id, v_ids) > 0 THEN
    RAISE EXCEPTION 'ROOM_UNAVAILABLE';
  END IF;

  INSERT INTO public.booking_rooms (booking_id, room_id)
  SELECT p_booking_id, x FROM unnest(v_ids) x;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_status = 'checked_in' THEN
    UPDATE public.rooms SET status = 'occupied', updated_at = now() WHERE id = ANY (v_ids);
  END IF;

  INSERT INTO public.booking_status_history (booking_id, from_status, to_status, changed_by, note)
  VALUES (p_booking_id, v_status, v_status, auth.uid(), v_count || ' room(s) assigned');

  RETURN v_count::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.partner_unassign_rooms(p_booking_id uuid, p_room_ids uuid[])
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status public.booking_status;
  v_count integer;
BEGIN
  SELECT g.status INTO v_status FROM public.get_my_partner_booking(p_booking_id) g;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND';
  END IF;
  IF v_status <> 'confirmed' THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION';
  END IF;
  IF p_room_ids IS NULL OR cardinality(p_room_ids) = 0 THEN
    RAISE EXCEPTION 'INVALID_ROOM_COUNT';
  END IF;

  -- Rooms of a not-yet-checked-in booking were never marked occupied, so status is untouched.
  DELETE FROM public.booking_rooms WHERE booking_id = p_booking_id AND room_id = ANY (p_room_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO public.booking_status_history (booking_id, from_status, to_status, changed_by, note)
  VALUES (p_booking_id, v_status, v_status, auth.uid(), v_count || ' room(s) unassigned');

  RETURN v_count::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.partner_check_in_booking(p_booking_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status public.booking_status;
BEGIN
  SELECT g.status INTO v_status FROM public.get_my_partner_booking(p_booking_id) g;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND';
  END IF;
  IF v_status <> 'confirmed' THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.booking_rooms WHERE booking_id = p_booking_id) THEN
    RAISE EXCEPTION 'ROOMS_NOT_ASSIGNED';
  END IF;

  UPDATE public.bookings SET status = 'checked_in', updated_at = now() WHERE id = p_booking_id;
  UPDATE public.rooms r SET status = 'occupied', updated_at = now()
  FROM public.booking_rooms br
  WHERE br.booking_id = p_booking_id AND br.room_id = r.id;

  INSERT INTO public.booking_status_history (booking_id, from_status, to_status, changed_by, note)
  VALUES (p_booking_id, v_status, 'checked_in', auth.uid(), 'Checked in');

  RETURN 'checked_in';
END;
$$;

CREATE OR REPLACE FUNCTION public.partner_check_out_booking(p_booking_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status public.booking_status;
BEGIN
  SELECT g.status INTO v_status FROM public.get_my_partner_booking(p_booking_id) g;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND';
  END IF;
  IF v_status <> 'checked_in' THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION';
  END IF;

  UPDATE public.bookings SET status = 'checked_out', updated_at = now() WHERE id = p_booking_id;
  PERFORM public.partner_release_rooms(p_booking_id);

  INSERT INTO public.booking_status_history (booking_id, from_status, to_status, changed_by, note)
  VALUES (p_booking_id, v_status, 'checked_out', auth.uid(), 'Checked out');

  RETURN 'checked_out';
END;
$$;

-- Cancelling is a manager action; front desk staff can view, assign and check in/out only.
CREATE OR REPLACE FUNCTION public.partner_cancel_booking(p_booking_id uuid, p_reason text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status public.booking_status;
  v_new public.booking_status;
BEGIN
  SELECT g.status INTO v_status FROM public.get_my_partner_booking(p_booking_id) g;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND';
  END IF;
  IF NOT public.can_manage_partner() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF v_status NOT IN ('pending_payment', 'confirmed', 'checked_in') THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION';
  END IF;

  v_new := CASE
    WHEN EXISTS (SELECT 1 FROM public.payments WHERE booking_id = p_booking_id AND status = 'paid')
      THEN 'refund_pending'::public.booking_status
    ELSE 'cancelled'::public.booking_status
  END;

  UPDATE public.bookings SET status = v_new, updated_at = now() WHERE id = p_booking_id;
  PERFORM public.partner_release_rooms(p_booking_id);

  INSERT INTO public.booking_status_history (booking_id, from_status, to_status, changed_by, note)
  VALUES (p_booking_id, v_status, v_new, auth.uid(),
          COALESCE('Cancelled: ' || NULLIF(left(btrim(p_reason), 500), ''), 'Cancelled'));

  RETURN v_new::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_partner_booking_detail(p_booking_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM 1 FROM public.get_my_partner_booking(p_booking_id);
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'booking', to_jsonb(b) || jsonb_build_object(
        'effective_status', public.partner_effective_status(b.status, b.hold_expires_at)),
      'guest', (
        SELECT jsonb_build_object('id', pr.id, 'first_name', pr.first_name, 'last_name', pr.last_name,
          'email', pr.email, 'phone_number', pr.phone_number, 'avatar_url', pr.avatar_url)
        FROM public.profiles pr WHERE pr.id = b.customer_id),
      'room_type', (SELECT to_jsonb(rt) FROM public.room_types rt WHERE rt.id = b.room_type_id),
      'rate_plan', (SELECT to_jsonb(rp) FROM public.rate_plans rp WHERE rp.id = b.rate_plan_id),
      'property', (
        SELECT to_jsonb(pp) FROM public.properties pp
        WHERE pp.id = (SELECT rt.property_id FROM public.room_types rt WHERE rt.id = b.room_type_id)),
      'payments', (
        SELECT COALESCE(jsonb_agg(to_jsonb(pay) ORDER BY pay.created_at), '[]'::jsonb)
        FROM public.payments pay WHERE pay.booking_id = b.id),
      'assigned_rooms', (
        SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.room_number), '[]'::jsonb)
        FROM public.booking_rooms br JOIN public.rooms r ON r.id = br.room_id
        WHERE br.booking_id = b.id),
      'available_rooms', (
        SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.room_number), '[]'::jsonb)
        FROM public.rooms r
        WHERE r.room_type_id = b.room_type_id
          AND NOT EXISTS (SELECT 1 FROM public.booking_rooms x WHERE x.booking_id = b.id AND x.room_id = r.id)
          AND public.partner_room_conflicts(b.id, ARRAY[r.id]) = 0),
      'status_history', (
        SELECT COALESCE(jsonb_agg(to_jsonb(h) ORDER BY h.created_at), '[]'::jsonb)
        FROM public.booking_status_history h WHERE h.booking_id = b.id))
    FROM public.bookings b
    WHERE b.id = p_booking_id);
END;
$$;
