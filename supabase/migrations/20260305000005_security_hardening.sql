-- =============================================================
-- Security Hardening: Sprint 0 & 1 Remediation
-- =============================================================
-- This migration fixes:
-- 1. RLS Privilege Escalation: Players could change their own role.
-- 2. Role Injection: Users could set their role via client metadata.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Fix RLS in Profiles
-- -------------------------------------------------------------
-- First, drop the insecure policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create a hardened policy that prevents role modification
CREATE POLICY "Users can update own non-sensitive profile data"
ON public.profiles FOR UPDATE USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND 
  (
    -- Ensure role doesn't change
    role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) OR
    -- Or allow if the new role is actually the same as current stored role
    -- (This handles the case where the update payload might include the current role)
    role IS NOT DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  )
);

-- -------------------------------------------------------------
-- 2. Harden handle_new_user Trigger
-- -------------------------------------------------------------
-- Force role to 'player' regardless of client-provided metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile with FORCED 'player' role
  INSERT INTO public.profiles (id, username, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.phone, NEW.email, 'user_' || substr(NEW.id::text, 1, 8)), 
    'player' -- Security: HARDCODED TO PLAYER. Roles must be assigned by existing admins.
  );

  -- Create wallet
  INSERT INTO public.wallets (user_id)
  VALUES (NEW.id);

  -- Initial player stats
  INSERT INTO public.player_stats (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit entry for the fix
INSERT INTO public.admin_audit_log (admin_id, action, details)
SELECT id, 'SECURITY_FIX_APPLIED', '{"description": "Applied hardening to RLS profiles and handle_new_user trigger"}'::jsonb
FROM auth.users
WHERE email = 'jose@example.com' -- Mock or real admin if exists, or skip if none for now
LIMIT 1;
