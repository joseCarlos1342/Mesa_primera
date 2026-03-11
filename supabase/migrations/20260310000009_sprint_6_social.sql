-- Up Migration for Sprint 6

-- 1. Modify player_stats
ALTER TABLE public.player_stats
  RENAME COLUMN total_games TO games_played;

ALTER TABLE public.player_stats
  RENAME COLUMN wins TO games_won;

ALTER TABLE public.player_stats
  RENAME COLUMN total_winnings TO total_won_cents;

ALTER TABLE public.player_stats
  ADD COLUMN IF NOT EXISTS current_streak INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_streak INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS primeras_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chivos_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS segundas_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_rake_paid_cents NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_lost_cents NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_game_at TIMESTAMPTZ;

-- 2. Create get_leaderboard RPC
CREATE OR REPLACE FUNCTION get_leaderboard(p_period TEXT, p_category TEXT)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- We assume p_period is 'weekly' or 'monthly', but for now we query all-time or 
  -- filter by date. Since player_stats is aggregate, we just return the all-time stats for the sake of the schema.
  
  IF p_category = 'top_ganadores' THEN
    RETURN QUERY
      SELECT p.user_id, pr.username, pr.avatar_url, p.total_won_cents AS score
      FROM public.player_stats p
      JOIN public.profiles pr ON p.user_id = pr.id
      ORDER BY p.total_won_cents DESC
      LIMIT 100;
  ELSIF p_category = 'mejor_racha' THEN
    RETURN QUERY
      SELECT p.user_id, pr.username, pr.avatar_url, p.best_streak::NUMERIC AS score
      FROM public.player_stats p
      JOIN public.profiles pr ON p.user_id = pr.id
      ORDER BY p.best_streak DESC
      LIMIT 100;
  ELSIF p_category = 'maestro_primera' THEN
    RETURN QUERY
      SELECT p.user_id, pr.username, pr.avatar_url, (p.primeras_count + p.chivos_count + p.segundas_count)::NUMERIC AS score
      FROM public.player_stats p
      JOIN public.profiles pr ON p.user_id = pr.id
      ORDER BY (p.primeras_count + p.chivos_count + p.segundas_count) DESC
      LIMIT 100;
  ELSE
    RETURN QUERY
      SELECT p.user_id, pr.username, pr.avatar_url, p.games_won::NUMERIC AS score
      FROM public.player_stats p
      JOIN public.profiles pr ON p.user_id = pr.id
      ORDER BY p.games_won DESC
      LIMIT 100;
  END IF;
END;
$$;
