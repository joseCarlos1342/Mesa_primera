-- =============================================================
-- Migration: MP4 Render Metadata for game_replays
-- Description: Adds columns to track the lifecycle of MP4
--              video artifacts generated from replay JSON.
-- Status flow: pending → processing → ready | failed
-- =============================================================

-- 1. Add MP4 metadata columns to game_replays
ALTER TABLE public.game_replays
  ADD COLUMN IF NOT EXISTS mp4_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS mp4_path TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS mp4_size_bytes BIGINT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS mp4_duration_ms INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS mp4_rendered_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS mp4_error TEXT DEFAULT NULL;

-- 2. Check constraint for valid status values
ALTER TABLE public.game_replays
  DROP CONSTRAINT IF EXISTS chk_mp4_status;

ALTER TABLE public.game_replays
  ADD CONSTRAINT chk_mp4_status
  CHECK (mp4_status IS NULL OR mp4_status IN ('pending', 'processing', 'ready', 'failed'));

-- 3. Index for admin queries filtering by MP4 status
CREATE INDEX IF NOT EXISTS idx_game_replays_mp4_status
  ON public.game_replays (mp4_status)
  WHERE mp4_status IS NOT NULL;

-- 4. RPC to update MP4 status from game-server (service_role only)
--    SECURITY DEFINER so the game-server can call it with service_role key.
CREATE OR REPLACE FUNCTION public.update_replay_mp4_status(
  p_game_id UUID,
  p_status TEXT,
  p_path TEXT DEFAULT NULL,
  p_size_bytes BIGINT DEFAULT NULL,
  p_duration_ms INT DEFAULT NULL,
  p_error TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate status
  IF p_status NOT IN ('pending', 'processing', 'ready', 'failed') THEN
    RAISE EXCEPTION 'Invalid mp4_status: %', p_status;
  END IF;

  UPDATE public.game_replays
  SET
    mp4_status = p_status,
    mp4_path = COALESCE(p_path, mp4_path),
    mp4_size_bytes = COALESCE(p_size_bytes, mp4_size_bytes),
    mp4_duration_ms = COALESCE(p_duration_ms, mp4_duration_ms),
    mp4_rendered_at = CASE WHEN p_status = 'ready' THEN NOW() ELSE mp4_rendered_at END,
    mp4_error = CASE WHEN p_status = 'failed' THEN p_error ELSE NULL END
  WHERE game_id = p_game_id;
END;
$$;
