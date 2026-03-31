-- Single Session Policy: add device tracking to profiles
-- Ensures only one active session per user at a time.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_device_id TEXT,
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.last_device_id IS 'Device identifier of the most recent authenticated session. Used to enforce single-session policy.';
COMMENT ON COLUMN public.profiles.is_online IS 'Whether the user currently has an active Colyseus connection.';
