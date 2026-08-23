-- Migration: Enable RLS on rate_plans and pricing_rules

ALTER TABLE public.rate_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

-- Rate Plans RLS Policies
DROP POLICY IF EXISTS "public_select_rate_plans" ON public.rate_plans;
CREATE POLICY "public_select_rate_plans" ON public.rate_plans
FOR SELECT USING (true);

DROP POLICY IF EXISTS "partner_all_rate_plans" ON public.rate_plans;
CREATE POLICY "partner_all_rate_plans" ON public.rate_plans
FOR ALL USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.room_types rt
    JOIN public.properties p ON rt.property_id = p.id
    WHERE rt.id = rate_plans.room_type_id
    AND p.partner_id = public.get_my_partner_id()
  )
);

-- Pricing Rules RLS Policies
DROP POLICY IF EXISTS "public_select_pricing_rules" ON public.pricing_rules;
CREATE POLICY "public_select_pricing_rules" ON public.pricing_rules
FOR SELECT USING (true);

DROP POLICY IF EXISTS "partner_all_pricing_rules" ON public.pricing_rules;
CREATE POLICY "partner_all_pricing_rules" ON public.pricing_rules
FOR ALL USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = pricing_rules.property_id
    AND p.partner_id = public.get_my_partner_id()
  )
);
