-- =============================================================
-- Security hardening: replay RPC authorization boundaries
-- =============================================================
-- Fixes SECURITY DEFINER replay RPCs so callers cannot bypass RLS by
-- passing another user's id, and so admin-only replay/ledger RPCs have
-- an explicit database-level guard in addition to server-action checks.

CREATE OR REPLACE FUNCTION public.get_player_replays(p_user_id UUID, p_limit INT DEFAULT 50)
RETURNS TABLE (
  game_id UUID,
  played_at TIMESTAMPTZ,
  players JSONB,
  net_result BIGINT,
  total_pot BIGINT,
  is_winner BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT
      gr.game_id,
      gr.created_at AS played_at,
      gr.players,
      COALESCE(
        (SELECT SUM(CASE WHEN l.direction = 'credit' THEN l.amount_cents ELSE -l.amount_cents END)
         FROM public.ledger l WHERE l.game_id = gr.game_id AND l.user_id = p_user_id),
        0
      )::BIGINT AS net_result,
      COALESCE(
        (SELECT SUM(CASE WHEN l.direction = 'credit' AND l.type = 'win' THEN l.amount_cents ELSE 0 END)
         FROM public.ledger l WHERE l.game_id = gr.game_id),
        0
      )::BIGINT AS total_pot,
      EXISTS (
        SELECT 1 FROM public.ledger l
        WHERE l.game_id = gr.game_id AND l.user_id = p_user_id AND l.type = 'win'
      ) AS is_winner
    FROM public.game_replays gr
    INNER JOIN public.games g ON g.id = gr.game_id AND g.status = 'finished'
    WHERE gr.players @> ANY (
      ARRAY[('[{"userId": "' || p_user_id::text || '"}]')::jsonb]
    )
      AND gr.created_at >= (NOW() - INTERVAL '7 days')
    ORDER BY gr.created_at DESC
    LIMIT p_limit;
END;
$$;

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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    WITH keyed AS (
      SELECT gr.*, COALESCE(gr.room_id, gr.game_id::text) AS mesa_key
      FROM public.game_replays gr
      INNER JOIN public.games g ON g.id = gr.game_id AND g.status = 'finished'
      WHERE gr.players @> ANY (
        ARRAY[('[{"userId": "' || p_user_id::text || '"}]')::jsonb]
      )
        AND gr.created_at >= (NOW() - INTERVAL '7 days')
    )
    SELECT
      k.mesa_key AS room_id,
      COALESCE(MAX(k.table_name), 'Mesa') AS table_name,
      MIN(k.created_at) AS first_played_at,
      MAX(k.created_at) AS last_played_at,
      COUNT(*)::BIGINT AS game_count,
      (
        SELECT jsonb_agg(DISTINCT elem)
        FROM public.game_replays gr2
        INNER JOIN public.games g2 ON g2.id = gr2.game_id AND g2.status = 'finished'
        CROSS JOIN jsonb_array_elements(gr2.players) AS elem
        WHERE COALESCE(gr2.room_id, gr2.game_id::text) = k.mesa_key
          AND gr2.players @> ANY (
            ARRAY[('[{"userId": "' || p_user_id::text || '"}]')::jsonb]
          )
          AND gr2.created_at >= (NOW() - INTERVAL '7 days')
      ) AS players,
      COALESCE(
        (SELECT SUM(CASE WHEN l.direction = 'credit' THEN l.amount_cents ELSE -l.amount_cents END)
         FROM public.ledger l
         INNER JOIN public.game_replays gr3 ON gr3.game_id = l.game_id
         INNER JOIN public.games g3 ON g3.id = gr3.game_id AND g3.status = 'finished'
         WHERE COALESCE(gr3.room_id, gr3.game_id::text) = k.mesa_key
           AND gr3.created_at >= (NOW() - INTERVAL '7 days')
           AND l.user_id = p_user_id),
        0
      )::BIGINT AS total_net_result
    FROM keyed k
    GROUP BY k.mesa_key
    ORDER BY MAX(k.created_at) DESC
    LIMIT p_limit;
END;
$$;

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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT
      gr.game_id,
      gr.created_at AS played_at,
      gr.players,
      COALESCE(
        (SELECT SUM(CASE WHEN l.direction = 'credit' THEN l.amount_cents ELSE -l.amount_cents END)
         FROM public.ledger l WHERE l.game_id = gr.game_id AND l.user_id = p_user_id),
        0
      )::BIGINT AS net_result,
      COALESCE(
        (SELECT SUM(CASE WHEN l.direction = 'credit' AND l.type = 'win' THEN l.amount_cents ELSE 0 END)
         FROM public.ledger l WHERE l.game_id = gr.game_id),
        0
      )::BIGINT AS total_pot,
      EXISTS (
        SELECT 1 FROM public.ledger l
        WHERE l.game_id = gr.game_id AND l.user_id = p_user_id AND l.type = 'win'
      ) AS is_winner,
      gr.round_number
    FROM public.game_replays gr
    INNER JOIN public.games g ON g.id = gr.game_id AND g.status = 'finished'
    WHERE COALESCE(gr.room_id, gr.game_id::text) = p_room_id
      AND gr.players @> ANY (
        ARRAY[('[{"userId": "' || p_user_id::text || '"}]')::jsonb]
      )
      AND gr.created_at >= (NOW() - INTERVAL '7 days')
    ORDER BY gr.created_at ASC
    LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_replays(p_limit INT DEFAULT 50, p_offset INT DEFAULT 0)
RETURNS TABLE (
  game_id UUID,
  played_at TIMESTAMPTZ,
  players JSONB,
  total_pot BIGINT,
  total_rake BIGINT,
  winner_id TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT COALESCE((SELECT public.is_admin()), false) THEN
    RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT
      gr.game_id,
      gr.created_at AS played_at,
      gr.players,
      COALESCE(
        (SELECT SUM(l.amount_cents) FROM public.ledger l WHERE l.game_id = gr.game_id AND l.direction = 'credit' AND l.type = 'win'),
        0
      )::BIGINT AS total_pot,
      COALESCE(
        (SELECT SUM(l.amount_cents) FROM public.ledger l WHERE l.game_id = gr.game_id AND l.type = 'rake'),
        0
      )::BIGINT AS total_rake,
      (SELECT l.user_id::text FROM public.ledger l WHERE l.game_id = gr.game_id AND l.type = 'win' LIMIT 1) AS winner_id
    FROM public.game_replays gr
    INNER JOIN public.games g ON g.id = gr.game_id AND g.status = 'finished'
    ORDER BY gr.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT COALESCE((SELECT public.is_admin()), false) THEN
    RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT l.id, l.user_id, l.type, l.direction, l.amount_cents::BIGINT,
           l.balance_after_cents::BIGINT, l.description, l.metadata, l.created_at
    FROM public.ledger l
    INNER JOIN public.games g ON g.id = l.game_id AND g.status = 'finished'
    WHERE l.game_id = p_game_id
    ORDER BY l.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_player_replays(UUID, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_player_replays_by_mesa(UUID, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_player_replays_for_room(UUID, TEXT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_admin_replays(INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_replay_ledger(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_player_replays(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_replays_by_mesa(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_replays_for_room(UUID, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_replays(INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_replay_ledger(UUID) TO authenticated;
