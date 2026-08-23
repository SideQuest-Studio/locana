-- Seed storage bucket for property images if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for property-images
DROP POLICY IF EXISTS "Public can view property images" ON storage.objects;
CREATE POLICY "Public can view property images"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-images');

DROP POLICY IF EXISTS "Authenticated users can upload property images" ON storage.objects;
CREATE POLICY "Authenticated users can upload property images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'property-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete property images" ON storage.objects;
CREATE POLICY "Authenticated users can delete property images"
ON storage.objects FOR DELETE
USING (bucket_id = 'property-images' AND auth.role() = 'authenticated');

-- Ensure UUID default on tables if missing
ALTER TABLE public.areas ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.amenity_categories ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.amenities ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.property_images ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.properties ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Seed Quezon Province launch areas
INSERT INTO public.areas (name_en, name_fil, slug, province, sort_order)
VALUES
  ('Lucena City', 'Lungsod ng Lucena', 'lucena-city', 'Quezon', 1),
  ('Tayabas City', 'Lungsod ng Tayabas', 'tayabas-city', 'Quezon', 2),
  ('Pagbilao', 'Pagbilao', 'pagbilao', 'Quezon', 3),
  ('Lucban', 'Lucban', 'lucban', 'Quezon', 4),
  ('Infanta', 'Infanta', 'infanta', 'Quezon', 5),
  ('Sariaya', 'Sariaya', 'sariaya', 'Quezon', 6),
  ('Real', 'Real', 'real', 'Quezon', 7),
  ('Candelaria', 'Candelaria', 'candelaria', 'Quezon', 8),
  ('Mauban', 'Mauban', 'mauban', 'Quezon', 9),
  ('Tiaong', 'Tiaong', 'tiaong', 'Quezon', 10),
  ('Dolores', 'Dolores', 'dolores', 'Quezon', 11),
  ('Sampaloc', 'Sampaloc', 'sampaloc', 'Quezon', 12)
ON CONFLICT (slug) DO NOTHING;

-- Seed Amenity Categories
INSERT INTO public.amenity_categories (name_en, name_fil, slug, sort_order)
VALUES
  ('General', 'Pangkalahatan', 'general', 1),
  ('Pool & Wellness', 'Palanguyan at Kaayusan', 'pool-wellness', 2),
  ('Food & Drink', 'Pagkain at Inumin', 'food-drink', 3),
  ('Internet & Tech', 'Internet at Teknolohiya', 'internet-tech', 4),
  ('Parking & Transport', 'Paradahan at Transportasyon', 'parking-transport', 5),
  ('Beach & Outdoors', 'Baybayin at Labas', 'beach-outdoors', 6)
ON CONFLICT (slug) DO NOTHING;

-- Seed Amenities
DO $$
DECLARE
  cat_general uuid;
  cat_pool uuid;
  cat_food uuid;
  cat_internet uuid;
  cat_parking uuid;
  cat_beach uuid;
BEGIN
  SELECT id INTO cat_general FROM public.amenity_categories WHERE slug = 'general' LIMIT 1;
  SELECT id INTO cat_pool FROM public.amenity_categories WHERE slug = 'pool-wellness' LIMIT 1;
  SELECT id INTO cat_food FROM public.amenity_categories WHERE slug = 'food-drink' LIMIT 1;
  SELECT id INTO cat_internet FROM public.amenity_categories WHERE slug = 'internet-tech' LIMIT 1;
  SELECT id INTO cat_parking FROM public.amenity_categories WHERE slug = 'parking-transport' LIMIT 1;
  SELECT id INTO cat_beach FROM public.amenity_categories WHERE slug = 'beach-outdoors' LIMIT 1;

  INSERT INTO public.amenities (category_id, name_en, name_fil, slug, icon)
  VALUES
    (cat_general, 'Air Conditioning', 'Aircon', 'air-conditioning', 'Wind'),
    (cat_general, '24/7 Front Desk', '24/7 Front Desk', 'Clock', 'Clock'),
    (cat_general, 'Daily Housekeeping', 'Araw-araw na Paglilinis', 'housekeeping', 'Sparkles'),
    (cat_pool, 'Outdoor Swimming Pool', 'Panlabas na Palanguyan', 'swimming-pool', 'Waves'),
    (cat_pool, 'Kiddie Pool', 'Palanguyan ng Bata', 'kiddie-pool', 'Baby'),
    (cat_pool, 'Spa & Massage', 'Spa at Masahe', 'spa-massage', 'Flower2'),
    (cat_food, 'Restaurant on-site', 'Restawran sa Lugar', 'restaurant', 'Utensils'),
    (cat_food, 'Complimentary Breakfast', 'Libreng Almusal', 'complimentary-breakfast', 'Coffee'),
    (cat_food, 'Bar / Lounge', 'Bar at Pahingahan', 'bar-lounge', 'Wine'),
    (cat_food, 'Room Service', 'Serbisyo sa Kuwarto', 'room-service', 'ConciergeBell'),
    (cat_internet, 'Free High-Speed Wi-Fi', 'Libreng Mabilis na Wi-Fi', 'free-wifi', 'Wifi'),
    (cat_parking, 'Free Secured Parking', 'Libreng Ligtas na Paradahan', 'free-parking', 'Car'),
    (cat_parking, 'Airport / Terminal Shuttle', 'Serbisyo ng Shuttle', 'shuttle-service', 'Bus'),
    (cat_beach, 'Beachfront Access', 'Harap ng Dagat', 'beachfront-access', 'Umbrella'),
    (cat_beach, 'BBQ & Grilling Area', 'Lugar ng Ihawan', 'bbq-facilities', 'Flame'),
    (cat_beach, 'Garden & Picnic Area', 'Hardin at Piknik', 'garden-area', 'Trees')
  ON CONFLICT (slug) DO NOTHING;
