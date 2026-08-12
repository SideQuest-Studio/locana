-- Enable RLS on rooms
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Allow partners to insert rooms if they own the associated property (via room_types)
CREATE POLICY "partner_insert_own_rooms" ON public.rooms
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT p.owner_id 
      FROM public.partners p
      JOIN public.properties pr ON p.id = pr.partner_id
      JOIN public.room_types rt ON pr.id = rt.property_id
      WHERE rt.id = rooms.room_type_id
    )
  );

-- Allow partners to update rooms if they own the associated property
CREATE POLICY "partner_update_own_rooms" ON public.rooms
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT p.owner_id 
      FROM public.partners p
      JOIN public.properties pr ON p.id = pr.partner_id
      JOIN public.room_types rt ON pr.id = rt.property_id
      WHERE rt.id = rooms.room_type_id
    )
  );

-- Allow partners to read rooms if they own the associated property
CREATE POLICY "partner_read_own_rooms" ON public.rooms
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT p.owner_id 
      FROM public.partners p
      JOIN public.properties pr ON p.id = pr.partner_id
      JOIN public.room_types rt ON pr.id = rt.property_id
      WHERE rt.id = rooms.room_type_id
    )
  );
