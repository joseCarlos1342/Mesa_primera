-- Migration: 20260329000000_replay_listing_rpcs.sql
-- Description: RPCs for efficient replay listing (player + admin views)

-- ============================================================
-- 1. get_player_replays(p_user_id)
--    Returns the calling player's games with financial summary.
--    RLS on game_replays already ensures player can only see
--    their own games — this RPC just enriches with ledger data.
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
    -- net_result: credits minus debits for this user in this game
    COALESCE(
      (SELECT SUM(CASE WHEN l.direction = 'credit' THEN l.amount_cents ELSE -l.amount_cents END)
       FROM ledger l WHERE l.game_id = gr.game_id AND l.user_id = p_user_id),
      0
    )::BIGINT AS net_result,
    -- total_pot from the end event in timeline
    COALESCE(
      (SELECT SUM(CASE WHEN l.direction = 'credit' AND l.type = 'win' THEN l.amount_cents ELSE 0 END)
       FROM ledger l WHERE l.game_id = gr.game_id),
      0
    )::BIGINT AS total_pot,
    -- is_winner: did this user receive a 'win' credit?
    EXISTS (
      SELECT 1 FROM ledger l
      WHERE l.game_id = gr.game_id AND l.user_id = p_user_id AND l.type = 'win'
    ) AS is_winner
  FROM game_replays gr
  WHERE gr.players @> ANY (
    ARRAY[('[{"userId": "' || p_user_id::text || '"}]')::jsonb]
  )
  ORDER BY gr.created_at DESC
  LIMIT p_limit;
$$;

-- ============================================================
-- 2. get_admin_replays(p_limit, p_offset)
--    Returns all finished game replays for admin auditing.
--    Only callable by admins (checked inside).
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_admin_replays(p_limit INT DEFAULT 50, p_offset INT DEFAULT 0)
RETURNS TABLE (
  game_id UUID,
  played_at TIMESTAMPTZ,
  players JSONB,
  total_pot BIGINT,
  total_rake BIGINT,
  winner_id TEXT
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
    -- total_pot: sum of all credits for this game
    COALESCE(
      (SELECT SUM(l.amount_cents) FROM ledger l WHERE l.game_id = gr.game_id AND l.direction = 'credit' AND l.type = 'win'),
      0
    )::BIGINT AS total_pot,
    -- total_rake
    COALESCE(
      (SELECT SUM(l.amount_cents) FROM ledger l WHERE l.game_id = gr.game_id AND l.type = 'rake'),
      0
    )::BIGINT AS total_rake,
    -- winner: user_id of the 'win' credit recipient
    (SELECT l.user_id::text FROM ledger l WHERE l.game_id = gr.game_id AND l.type = 'win' LIMIT 1) AS winner_id
  FROM game_replays gr
  INNER JOIN games g ON g.id = gr.game_id AND g.status = 'finished'
  ORDER BY gr.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- ============================================================
-- 3. get_replay_ledger(p_game_id)
--    Returns all ledger entries for a specific game (admin use).
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_replay_ledger(p_game_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  type TEXT,
  direction TEXT,
  amount_cents BIGINT,
  balance_after_cents BIGINT,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.id, l.user_id, l.type, l.direction, l.amount_cents,
         l.balance_after_cents, l.description, l.metadata, l.created_at
  FROM ledger l
  WHERE l.game_id = p_game_id
  ORDER BY l.created_at ASC;
$$;
