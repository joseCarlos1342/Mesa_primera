-- Add columns to user_devices for server-side WebAuthn passkey verification (Fast Login)
ALTER TABLE public.user_devices
  ADD COLUMN IF NOT EXISTS credential_id TEXT,          -- base64url-encoded rawId
  ADD COLUMN IF NOT EXISTS public_key     BYTEA,        -- CBOR-encoded COSE public key
  ADD COLUMN IF NOT EXISTS sign_count     BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transports     TEXT[];        -- e.g. {'internal'}

-- Index for quick lookup during Fast Login challenge
CREATE INDEX IF NOT EXISTS idx_user_devices_credential_id
  ON public.user_devices(credential_id)
  WHERE credential_id IS NOT NULL;

-- RPC: look up a user's trusted device by phone + credential_id (used by Fast Login)
-- Uses SECURITY DEFINER so the anon client can call it during pre-auth.
CREATE OR REPLACE FUNCTION public.lookup_passkey_device(
  p_phone TEXT,
  p_credential_id TEXT
)
RETURNS TABLE(
  user_id UUID,
  device_id TEXT,
  public_key BYTEA,
  sign_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.user_id, d.device_id, d.public_key, d.sign_count
  FROM user_devices d
  JOIN profiles p ON p.id = d.user_id
  WHERE p.phone = p_phone
    AND d.credential_id = p_credential_id
    AND d.is_trusted = true
    AND d.public_key IS NOT NULL
  LIMIT 1;
$$;

-- RPC: increment sign_count after successful verification (replay attack protection)
CREATE OR REPLACE FUNCTION public.bump_passkey_sign_count(
  p_credential_id TEXT,
  p_new_count BIGINT
)
RETURNS VOID
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE user_devices
  SET sign_count = p_new_count,
      last_login_at = NOW()
  WHERE credential_id = p_credential_id;
$$;
