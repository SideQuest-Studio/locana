-- Helper to generate slugs
CREATE OR REPLACE FUNCTION public.slugify(text_val text) RETURNS text AS $$
BEGIN
  RETURN lower(regexp_replace(text_val, '[^a-zA-Z0-9]+', '-', 'g'));
END;
$$ LANGUAGE plpgsql;

-- Drop the old RPC first
DROP FUNCTION IF EXISTS public.update_property_rpc(uuid, text, text, text, text);

-- Create the new SECURITY DEFINER function with UPSERT logic
-- Including area_id and property_type as required fields
CREATE OR REPLACE FUNCTION public.update_property_rpc(
  p_partner_id uuid,
  p_name text,
  p_description_en text,
  p_description_fil text,
  p_address text
) RETURNS void AS $$
DECLARE
  v_area_id uuid;
  v_property_type text := 'hotel'; -- Default property type
BEGIN
  -- Get a default area_id if one exists
  SELECT id INTO v_area_id FROM public.areas LIMIT 1;
  
  INSERT INTO public.properties (partner_id, name, description_en, description_fil, address, area_id, property_type, slug)
  VALUES (p_partner_id, p_name, p_description_en, p_description_fil, p_address, v_area_id, v_property_type::public.property_type, public.slugify(p_name))
  ON CONFLICT (partner_id) 
  DO UPDATE SET
    name = EXCLUDED.name,
    description_en = EXCLUDED.description_en,
    description_fil = EXCLUDED.description_fil,
    address = EXCLUDED.address,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
