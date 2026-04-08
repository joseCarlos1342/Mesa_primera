-- Migration: Replay 7-day retention for players
-- Description: Players can only see replays from the last 7 days.
--              Admin RPCs remain unrestricted for auditing purposes.
--              Old replay rows in game_replays are NOT deleted (admin needs them).
--              The game-server filesystem cleanup handles file deletion.

-- ============================================================
-- 1. get_player_replays — add 7-day window
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_player_replays(p_user_id UUID, p_limit INT DEFAULT 50)
RETURNS TABLE (
  game_id UUID,
  played_at TIMESTAMPTZ,
  players JSONB,
  net_result BIGINT,
  total_pot BIGINT,
  is_winner BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    gr.game_id,
    gr.created_at AS played_at,
    gr.players,
    COALESCE(
      (SELECT SUM(CASE WHEN l.direction = 'credit' THEN l.amount_cents ELSE -l.amount_cents END)
       FROM ledger l WHERE l.game_id = gr.game_id AND l.user_id = p_user_id),
      0
    )::BIGINT AS net_result,
    COALESCE(
      (SELECT SUM(CASE WHEN l.direction = 'credit' AND l.type = 'win' THEN l.amount_cents ELSE 0 END)
       FROM ledger l WHERE l.game_id = gr.game_id),
      0
    )::BIGINT AS total_pot,
    EXISTS (
      SELECT 1 FROM ledger l
      WHERE l.game_id = gr.game_id AND l.user_id = p_user_id AND l.type = 'win'
    ) AS is_winner
  FROM game_replays gr
  WHERE gr.players @> ANY (
    ARRAY[('[{"userId": "' || p_user_id::text || '"}]')::jsonb]
  )
    AND gr.created_at >= (NOW() - INTERVAL '7 days')
  ORDER BY gr.created_at DESC
  LIMIT p_limit;
$$;

-- ============================================================
-- 2. get_player_replays_by_mesa — add 7-day window
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_player_replays_by_mesa(p_user_id UUID, p_limit INT DEFAULT 50)
RETURNS TABLE (
  room_id TEXT,
  table_name TEXT,
  first_played_at TIMESTAMPTZ,
  last_played_at TIMESTAMPTZ,
  game_count BIGINT,
  players JSONB,
  total_net_result BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(gr.room_id, gr.game_id::text) AS room_id,
    COALESCE(MAX(gr.table_name), 'Mesa') AS table_name,
    MIN(gr.created_at) AS first_played_at,
    MAX(gr.created_at) AS last_played_at,
    COUNT(*)::BIGINT AS game_count,
    (
      SELECT jsonb_agg(DISTINCT elem)
      FROM game_replays gr2,
           jsonb_array_elements(gr2.players) AS elem
      WHERE COALESCE(gr2.room_id, gr2.game_id::text) = COALESCE(gr.room_id, gr.game_id::text)
        AND gr2.players @> ANY (
          ARRAY[('[{"userId": "' || p_user_id::text || '"}]')::jsonb]
        )
        AND gr2.created_at >= (NOW() - INTERVAL '7 days')
    ) AS players,
    COALESCE(
      (SELECT SUM(CASE WHEN l.direction = 'credit' THEN l.amount_cents ELSE -l.amount_cents END)
       FROM ledger l
       INNER JOIN game_replays gr3 ON gr3.game_id = l.game_id
       WHERE COALESCE(gr3.room_id, gr3.game_id::text) = COALESCE(gr.room_id, gr.game_id::text)
         AND gr3.created_at >= (NOW() - INTERVAL '7 days')
         AND l.user_id = p_user_id),
      0
    )::BIGINT AS total_net_result
  FROM game_replays gr
  WHERE gr.players @> ANY (
    ARRAY[('[{"userId": "' || p_user_id::text || '"}]')::jsonb]
  )
    AND gr.created_at >= (NOW() - INTERVAL '7 days')
  GROUP BY COALESCE(gr.room_id, gr.game_id::text)
  ORDER BY MAX(gr.created_at) DESC
  LIMIT p_limit;
$$;

-- ============================================================
-- 3. get_player_replays_for_room — add 7-day window
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_player_replays_for_room(p_user_id UUID, p_room_id TEXT, p_limit INT DEFAULT 100)
RETURNS TABLE (
  game_id UUID,
  played_at TIMESTAMPTZ,
  players JSONB,
  net_result BIGINT,
  total_pot BIGINT,
  is_winner BOOLEAN,
  round_number INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    gr.game_id,
    gr.created_at AS played_at,
    gr.players,
    COALESCE(
      (SELECT SUM(CASE WHEN l.direction = 'credit' THEN l.amount_cents ELSE -l.amount_cents END)
       FROM ledger l WHERE l.game_id = gr.game_id AND l.user_id = p_user_id),
      0
    )::BIGINT AS net_result,
    COALESCE(
      (SELECT SUM(CASE WHEN l.direction = 'credit' AND l.type = 'win' THEN l.amount_cents ELSE 0 END)
       FROM ledger l WHERE l.game_id = gr.game_id),
      0
    )::BIGINT AS total_pot,
    EXISTS (
      SELECT 1 FROM ledger l
      WHERE l.game_id = gr.game_id AND l.user_id = p_user_id AND l.type = 'win'
    ) AS is_winner,
    gr.round_number
  FROM game_replays gr
  WHERE COALESCE(gr.room_id, gr.game_id::text) = p_room_id
    AND gr.players @> ANY (
      ARRAY[('[{"userId": "' || p_user_id::text || '"}]')::jsonb]
    )
    AND gr.created_at >= (NOW() - INTERVAL '7 days')
  ORDER BY gr.created_at ASC
  LIMIT p_limit;
$$;

-- NOTE: Admin RPCs (get_admin_replays, get_replay_ledger) are NOT modified.
-- Admins retain full historical access for auditing and compliance.