END $$;

-- Enable RLS for property_images
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "property_images_select" ON public.property_images;
CREATE POLICY "property_images_select" ON public.property_images
FOR SELECT USING (true);

DROP POLICY IF EXISTS "property_images_all_partner" ON public.property_images;
CREATE POLICY "property_images_all_partner" ON public.property_images
FOR ALL USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_images.property_id
    AND p.partner_id = public.get_my_partner_id()
  )
);

-- Comprehensive Save Property RPC
CREATE OR REPLACE FUNCTION public.save_property_details_rpc(
  p_partner_id uuid,
  p_name text,
  p_property_type text,
  p_area_id uuid,
  p_description_en text,
  p_description_fil text,
  p_address text,
  p_latitude numeric,
  p_longitude numeric,
  p_check_in_time time,
  p_check_out_time time,
  p_early_checkin_fee numeric,
  p_late_checkout_fee numeric,
  p_downpayment_rate numeric,
  p_amenity_ids uuid[]
) RETURNS uuid AS $$
DECLARE
  v_property_id uuid;
  v_slug text;
  v_amenity_id uuid;
BEGIN
  v_slug := public.slugify(p_name);
  
  -- Insert or Update Property
  INSERT INTO public.properties (
    partner_id,
    name,
    slug,
    property_type,
    area_id,
    description_en,
    description_fil,
    address,
    latitude,
    longitude,
    check_in_time,
    check_out_time,
    early_checkin_fee,
    late_checkout_fee,
    downpayment_rate,
    status,
    updated_at
  )
  VALUES (
    p_partner_id,
    p_name,
    v_slug,
    p_property_type::public.property_type,
    p_area_id,
    p_description_en,
    p_description_fil,
    p_address,
    p_latitude,
    p_longitude,
    COALESCE(p_check_in_time, '14:00'::time),
    COALESCE(p_check_out_time, '12:00'::time),
    COALESCE(p_early_checkin_fee, 0),
    COALESCE(p_late_checkout_fee, 0),
    COALESCE(p_downpayment_rate, 0.30),
    'published'::public.property_status,
    now()
  )
  ON CONFLICT (partner_id)
  DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    property_type = EXCLUDED.property_type,
    area_id = EXCLUDED.area_id,
    description_en = EXCLUDED.description_en,
    description_fil = EXCLUDED.description_fil,
    address = EXCLUDED.address,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    check_in_time = EXCLUDED.check_in_time,
    check_out_time = EXCLUDED.check_out_time,
    early_checkin_fee = EXCLUDED.early_checkin_fee,
    late_checkout_fee = EXCLUDED.late_checkout_fee,
    downpayment_rate = EXCLUDED.downpayment_rate,
    updated_at = now()
  RETURNING id INTO v_property_id;

  -- Sync amenities
  IF p_amenity_ids IS NOT NULL THEN
    DELETE FROM public.property_amenities WHERE property_id = v_property_id;
    
    IF array_length(p_amenity_ids, 1) > 0 THEN
      FOREACH v_amenity_id IN ARRAY p_amenity_ids
      LOOP
        INSERT INTO public.property_amenities (property_id, amenity_id)
        VALUES (v_property_id, v_amenity_id)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  END IF;

  RETURN v_property_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
