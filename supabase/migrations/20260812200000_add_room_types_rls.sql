-- Enable RLS on room_types
ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;

-- Allow partners to insert room types if they own the associated property
CREATE POLICY "partner_insert_own_room_types" ON public.room_types
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT p.owner_id 
      FROM public.partners p
      JOIN public.properties pr ON p.id = pr.partner_id
      WHERE pr.id = room_types.property_id
    )
  );

-- Allow partners to update room types if they own the associated property
CREATE POLICY "partner_update_own_room_types" ON public.room_types
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT p.owner_id 
      FROM public.partners p
      JOIN public.properties pr ON p.id = pr.partner_id
      WHERE pr.id = room_types.property_id
    )
  );

-- Allow partners to read room types if they own the associated property
CREATE POLICY "partner_read_own_room_types" ON public.room_types
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT p.owner_id 
      FROM public.partners p
      JOIN public.properties pr ON p.id = pr.partner_id
      WHERE pr.id = room_types.property_id
    )
  );
