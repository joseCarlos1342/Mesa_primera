-- Add phone and full_name columns to profiles for Google OAuth registration flow
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Phone should be unique when set (allows NULL)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique ON public.profiles (phone) WHERE phone IS NOT NULL;

COMMENT ON COLUMN public.profiles.phone IS 'Phone number (E.164 format). Set after OTP verification.';
COMMENT ON COLUMN public.profiles.full_name IS 'User display name from registration or Google profile.';
