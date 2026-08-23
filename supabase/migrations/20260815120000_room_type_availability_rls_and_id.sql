-- Migration: Ensure room_type_availability id default and RLS policies

ALTER TABLE public.room_type_availability ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Enable RLS
ALTER TABLE public.room_type_availability ENABLE ROW LEVEL SECURITY;

-- Public read access for search and calendar display
DROP POLICY IF EXISTS "public_select_room_availability" ON public.room_type_availability;
CREATE POLICY "public_select_room_availability" ON public.room_type_availability
FOR SELECT USING (true);

-- Partner write access for own room types
DROP POLICY IF EXISTS "partner_all_room_availability" ON public.room_type_availability;
CREATE POLICY "partner_all_room_availability" ON public.room_type_availability
FOR ALL USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.room_types rt
    JOIN public.properties p ON rt.property_id = p.id
    WHERE rt.id = room_type_availability.room_type_id
    AND p.partner_id = public.get_my_partner_id()
  )
);

-- RPC for atomic bulk availability updates
CREATE OR REPLACE FUNCTION public.bulk_upsert_availability_rpc(
  p_room_type_id uuid,
  p_start_date date,
  p_end_date date,
  p_available_count int,
  p_price_override numeric,
  p_minimum_stay int,
  p_closed_to_arrival boolean,
  p_closed_to_departure boolean
) RETURNS int AS $$
DECLARE
  v_curr date;
  v_updated_count int := 0;
BEGIN
  v_curr := p_start_date;
  WHILE v_curr <= p_end_date LOOP
    INSERT INTO public.room_type_availability (
      room_type_id,
      date,
      available_count,
      price_override,
      minimum_stay,
      closed_to_arrival,
      closed_to_departure
    )
    VALUES (
      p_room_type_id,
      v_curr,
      p_available_count,
      p_price_override,
      p_minimum_stay,
      COALESCE(p_closed_to_arrival, false),
      COALESCE(p_closed_to_departure, false)
    )
    ON CONFLICT (room_type_id, date)
    DO UPDATE SET
      available_count = EXCLUDED.available_count,
      price_override = EXCLUDED.price_override,
      minimum_stay = EXCLUDED.minimum_stay,
      closed_to_arrival = EXCLUDED.closed_to_arrival,
      closed_to_departure = EXCLUDED.closed_to_departure;
      
    v_updated_count := v_updated_count + 1;
    v_curr := v_curr + interval '1 day';
  END LOOP;

  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
