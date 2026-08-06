-- Migration: Fix partner owner role assignment & create_partner_rpc
-- Ensures that creating a partner application automatically sets the profile role to 'partner_owner'
-- and permits service_role / security definer operations to update sensitive profile fields.

-- 1. Update is_admin() to recognize service_role caller
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(auth.jwt() ->> 'role', '') = 'service_role' OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 2. Update create_partner_rpc to set role = 'partner_owner' and partner_id automatically
CREATE OR REPLACE FUNCTION public.create_partner_rpc(
  p_owner_id uuid,
  p_business_name text,
  p_business_email text,
  p_business_phone text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id uuid;
BEGIN
  -- Insert partner application with status 'pending'
  INSERT INTO public.partners (
    owner_id, business_name, business_email, business_phone, status
  )
  VALUES (
    p_owner_id, p_business_name, p_business_email, p_business_phone, 'pending'
  )
  RETURNING id INTO v_partner_id;

  -- Automatically update profile role to partner_owner and attach partner_id
  UPDATE public.profiles
  SET role = 'partner_owner',
      partner_id = v_partner_id,
      updated_at = now()
  WHERE id = p_owner_id;

  RETURN v_partner_id;
END;
$$;

-- 3. Add update_user_role RPC for admin role updates
CREATE OR REPLACE FUNCTION public.update_user_role(
  p_user_id uuid,
  p_role public.user_role,
  p_partner_id uuid DEFAULT NULL,
  p_staff_role public.staff_role DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET role = p_role,
      partner_id = p_partner_id,
      staff_role = p_staff_role,
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;
