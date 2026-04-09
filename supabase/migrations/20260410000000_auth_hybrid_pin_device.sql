-- Migration: Hybrid auth model (PIN + Trusted Device)
--
-- Adds trusted_until column to user_devices for 30-day device trust expiry.
-- Adds has_pin column to profiles to track whether the user has set a PIN.

-- 1. Add trusted_until to user_devices
ALTER TABLE public.user_devices
  ADD COLUMN IF NOT EXISTS trusted_until TIMESTAMPTZ;

-- 2. Add has_pin flag to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_pin BOOLEAN DEFAULT FALSE;

-- 3. RPC: register a trusted device (called after OTP verification)
CREATE OR REPLACE FUNCTION public.register_trusted_device(
  p_device_id TEXT,
  p_trust_days INT DEFAULT 30
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_devices (user_id, device_id, is_trusted, trusted_until, last_login_at)
  VALUES (
    auth.uid(),
    p_device_id,
    true,
    NOW() + (p_trust_days || ' days')::interval,
    NOW()
  )
  ON CONFLICT (user_id, device_id)
  DO UPDATE SET
    is_trusted    = true,
    trusted_until = NOW() + (p_trust_days || ' days')::interval,
    last_login_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_trusted_device(TEXT, INT) TO authenticated;

-- 4. RPC: check if a device is trusted for a given phone (pre-auth, anon-callable)
CREATE OR REPLACE FUNCTION public.is_device_trusted(
  p_phone TEXT,
  p_device_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone_clean TEXT;
BEGIN
  v_phone_clean := regexp_replace(p_phone, '^\+', '');

  RETURN EXISTS (
    SELECT 1
    FROM user_devices d
    JOIN auth.users u ON u.id = d.user_id
    WHERE (u.phone = p_phone OR u.phone = v_phone_clean)
      AND d.device_id = p_device_id
      AND d.is_trusted = true
      AND d.trusted_until > NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_device_trusted(TEXT, TEXT) TO anon, authenticated;

-- 5. RPC: check if user has set a PIN (pre-auth check, anon-callable)
CREATE OR REPLACE FUNCTION public.user_has_pin(p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone_clean TEXT;
  v_has_pin BOOLEAN;
BEGIN
  v_phone_clean := regexp_replace(p_phone, '^\+', '');

  SELECT pr.has_pin INTO v_has_pin
  FROM profiles pr
  JOIN auth.users u ON u.id = pr.id
  WHERE (u.phone = p_phone OR u.phone = v_phone_clean)
  LIMIT 1;

  RETURN COALESCE(v_has_pin, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_has_pin(TEXT) TO anon, authenticated;
