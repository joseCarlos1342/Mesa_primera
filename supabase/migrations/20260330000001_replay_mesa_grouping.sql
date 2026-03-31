-- Migration: Replay recording fixes + mesa grouping
-- 1. Add room_id / table_name columns to game_replays for mesa grouping
-- 2. Add INSERT policy so anon/service key can write replays
-- 3. Add INSERT policy for games and tables (game server writes these)
-- 4. New RPCs for mesa-grouped replay listing

-- ============================================================
-- 1. Add room_id and table_name to game_replays
-- ============================================================

ALTER TABLE public.game_replays
  ADD COLUMN IF NOT EXISTS room_id TEXT,
  ADD COLUMN IF NOT EXISTS table_name TEXT;

COMMENT ON COLUMN public.game_replays.room_id IS 'Colyseus room ID — groups multiple games played at the same mesa session';
COMMENT ON COLUMN public.game_replays.table_name IS 'Human-readable table name at the time of recording (e.g. Mesa #1)';

CREATE INDEX IF NOT EXISTS idx_game_replays_room_id ON public.game_replays(room_id);

-- ============================================================
-- 2. INSERT policies for game server (anon key fallback)
--    The service_role key bypasses RLS, but if the game server
--    falls back to the anon key these policies allow inserts.
--    game_replays is already immutable (no UPDATE/DELETE).
-- ============================================================

-- game_replays: allow server-side inserts
DROP POLICY IF EXISTS "replay_server_insert" ON public.game_replays;
CREATE POLICY "replay_server_insert" ON public.game_replays
  FOR INSERT
  WITH CHECK (true);

-- games: allow server-side upserts (game server creates game records)
DROP POLICY IF EXISTS "games_server_insert" ON public.games;
CREATE POLICY "games_server_insert" ON public.games
  FOR INSERT
  WITH CHECK (true);

-- games: allow server-side status updates
DROP POLICY IF EXISTS "games_server_update" ON public.games;
CREATE POLICY "games_server_update" ON public.games
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- tables: allow server-side inserts (auto-created default tables)
DROP POLICY IF EXISTS "tables_server_insert" ON public.tables;
CREATE POLICY "tables_server_insert" ON public.tables
  FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- 3. get_player_replays_by_mesa()
--    Groups replays by room_id for the player mesa list view.
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
    -- Aggregate unique players from all games in this room
    (
      SELECT jsonb_agg(DISTINCT elem)
      FROM game_replays gr2,
           jsonb_array_elements(gr2.players) AS elem
      WHERE COALESCE(gr2.room_id, gr2.game_id::text) = COALESCE(gr.room_id, gr.game_id::text)
        AND gr2.players @> ANY (
          ARRAY[('[{"userId": "' || p_user_id::text || '"}]')::jsonb]
        )
    ) AS players,
    -- Total net result across all games in this room
    COALESCE(
      (SELECT SUM(CASE WHEN l.direction = 'credit' THEN l.amount_cents ELSE -l.amount_cents END)
       FROM ledger l
       INNER JOIN game_replays gr3 ON gr3.game_id = l.game_id
       WHERE COALESCE(gr3.room_id, gr3.game_id::text) = COALESCE(gr.room_id, gr.game_id::text)
         AND l.user_id = p_user_id),
      0
    )::BIGINT AS total_net_result
  FROM game_replays gr
  WHERE gr.players @> ANY (
    ARRAY[('[{"userId": "' || p_user_id::text || '"}]')::jsonb]
  )
  GROUP BY COALESCE(gr.room_id, gr.game_id::text)
  ORDER BY MAX(gr.created_at) DESC
  LIMIT p_limit;
$$;

-- ============================================================
-- 4. get_player_replays_for_room()
--    Returns individual game replays for a specific room/mesa.
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
  ORDER BY gr.created_at ASC
  LIMIT p_limit;
$$;
