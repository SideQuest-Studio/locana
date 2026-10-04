-- Migration: partner_access_policies
-- Down: drop every policy created below; recreate the policies from 20260810123000, 20260812200000,
--       20260812210000, 20260812220000, 20260814100000, 20260815120000, 20260816100000;
--       DROP FUNCTION public.can_manage_partner(), public.owns_property(uuid), public.owns_room_type(uuid),
--       public.is_property_public(uuid), public.partner_owns_booking(uuid);

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER so policies can check ownership without RLS recursion)
-- ---------------------------------------------------------------------------

-- Owner or manager staff of an approved partner. Front desk staff are excluded.
CREATE OR REPLACE FUNCTION public.can_manage_partner()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p JOIN public.partners pt ON pt.id = p.partner_id
    WHERE p.id = auth.uid() AND pt.status = 'approved'
      AND (p.role = 'partner_owner' OR (p.role = 'partner_staff' AND p.staff_role = 'manager'))
  );
$$;

CREATE OR REPLACE FUNCTION public.owns_property(p_property_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_approved_partner() AND EXISTS (
    SELECT 1 FROM public.properties pr
    WHERE pr.id = p_property_id AND pr.partner_id = public.get_my_partner_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.owns_room_type(p_room_type_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_approved_partner() AND EXISTS (
    SELECT 1 FROM public.room_types rt JOIN public.properties pr ON pr.id = rt.property_id
    WHERE rt.id = p_room_type_id AND pr.partner_id = public.get_my_partner_id()
  );
$$;

-- Bookable and browsable by guests: partner approved, property published and not deleted.
CREATE OR REPLACE FUNCTION public.is_property_public(p_property_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.properties pr JOIN public.partners pt ON pt.id = pr.partner_id
    WHERE pr.id = p_property_id AND pt.status = 'approved'
      AND pr.status = 'published' AND pr.deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.partner_owns_booking(p_booking_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_approved_partner() AND EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.room_types rt ON rt.id = b.room_type_id
    JOIN public.properties pr ON pr.id = rt.property_id
    WHERE b.id = p_booking_id AND pr.partner_id = public.get_my_partner_id()
  );
$$;

REVOKE ALL ON FUNCTION public.can_manage_partner(), public.owns_property(uuid), public.owns_room_type(uuid),
  public.is_property_public(uuid), public.partner_owns_booking(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_partner(), public.owns_property(uuid), public.owns_room_type(uuid),
  public.is_property_public(uuid), public.partner_owns_booking(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- properties
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "partner_update_own_property" ON public.properties;
DROP POLICY IF EXISTS "partner_insert_own_property" ON public.properties;
DROP POLICY IF EXISTS "public_select_properties" ON public.properties;
CREATE POLICY properties_select ON public.properties FOR SELECT
  USING (public.is_property_public(id) OR public.owns_property(id) OR public.is_admin());
CREATE POLICY properties_manage ON public.properties FOR ALL
  USING (public.is_admin() OR (public.can_manage_partner() AND partner_id = public.get_my_partner_id()))
  WITH CHECK (public.is_admin() OR (public.can_manage_partner() AND partner_id = public.get_my_partner_id()));

-- ---------------------------------------------------------------------------
-- room_types
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "partner_insert_own_room_types" ON public.room_types;
DROP POLICY IF EXISTS "partner_update_own_room_types" ON public.room_types;
DROP POLICY IF EXISTS "partner_read_own_room_types" ON public.room_types;
DROP POLICY IF EXISTS "public_select_room_types" ON public.room_types;
CREATE POLICY room_types_select ON public.room_types FOR SELECT
  USING (public.is_property_public(property_id) OR public.owns_property(property_id) OR public.is_admin());
CREATE POLICY room_types_manage ON public.room_types FOR ALL
  USING (public.is_admin() OR (public.can_manage_partner() AND public.owns_property(property_id)))
  WITH CHECK (public.is_admin() OR (public.can_manage_partner() AND public.owns_property(property_id)));

-- ---------------------------------------------------------------------------
-- rooms (physical units are operational data, never public)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "partner_insert_own_rooms" ON public.rooms;
DROP POLICY IF EXISTS "partner_update_own_rooms" ON public.rooms;
DROP POLICY IF EXISTS "partner_read_own_rooms" ON public.rooms;
DROP POLICY IF EXISTS "public_select_rooms" ON public.rooms;
CREATE POLICY rooms_select ON public.rooms FOR SELECT
  USING (public.owns_room_type(room_type_id) OR public.is_admin());
CREATE POLICY rooms_manage ON public.rooms FOR ALL
  USING (public.is_admin() OR (public.can_manage_partner() AND public.owns_room_type(room_type_id)))
  WITH CHECK (public.is_admin() OR (public.can_manage_partner() AND public.owns_room_type(room_type_id)));

-- ---------------------------------------------------------------------------
-- room_type_availability (guests read it through quote RPCs, not directly)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "public_select_room_availability" ON public.room_type_availability;
DROP POLICY IF EXISTS "partner_all_room_availability" ON public.room_type_availability;
CREATE POLICY availability_select ON public.room_type_availability FOR SELECT
  USING (public.owns_room_type(room_type_id) OR public.is_admin());
CREATE POLICY availability_manage ON public.room_type_availability FOR ALL
  USING (public.is_admin() OR (public.can_manage_partner() AND public.owns_room_type(room_type_id)))
  WITH CHECK (public.is_admin() OR (public.can_manage_partner() AND public.owns_room_type(room_type_id)));

-- ---------------------------------------------------------------------------
-- rate_plans
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "public_select_rate_plans" ON public.rate_plans;
DROP POLICY IF EXISTS "partner_all_rate_plans" ON public.rate_plans;
CREATE POLICY rate_plans_select ON public.rate_plans FOR SELECT
  USING (public.owns_room_type(room_type_id) OR public.is_admin() OR EXISTS (
    SELECT 1 FROM public.room_types rt
    WHERE rt.id = rate_plans.room_type_id AND public.is_property_public(rt.property_id)));
CREATE POLICY rate_plans_manage ON public.rate_plans FOR ALL
  USING (public.is_admin() OR (public.can_manage_partner() AND public.owns_room_type(room_type_id)))
  WITH CHECK (public.is_admin() OR (public.can_manage_partner() AND public.owns_room_type(room_type_id)));

-- ---------------------------------------------------------------------------
-- pricing_rules (internal to the partner; guests see the resulting prices)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "public_select_pricing_rules" ON public.pricing_rules;
DROP POLICY IF EXISTS "partner_all_pricing_rules" ON public.pricing_rules;
CREATE POLICY pricing_rules_select ON public.pricing_rules FOR SELECT
  USING (public.owns_property(property_id) OR public.is_admin());
CREATE POLICY pricing_rules_manage ON public.pricing_rules FOR ALL
  USING (public.is_admin() OR (public.can_manage_partner() AND public.owns_property(property_id)))
  WITH CHECK (public.is_admin() OR (public.can_manage_partner() AND public.owns_property(property_id)
    AND (room_type_id IS NULL OR public.owns_room_type(room_type_id))));

-- ---------------------------------------------------------------------------
-- property_images
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "property_images_select" ON public.property_images;
DROP POLICY IF EXISTS "property_images_all_partner" ON public.property_images;
CREATE POLICY property_images_select ON public.property_images FOR SELECT
  USING (public.is_property_public(property_id) OR public.owns_property(property_id) OR public.is_admin());
CREATE POLICY property_images_manage ON public.property_images FOR ALL
  USING (public.is_admin() OR (public.can_manage_partner() AND public.owns_property(property_id)))
  WITH CHECK (public.is_admin() OR (public.can_manage_partner() AND public.owns_property(property_id)));

-- ---------------------------------------------------------------------------
-- storage: partners write only under their own "<partner_id>/" folder
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can upload property images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete property images" ON storage.objects;
CREATE POLICY property_images_partner_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'property-images' AND public.can_manage_partner()
    AND (storage.foldername(name))[1] = public.get_my_partner_id()::text);
CREATE POLICY property_images_partner_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'property-images' AND public.can_manage_partner()
    AND (storage.foldername(name))[1] = public.get_my_partner_id()::text);
