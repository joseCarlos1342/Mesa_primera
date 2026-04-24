-- =============================================================
-- Migration: Drop MP4 Render Metadata
-- Description: Retira el pipeline MP4 del sistema de replays.
--              Los replays v2 se reconstruyen visualmente desde
--              el JSON (frames[]) persistido en el VPS, sin
--              necesidad de renderizar video.
-- Reverts:     20260413000000_mp4_render_metadata.sql
-- =============================================================

-- 1. RPC de actualización de estado MP4 (ya no se invoca)
DROP FUNCTION IF EXISTS public.update_replay_mp4_status(UUID, TEXT, TEXT, BIGINT, INT, TEXT);

-- 2. Índice de status MP4
DROP INDEX IF EXISTS public.idx_game_replays_mp4_status;

-- 3. Constraint de valores válidos
ALTER TABLE public.game_replays
  DROP CONSTRAINT IF EXISTS chk_mp4_status;

-- 4. Columnas de metadatos MP4
ALTER TABLE public.game_replays
  DROP COLUMN IF EXISTS mp4_status,
  DROP COLUMN IF EXISTS mp4_path,
  DROP COLUMN IF EXISTS mp4_size_bytes,
  DROP COLUMN IF EXISTS mp4_duration_ms,
  DROP COLUMN IF EXISTS mp4_rendered_at,
  DROP COLUMN IF EXISTS mp4_error;
