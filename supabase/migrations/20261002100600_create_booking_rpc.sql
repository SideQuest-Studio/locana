-- Migration: create_booking_rpc
-- Down: DROP FUNCTION public.create_booking(uuid, uuid, date, date, int, int, text);

-- Instant booking with a 15-minute downpayment hold. One transaction:
-- lock room type -> re-quote server-side -> validate -> insert booking -> insert status history.
-- Raises the quote's reason code (e.g. SOLD_OUT) as the exception message.
CREATE OR REPLACE FUNCTION public.create_booking(
  p_room_type_id uuid, p_rate_plan_id uuid, p_check_in date, p_check_out date,
  p_adults int DEFAULT 1, p_children int DEFAULT 0, p_special_requests text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_quote jsonb;
  v_booking public.bookings%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
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
    v_uid, p_room_type_id, p_rate_plan_id, p_check_in, p_check_out, p_adults, COALESCE(p_children, 0),
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
REVOKE ALL ON FUNCTION public.create_booking(uuid, uuid, date, date, int, int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid, uuid, date, date, int, int, text) TO authenticated;
