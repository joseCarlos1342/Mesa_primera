-- Player replay history is unbounded. Sensitive replay data is returned only
-- through role-specific RPCs, never from a direct table SELECT.

REVOKE SELECT ON TABLE public.game_replays FROM authenticated;

CREATE OR REPLACE FUNCTION public.get_player_replay_detail(p_game_id UUID)
RETURNS TABLE (
  id UUID,
  game_id UUID,
  created_at TIMESTAMPTZ,
  players JSONB,
  timeline JSONB,
  pot_breakdown JSONB,
  final_hands JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT gr.id, gr.game_id, gr.created_at,
      (SELECT COALESCE(jsonb_agg(player - 'cards' - 'privateCards'), '[]'::jsonb)
       FROM jsonb_array_elements(gr.players) AS player),
      (SELECT COALESCE(jsonb_agg(event - 'cards' - 'privateCards' - 'droppedCards' - 'rng_state'), '[]'::jsonb)
       FROM jsonb_array_elements(gr.timeline) AS event),
      gr.pot_breakdown,
      jsonb_build_object(auth.uid()::text, COALESCE(gr.final_hands -> auth.uid()::text, '{}'::jsonb)) AS final_hands
    FROM public.game_replays gr
    INNER JOIN public.games g ON g.id = gr.game_id AND g.status = 'finished'
    WHERE gr.game_id = p_game_id
      AND gr.players @> jsonb_build_array(jsonb_build_object('userId', auth.uid()::text));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_player_replays(p_user_id UUID, p_limit INT DEFAULT 100, p_from TIMESTAMPTZ DEFAULT NULL, p_to TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (game_id UUID, played_at TIMESTAMPTZ, players JSONB, net_result BIGINT, total_pot BIGINT, is_winner BOOLEAN)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT gr.game_id, gr.created_at,
    (SELECT COALESCE(jsonb_agg(player - 'cards' - 'privateCards'), '[]'::jsonb) FROM jsonb_array_elements(gr.players) AS player),
    COALESCE((SELECT SUM(CASE WHEN l.direction = 'credit' THEN l.amount_cents ELSE -l.amount_cents END) FROM public.ledger l WHERE l.game_id = gr.game_id AND l.user_id = p_user_id), 0)::BIGINT,
    COALESCE((SELECT SUM(CASE WHEN l.direction = 'credit' AND l.type = 'win' THEN l.amount_cents ELSE 0 END) FROM public.ledger l WHERE l.game_id = gr.game_id), 0)::BIGINT,
    EXISTS (SELECT 1 FROM public.ledger l WHERE l.game_id = gr.game_id AND l.user_id = p_user_id AND l.type = 'win')
  FROM public.game_replays gr INNER JOIN public.games g ON g.id = gr.game_id AND g.status = 'finished'
  WHERE gr.players @> jsonb_build_array(jsonb_build_object('userId', p_user_id::text))
    AND (p_from IS NULL OR gr.created_at >= p_from) AND (p_to IS NULL OR gr.created_at <= p_to)
  ORDER BY gr.created_at DESC LIMIT LEAST(GREATEST(p_limit, 1), 500);
END; $$;

CREATE OR REPLACE FUNCTION public.get_player_replays_by_mesa(p_user_id UUID, p_limit INT DEFAULT 100, p_from TIMESTAMPTZ DEFAULT NULL, p_to TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (room_id TEXT, table_name TEXT, first_played_at TIMESTAMPTZ, last_played_at TIMESTAMPTZ, game_count BIGINT, players JSONB, total_net_result BIGINT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY WITH keyed AS (
    SELECT gr.*, COALESCE(gr.room_id, gr.game_id::text) AS mesa_key FROM public.game_replays gr INNER JOIN public.games g ON g.id = gr.game_id AND g.status = 'finished'
    WHERE gr.players @> jsonb_build_array(jsonb_build_object('userId', p_user_id::text))
      AND (p_from IS NULL OR gr.created_at >= p_from) AND (p_to IS NULL OR gr.created_at <= p_to)
  ) SELECT k.mesa_key, COALESCE(MAX(k.table_name), 'Mesa'), MIN(k.created_at), MAX(k.created_at), COUNT(*)::BIGINT,
    (SELECT COALESCE(jsonb_agg(DISTINCT player - 'cards' - 'privateCards'), '[]'::jsonb) FROM keyed k2 CROSS JOIN jsonb_array_elements(k2.players) AS player WHERE k2.mesa_key = k.mesa_key),
    COALESCE((SELECT SUM(CASE WHEN l.direction = 'credit' THEN l.amount_cents ELSE -l.amount_cents END) FROM public.ledger l INNER JOIN keyed k3 ON k3.game_id = l.game_id WHERE k3.mesa_key = k.mesa_key AND l.user_id = p_user_id), 0)::BIGINT
  FROM keyed k GROUP BY k.mesa_key ORDER BY MAX(k.created_at) DESC LIMIT LEAST(GREATEST(p_limit, 1), 500);
END; $$;

CREATE OR REPLACE FUNCTION public.get_player_replays_for_room(p_user_id UUID, p_room_id TEXT, p_limit INT DEFAULT 100, p_from TIMESTAMPTZ DEFAULT NULL, p_to TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (game_id UUID, played_at TIMESTAMPTZ, players JSONB, net_result BIGINT, total_pot BIGINT, is_winner BOOLEAN, round_number INT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT gr.game_id, gr.created_at,
    (SELECT COALESCE(jsonb_agg(player - 'cards' - 'privateCards'), '[]'::jsonb) FROM jsonb_array_elements(gr.players) AS player),
    COALESCE((SELECT SUM(CASE WHEN l.direction = 'credit' THEN l.amount_cents ELSE -l.amount_cents END) FROM public.ledger l WHERE l.game_id = gr.game_id AND l.user_id = p_user_id), 0)::BIGINT,
    COALESCE((SELECT SUM(CASE WHEN l.direction = 'credit' AND l.type = 'win' THEN l.amount_cents ELSE 0 END) FROM public.ledger l WHERE l.game_id = gr.game_id), 0)::BIGINT,
    EXISTS (SELECT 1 FROM public.ledger l WHERE l.game_id = gr.game_id AND l.user_id = p_user_id AND l.type = 'win'), gr.round_number
  FROM public.game_replays gr INNER JOIN public.games g ON g.id = gr.game_id AND g.status = 'finished'
  WHERE COALESCE(gr.room_id, gr.game_id::text) = p_room_id AND gr.players @> jsonb_build_array(jsonb_build_object('userId', p_user_id::text))
    AND (p_from IS NULL OR gr.created_at >= p_from) AND (p_to IS NULL OR gr.created_at <= p_to)
  ORDER BY gr.created_at ASC LIMIT LEAST(GREATEST(p_limit, 1), 500);
END; $$;

REVOKE ALL ON FUNCTION public.get_player_replay_detail(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_player_replay_detail(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.get_player_replays(UUID, INT, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_player_replays_by_mesa(UUID, INT, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_player_replays_for_room(UUID, TEXT, INT, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_player_replays(UUID, INT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_player_replays_by_mesa(UUID, INT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_player_replays_for_room(UUID, TEXT, INT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_replays(UUID, INT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_replays_by_mesa(UUID, INT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_replays_for_room(UUID, TEXT, INT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_replay_detail(p_game_id UUID)
RETURNS TABLE (id UUID, game_id UUID, created_at TIMESTAMPTZ, players JSONB, timeline JSONB, admin_timeline JSONB, pot_breakdown JSONB, final_hands JSONB, rng_seed TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT COALESCE((SELECT public.is_admin()), false) THEN RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT gr.id, gr.game_id, gr.created_at, gr.players, gr.timeline, gr.admin_timeline, gr.pot_breakdown, gr.final_hands, gr.rng_seed
  FROM public.game_replays gr INNER JOIN public.games g ON g.id = gr.game_id AND g.status = 'finished' WHERE gr.game_id = p_game_id;
END; $$;
REVOKE ALL ON FUNCTION public.get_admin_replay_detail(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_replay_detail(UUID) TO authenticated;
