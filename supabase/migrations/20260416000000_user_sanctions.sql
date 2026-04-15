-- =============================================================
-- Migration: User Sanctions & Moderation Model
-- =============================================================
-- Replaces the ad-hoc is_banned/ban_reason columns on profiles
-- with a formal sanctions table that supports:
--   - Kick (ephemeral, logged only in audit)
--   - Temporary full suspension (blocks login + room join)
--   - Temporary game suspension (blocks room join only)
--   - Permanent ban (blocks everything, no expiration)
--
-- Also creates eligibility RPCs for enforcement at auth,
-- room join, and active operations.
-- =============================================================

-- ─── 1. SANCTION TYPE ENUM ─────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.sanction_type AS ENUM (
    'full_suspension',   -- blocks login + all access
    'game_suspension',   -- blocks joining game rooms only
    'permanent_ban'      -- blocks everything, no auto-expire
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. USER_SANCTIONS TABLE ───────────────────────────────

CREATE TABLE public.user_sanctions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sanction_type public.sanction_type NOT NULL,
  reason        TEXT NOT NULL DEFAULT '',
  applied_by    UUID NOT NULL REFERENCES public.profiles(id),
  source_room_id TEXT,                           -- Colyseus room where sanction originated
  starts_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,                     -- NULL = permanent (for permanent_ban)
  revoked_at    TIMESTAMPTZ,                     -- set when admin manually revokes
  revoked_by    UUID REFERENCES public.profiles(id),
  metadata      JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for enforcement queries
CREATE INDEX idx_user_sanctions_user_active
  ON public.user_sanctions (user_id, sanction_type)
  WHERE revoked_at IS NULL;

CREATE INDEX idx_user_sanctions_expires
  ON public.user_sanctions (expires_at)
  WHERE revoked_at IS NULL AND expires_at IS NOT NULL;

-- ─── 3. RLS POLICIES ───────────────────────────────────────

ALTER TABLE public.user_sanctions ENABLE ROW LEVEL SECURITY;

-- Admins can read all sanctions
CREATE POLICY "Admins can view all sanctions"
  ON public.user_sanctions FOR SELECT
  USING (public.is_admin());

-- Admins can create sanctions
CREATE POLICY "Admins can create sanctions"
  ON public.user_sanctions FOR INSERT
  WITH CHECK (public.is_admin());

-- Admins can update sanctions (for revocation)
CREATE POLICY "Admins can update sanctions"
  ON public.user_sanctions FOR UPDATE
  USING (public.is_admin());

-- Users can view their own sanctions
CREATE POLICY "Users can view own sanctions"
  ON public.user_sanctions FOR SELECT
  USING (auth.uid() = user_id);

-- ─── 4. ELIGIBILITY RPCs ───────────────────────────────────

-- check_account_eligibility: used at login / auth recovery
-- Returns NULL if account is eligible, or a JSON object with
-- the blocking sanction details if not.
CREATE OR REPLACE FUNCTION public.check_account_eligibility(p_user_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'blocked', true,
    'sanction_id', s.id,
    'sanction_type', s.sanction_type::text,
    'reason', s.reason,
    'expires_at', s.expires_at
  )
  FROM public.user_sanctions s
  WHERE s.user_id = p_user_id
    AND s.revoked_at IS NULL
    AND s.sanction_type IN ('full_suspension', 'permanent_ban')
    AND (s.expires_at IS NULL OR s.expires_at > NOW())
  ORDER BY s.created_at DESC
  LIMIT 1;
$$;

-- check_table_access: used at room join
-- Returns NULL if user can join tables, or blocking details.
CREATE OR REPLACE FUNCTION public.check_table_access(p_user_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'blocked', true,
    'sanction_id', s.id,
    'sanction_type', s.sanction_type::text,
    'reason', s.reason,
    'expires_at', s.expires_at
  )
  FROM public.user_sanctions s
  WHERE s.user_id = p_user_id
    AND s.revoked_at IS NULL
    AND s.sanction_type IN ('full_suspension', 'game_suspension', 'permanent_ban')
    AND (s.expires_at IS NULL OR s.expires_at > NOW())
  ORDER BY s.created_at DESC
  LIMIT 1;
$$;

-- get_active_sanctions: admin convenience for viewing user sanctions
CREATE OR REPLACE FUNCTION public.get_active_sanctions(p_user_id UUID)
RETURNS SETOF public.user_sanctions
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.user_sanctions
  WHERE user_id = p_user_id
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY created_at DESC;
$$;
