-- Migration: booking_contract_columns
-- Down:
--   ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_reference_key;
--   ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_dates_check;
--   DROP INDEX IF EXISTS public.bookings_room_type_dates_idx, public.booking_rooms_room_id_idx, public.booking_rooms_booking_id_idx;
--   ALTER TABLE public.bookings DROP COLUMN IF EXISTS reference, DROP COLUMN IF EXISTS rate_plan_id, DROP COLUMN IF EXISTS special_requests;

ALTER TABLE public.bookings
  ADD COLUMN reference text,
  ADD COLUMN rate_plan_id uuid REFERENCES public.rate_plans(id) ON DELETE SET NULL,
  ADD COLUMN special_requests text;

-- Keep the reference customers already saw (DIP- + first 8 hex of id).
UPDATE public.bookings
SET reference = 'DIP-' || upper(left(replace(id::text, '-', ''), 8))
WHERE reference IS NULL;

ALTER TABLE public.bookings
  ALTER COLUMN reference SET DEFAULT ('DIP-' || upper(substr(md5(gen_random_uuid()::text), 1, 8))),
  ALTER COLUMN reference SET NOT NULL,
  ADD CONSTRAINT bookings_reference_key UNIQUE (reference),
  ADD CONSTRAINT bookings_dates_check CHECK (check_out > check_in) NOT VALID;

CREATE INDEX IF NOT EXISTS bookings_room_type_dates_idx ON public.bookings (room_type_id, check_in, check_out);
CREATE INDEX IF NOT EXISTS booking_rooms_room_id_idx ON public.booking_rooms (room_id);
CREATE INDEX IF NOT EXISTS booking_rooms_booking_id_idx ON public.booking_rooms (booking_id);
