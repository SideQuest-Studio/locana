-- Migration: Ensure user profile exists before partner creation
-- Enforces that a profile record must exist before inserting into partners table in create_partner_rpc

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
  v_profile_exists boolean;
BEGIN
  -- 1. Explicitly check that the user profile exists before creating partner data
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_owner_id) INTO v_profile_exists;
  IF NOT v_profile_exists THEN
    RAISE EXCEPTION 'Profile for user % does not exist. A user and profile must be created first before registering as a partner.', p_owner_id;
  END IF;

  v_partner_id := gen_random_uuid();

  -- 2. Insert partner application with status 'pending'
  INSERT INTO public.partners (
    id, owner_id, business_name, business_email, business_phone, status
  )
  VALUES (
    v_partner_id, p_owner_id, p_business_name, p_business_email, p_business_phone, 'pending'
  );

  -- 3. Automatically update profile role to partner_owner and attach partner_id
  UPDATE public.profiles
  SET role = 'partner_owner',
      partner_id = v_partner_id,
      updated_at = now()
  WHERE id = p_owner_id;

  RETURN v_partner_id;
END;
$$;
