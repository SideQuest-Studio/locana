-- Enable RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Allow partners to update their own property
DROP POLICY IF EXISTS "partner_update_own_property" ON public.properties;
CREATE POLICY "partner_update_own_property" ON public.properties
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT owner_id FROM public.partners WHERE id = properties.partner_id
    )
  );

-- Allow partners to insert their property (if not already exists)
DROP POLICY IF EXISTS "partner_insert_own_property" ON public.properties;
CREATE POLICY "partner_insert_own_property" ON public.properties
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT owner_id FROM public.partners WHERE id = properties.partner_id
    )
  );
