-- Migration: rls_remaining_tables
-- Down: DROP each policy created below; ALTER TABLE ... DISABLE ROW LEVEL SECURITY on the 21 tables listed here.

-- ---------------------------------------------------------------------------
-- Public reference data: anyone reads, admin writes
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['areas', 'amenities', 'amenity_categories', 'tags'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (true)', t || '_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())', t || '_admin', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Property-linked: visible with the property, managed by the owning partner
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['property_amenities', 'property_tags', 'packages'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (public.is_property_public(property_id) OR public.owns_property(property_id) OR public.is_admin())', t || '_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (public.is_admin() OR (public.can_manage_partner() AND public.owns_property(property_id))) WITH CHECK (public.is_admin() OR (public.can_manage_partner() AND public.owns_property(property_id)))', t || '_manage', t);
  END LOOP;
END $$;

ALTER TABLE public.package_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY package_items_select ON public.package_items FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.packages pk WHERE pk.id = package_items.package_id
    AND (public.is_property_public(pk.property_id) OR public.owns_property(pk.property_id) OR public.is_admin())));
CREATE POLICY package_items_manage ON public.package_items FOR ALL
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.packages pk WHERE pk.id = package_items.package_id
      AND public.can_manage_partner() AND public.owns_property(pk.property_id)))
  WITH CHECK (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.packages pk WHERE pk.id = package_items.package_id
      AND public.can_manage_partner() AND public.owns_property(pk.property_id)));

-- ---------------------------------------------------------------------------
-- Booking children: the booking's customer, owning partner and admin read; writes go through RPCs
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['booking_rooms', 'booking_status_history', 'booking_packages', 'payments'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$CREATE POLICY %I ON public.%I FOR SELECT USING (
      public.is_admin() OR public.partner_owns_booking(booking_id)
      OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = %I.booking_id AND b.customer_id = auth.uid()))$f$,
      t || '_select', t, t);
  END LOOP;
END $$;

-- Guest ID documents: customer uploads and reads their own; owning partner and admin read.
ALTER TABLE public.guest_id_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY guest_id_documents_select ON public.guest_id_documents FOR SELECT USING (
  public.is_admin() OR public.partner_owns_booking(booking_id) OR uploaded_by = auth.uid());
CREATE POLICY guest_id_documents_insert ON public.guest_id_documents FOR INSERT WITH CHECK (
  uploaded_by = auth.uid() AND EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.id = guest_id_documents.booking_id AND b.customer_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Money: partner reads own, admin reads all, no client writes
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['commission_ledger', 'payouts'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (public.is_admin() OR (public.is_approved_partner() AND partner_id = public.get_my_partner_id()))', t || '_select', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Server-only and admin-only
-- ---------------------------------------------------------------------------
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY promo_redemptions_admin_select ON public.promo_redemptions FOR SELECT USING (public.is_admin());

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_admin_select ON public.audit_logs FOR SELECT USING (public.is_admin());

-- Promo codes: no public read (prevents code enumeration); validation happens server-side.
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY promo_codes_select ON public.promo_codes FOR SELECT USING (
  public.is_admin() OR (public.is_approved_partner() AND partner_id = public.get_my_partner_id()));
CREATE POLICY promo_codes_manage ON public.promo_codes FOR ALL
  USING (public.is_admin() OR (public.can_manage_partner() AND partner_id = public.get_my_partner_id()))
  WITH CHECK (public.is_admin() OR (public.can_manage_partner() AND partner_id = public.get_my_partner_id()));

-- Reviews: public for visible properties; insert only after the customer's own checked-out stay there.
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY reviews_select ON public.reviews FOR SELECT USING (
  public.is_property_public(property_id) OR public.owns_property(property_id)
  OR customer_id = auth.uid() OR public.is_admin());
CREATE POLICY reviews_insert ON public.reviews FOR INSERT WITH CHECK (
  customer_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.bookings b JOIN public.room_types rt ON rt.id = b.room_type_id
    WHERE b.id = reviews.booking_id AND b.customer_id = auth.uid()
      AND b.status = 'checked_out' AND rt.property_id = reviews.property_id));

ALTER TABLE public.loyalty_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY loyalty_accounts_select ON public.loyalty_accounts FOR SELECT USING (
  customer_id = auth.uid() OR public.is_admin());
