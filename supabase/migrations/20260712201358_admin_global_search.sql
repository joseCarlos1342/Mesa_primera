-- Investigación administrativa de entidades históricas.
-- No concede acceso a estado activo de mesas, cartas ni saldos en tiempo real.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

DROP POLICY IF EXISTS "Admins can view deposit requests" ON public.deposit_requests;
CREATE POLICY "Admins can view deposit requests"
  ON public.deposit_requests
  FOR SELECT
  USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "Admins can view withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Admins can view withdrawal requests"
  ON public.withdrawal_requests
  FOR SELECT
  USING ((SELECT public.is_admin()));

CREATE INDEX IF NOT EXISTS idx_deposit_requests_user_id
  ON public.deposit_requests (user_id);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id
  ON public.withdrawal_requests (user_id);

CREATE OR REPLACE FUNCTION public.search_admin_replays(p_identifier TEXT)
RETURNS TABLE (id UUID, game_id UUID, rng_seed TEXT, created_at TIMESTAMPTZ)
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
  SELECT gr.id, gr.game_id, gr.rng_seed, gr.created_at
  FROM public.game_replays gr
  INNER JOIN public.games g ON g.id = gr.game_id AND g.status = 'finished'
  WHERE gr.game_id::text = p_identifier OR gr.rng_seed = p_identifier
  ORDER BY gr.created_at DESC
  LIMIT 10;
END;
$$;

REVOKE ALL ON FUNCTION public.search_admin_replays(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_admin_replays(TEXT) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm
  ON public.profiles USING GIN (username gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_profiles_full_name_trgm
  ON public.profiles USING GIN (full_name gin_trgm_ops);
