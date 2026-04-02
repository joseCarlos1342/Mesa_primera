-- Migration: RPC to check if a phone number already exists in auth.users
-- Used during player registration to prevent duplicate accounts per phone number.

CREATE OR REPLACE FUNCTION public.check_phone_exists(p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users WHERE phone = p_phone
  );
END;
$$;

-- Revoke direct access from public; only callable via RPC
REVOKE ALL ON FUNCTION public.check_phone_exists(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_phone_exists(TEXT) TO authenticated, anon;
