-- Migration: Sync auth.users to public.profiles and public.users view
-- Ensures that when a user signs up or logs in via Supabase Auth,
-- user data is automatically inserted/updated into public.profiles (and accessible via public.users view).

-- 1. Create handle_new_user function to sync auth.users inserts to public.profiles
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
    id,
    email,
    first_name,
    last_name,
    avatar_url,
    role
  )
  VALUES (
    new.id,
    new.email,
    v_first_name,
    v_last_name,
    v_avatar,
    'customer'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  RETURN new;
END;
$$;

-- 2. Attach trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Create public.users view to support references or queries targeting public.users
CREATE OR REPLACE VIEW public.users AS
SELECT
  id,
  email,
  first_name,
  last_name,
  phone_number,
  avatar_url,
  role,
  created_at,
  updated_at
FROM public.profiles;
