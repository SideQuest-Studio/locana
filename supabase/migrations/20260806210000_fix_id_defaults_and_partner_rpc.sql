-- Migration: Add DEFAULT gen_random_uuid() to all table primary keys and fix create_partner_rpc
-- Resolves null value in column "id" of relation "partners" violates not-null constraint

-- 1. Add DEFAULT gen_random_uuid() to primary key columns across all tables
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.areas ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.partners ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.partner_verification_documents ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.properties ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.property_images ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.amenity_categories ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.amenities ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.tags ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.room_types ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.rooms ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.rate_plans ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.pricing_rules ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.packages ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.package_items ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.bookings ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.booking_rooms ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.booking_packages ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.booking_status_history ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.payments ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.payment_events ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.commission_ledger ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.payouts ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.promo_codes ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.promo_redemptions ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.loyalty_accounts ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.guest_id_documents ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.audit_logs ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.wishlists ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.reviews ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2. Update create_partner_rpc function to explicitly assign gen_random_uuid() to v_partner_id
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
  v_partner_id := gen_random_uuid();

  -- Insert partner application with status 'pending'
  INSERT INTO public.partners (
    id, owner_id, business_name, business_email, business_phone, status
  )
  VALUES (
    v_partner_id, p_owner_id, p_business_name, p_business_email, p_business_phone, 'pending'
  );

  -- Automatically update profile role to partner_owner and attach partner_id
  UPDATE public.profiles
  SET role = 'partner_owner',
      partner_id = v_partner_id,
      updated_at = now()
  WHERE id = p_owner_id;

  RETURN v_partner_id;
END;
$$;
