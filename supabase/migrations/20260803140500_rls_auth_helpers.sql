-- Migration: RLS policies and auth helper functions (minimum tables)
-- Down: DROP POLICIES + functions listed below; ALTER TABLE ... DISABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_partner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT partner_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_approved_partner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.partners pt ON pt.id = p.partner_id
    WHERE p.id = auth.uid()
      AND p.role IN ('partner_owner', 'partner_staff')
      AND pt.status = 'approved'
  );
$$;

-- Prevent non-admins from changing role or partner_id via direct UPDATE
CREATE OR REPLACE FUNCTION public.guard_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'profile_role_change_forbidden';
    END IF;
    IF NEW.partner_id IS DISTINCT FROM OLD.partner_id THEN
      RAISE EXCEPTION 'profile_partner_id_change_forbidden';
    END IF;
    IF NEW.staff_role IS DISTINCT FROM OLD.staff_role THEN
      RAISE EXCEPTION 'profile_staff_role_change_forbidden';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_sensitive_columns ON public.profiles;
CREATE TRIGGER guard_profile_sensitive_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_sensitive_columns();

-- Partner fields only valid for partner roles
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_partner_fields_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_partner_fields_check CHECK (
    (role IN ('partner_owner', 'partner_staff') AND partner_id IS NOT NULL)
    OR (role IN ('customer', 'admin') AND partner_id IS NULL AND staff_role IS NULL)
  );

-- Fix handle_new_user: never overwrite role on conflict
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_first_name text;
  v_last_name text;
  v_full_name text;
  v_avatar text;
BEGIN
  v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '');
  v_avatar := COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '');

  IF v_full_name <> '' THEN
    v_first_name := split_part(v_full_name, ' ', 1);
    v_last_name := COALESCE(nullif(substr(v_full_name, length(v_first_name) + 2), ''), v_first_name);
  ELSE
    v_first_name := COALESCE(split_part(new.email, '@', 1), 'Guest');
    v_last_name := 'User';
  END IF;

  INSERT INTO public.profiles (
    id, email, first_name, last_name, avatar_url, role
  )
  VALUES (
    new.id, new.email, v_first_name, v_last_name, v_avatar, 'customer'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    first_name = COALESCE(public.profiles.first_name, EXCLUDED.first_name),
    last_name = COALESCE(public.profiles.last_name, EXCLUDED.last_name),
    updated_at = now();
    -- role is intentionally NOT updated on conflict

  RETURN new;
END;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_insert_admin"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin() OR id = auth.uid());

-- ---------------------------------------------------------------------------
-- partners
-- ---------------------------------------------------------------------------

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partners_select_own_or_admin"
  ON public.partners FOR SELECT
  USING (
    public.is_admin()
    OR owner_id = auth.uid()
    OR id = public.get_my_partner_id()
  );

CREATE POLICY "partners_insert_owner"
  ON public.partners FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "partners_update_admin"
  ON public.partners FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- partner_verification_documents
-- ---------------------------------------------------------------------------

ALTER TABLE public.partner_verification_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_docs_select_own_or_admin"
  ON public.partner_verification_documents FOR SELECT
  USING (
    public.is_admin()
    OR partner_id = public.get_my_partner_id()
  );

CREATE POLICY "partner_docs_insert_own"
  ON public.partner_verification_documents FOR INSERT
  WITH CHECK (partner_id = public.get_my_partner_id());

-- ---------------------------------------------------------------------------
-- bookings (via room_types -> properties -> partner_id)
-- ---------------------------------------------------------------------------

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookings_select_customer"
  ON public.bookings FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "bookings_select_partner"
  ON public.bookings FOR SELECT
  USING (
    public.is_approved_partner()
    AND EXISTS (
      SELECT 1
      FROM public.room_types rt
      JOIN public.properties pr ON pr.id = rt.property_id
      WHERE rt.id = bookings.room_type_id
        AND pr.partner_id = public.get_my_partner_id()
    )
  );

CREATE POLICY "bookings_select_admin"
  ON public.bookings FOR SELECT
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- wishlists
-- ---------------------------------------------------------------------------

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wishlists_select_own"
  ON public.wishlists FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "wishlists_insert_own"
  ON public.wishlists FOR INSERT
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "wishlists_delete_own"
  ON public.wishlists FOR DELETE
  USING (customer_id = auth.uid());

CREATE POLICY "wishlists_select_admin"
  ON public.wishlists FOR SELECT
  USING (public.is_admin());
