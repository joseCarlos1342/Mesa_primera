-- =============================================================
-- Migration: RPC detect_potential_collusion
-- =============================================================
-- Analiza game_participants para detectar pares de jugadores
-- que juegan juntos con frecuencia sospechosamente alta.
-- Llamado por el CronJob antiCollusion del game-server.
-- =============================================================

CREATE OR REPLACE FUNCTION public.detect_potential_collusion(
  threshold INT DEFAULT 10
)
RETURNS TABLE (
  player_1 UUID,
  player_2 UUID,
  games_together BIGINT,
  total_games_p1 BIGINT,
  total_games_p2 BIGINT,
  overlap_pct NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH player_pairs AS (
    SELECT
      LEAST(p1.user_id, p2.user_id) AS player_1,
      GREATEST(p1.user_id, p2.user_id) AS player_2,
      COUNT(DISTINCT p1.game_id) AS games_together
    FROM game_participants p1
    JOIN game_participants p2
      ON p1.game_id = p2.game_id
      AND p1.user_id < p2.user_id
    JOIN games g
      ON g.id = p1.game_id
      AND g.finished_at > NOW() - INTERVAL '7 days'
    GROUP BY LEAST(p1.user_id, p2.user_id), GREATEST(p1.user_id, p2.user_id)
    HAVING COUNT(DISTINCT p1.game_id) >= threshold
  ),
  player_totals AS (
    SELECT
      gp.user_id,
      COUNT(DISTINCT gp.game_id) AS total_games
    FROM game_participants gp
    JOIN games g ON g.id = gp.game_id AND g.finished_at > NOW() - INTERVAL '7 days'
    GROUP BY gp.user_id
  )
  SELECT
    pp.player_1,
    pp.player_2,
    pp.games_together,
    pt1.total_games AS total_games_p1,
    pt2.total_games AS total_games_p2,
    ROUND(
      pp.games_together::numeric / LEAST(pt1.total_games, pt2.total_games) * 100,
      1
    ) AS overlap_pct
  FROM player_pairs pp
  JOIN player_totals pt1 ON pt1.user_id = pp.player_1
  JOIN player_totals pt2 ON pt2.user_id = pp.player_2
  WHERE pp.games_together::numeric / LEAST(pt1.total_games, pt2.total_games) > 0.8
  ORDER BY overlap_pct DESC, pp.games_together DESC;
$$;
