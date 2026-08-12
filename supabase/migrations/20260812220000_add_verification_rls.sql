-- Ensure partners table has the status field (it already does, based on schema, but we'll use it)

-- Update RLS for properties to only allow public SELECT if partner is approved
DROP POLICY IF EXISTS "public_select_properties" ON public.properties;
CREATE POLICY "public_select_properties" ON public.properties
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.partners p
      WHERE p.id = properties.partner_id
      AND p.status = 'approved'
    )
  );

-- Update RLS for room_types to only allow public SELECT if property is public/partner is approved
DROP POLICY IF EXISTS "public_select_room_types" ON public.room_types;
CREATE POLICY "public_select_room_types" ON public.room_types
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties pr
      JOIN public.partners p ON pr.partner_id = p.id
      WHERE pr.id = room_types.property_id
      AND p.status = 'approved'
    )
  );

-- Update RLS for rooms to only allow public SELECT if property is public/partner is approved
DROP POLICY IF EXISTS "public_select_rooms" ON public.rooms;
CREATE POLICY "public_select_rooms" ON public.rooms
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.room_types rt
      JOIN public.properties pr ON rt.property_id = pr.id
      JOIN public.partners p ON pr.partner_id = p.id
      WHERE rt.id = rooms.room_type_id
      AND p.status = 'approved'
    )
  );
