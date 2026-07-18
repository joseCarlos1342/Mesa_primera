-- Summary histórico de replays: solo juegos finalizados con replay persistido.
CREATE FUNCTION public.get_admin_replays_summary()
RETURNS TABLE (
  total_games_with_replay BIGINT,
  total_replay_rake_cents BIGINT,
  total_unique_replay_players BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT COALESCE((SELECT public.is_admin()), false) THEN
    RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH replay_scope AS (
    SELECT
      replay.game_id,
      CASE WHEN jsonb_typeof(replay.players) = 'array' THEN replay.players ELSE '[]'::jsonb END AS players
    FROM public.game_replays AS replay
    INNER JOIN public.games AS game ON game.id = replay.game_id AND game.status = 'finished'
    WHERE replay.game_id IS NOT NULL
  ), replay_games AS (
    SELECT DISTINCT game_id FROM replay_scope
  )
  SELECT
    (SELECT COUNT(*) FROM replay_games)::BIGINT,
    COALESCE((
      SELECT SUM(ledger.amount_cents)
      FROM public.ledger AS ledger
      INNER JOIN replay_games ON replay_games.game_id = ledger.game_id
      WHERE ledger.type = 'rake' AND ledger.status = 'completed'
    ), 0)::BIGINT,
    (
      SELECT COUNT(DISTINCT player.value->>'userId')
      FROM replay_scope
      CROSS JOIN LATERAL jsonb_array_elements(replay_scope.players) AS player(value)
      WHERE jsonb_typeof(player.value) = 'object'
        AND NULLIF(player.value->>'userId', '') IS NOT NULL
    )::BIGINT;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_replays_summary() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_replays_summary() TO authenticated;
