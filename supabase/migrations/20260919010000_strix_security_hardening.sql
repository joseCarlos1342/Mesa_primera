-- Security hardening from the Strix review.
-- Keep player-scoped RPCs bound to auth.uid() and make game-server writes
-- service-role-only. Historical migrations remain unchanged.

CREATE OR REPLACE FUNCTION public.get_bonus_status(p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_current_period TEXT;
  v_monthly_rake BIGINT;
  v_tiers JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501';
  END IF;

  v_user_id := auth.uid();
  v_current_period := to_char(NOW(), 'YYYY-MM');

  SELECT COALESCE(SUM(amount_cents), 0)
  INTO v_monthly_rake
  FROM public.ledger
  WHERE user_id = v_user_id
    AND type = 'rake'
    AND direction = 'debit'
    AND created_at >= date_trunc('month', NOW())
    AND created_at < date_trunc('month', NOW()) + INTERVAL '1 month';

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', bt.id,
      'name', bt.name,
      'min_rake_cents', bt.min_rake_cents,
      'bonus_amount_cents', bt.bonus_amount_cents,
      'unlocked', v_monthly_rake >= bt.min_rake_cents,
      'claimed', EXISTS (
        SELECT 1
        FROM public.bonus_claims bc
        WHERE bc.user_id = v_user_id
          AND bc.tier_id = bt.id
          AND bc.period = v_current_period
      )
    ) ORDER BY bt.sort_order
  )
  INTO v_tiers
  FROM public.bonus_tiers bt
  WHERE bt.active = true;

  RETURN jsonb_build_object(
    'period', v_current_period,
    'monthly_rake_cents', v_monthly_rake,
    'tiers', COALESCE(v_tiers, '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_balance(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_balance INT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(balance_after_cents, 0)
  INTO v_balance
  FROM public.ledger
  WHERE user_id = p_user_id
  ORDER BY sequence DESC
  LIMIT 1;

  RETURN COALESCE(v_balance, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_adjust_user_balance(
  p_user_id UUID,
  p_delta_cents INT,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_direction TEXT;
  v_amount_cents INT;
BEGIN
  IF v_admin_id IS NULL OR NOT COALESCE((SELECT public.is_admin()), false) THEN
    RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501';
  END IF;

  IF COALESCE(auth.jwt() ->> 'aal', '') <> 'aal2' THEN
    RAISE EXCEPTION 'Se requiere autenticación multifactor' USING ERRCODE = '42501';
  END IF;

  IF p_delta_cents = 0 THEN
    RETURN jsonb_build_object('error', 'El monto debe ser diferente de cero');
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RETURN jsonb_build_object('error', 'El motivo del ajuste es obligatorio');
  END IF;

  v_direction := CASE WHEN p_delta_cents > 0 THEN 'credit' ELSE 'debit' END;
  v_amount_cents := abs(p_delta_cents);

  RETURN public.process_ledger_entry(
    p_user_id      := p_user_id,
    p_amount_cents := v_amount_cents,
    p_type         := 'adjustment',
    p_direction    := v_direction,
    p_description  := 'Ajuste administrativo: ' || trim(p_reason),
    p_approved_by  := v_admin_id,
    p_metadata     := jsonb_build_object('reason', trim(p_reason), 'admin_id', v_admin_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_bonus_status(UUID) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_bonus_status(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.get_user_balance(UUID) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_balance(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_adjust_user_balance(UUID, INT, TEXT) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_adjust_user_balance(UUID, INT, TEXT) TO authenticated;

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "games_server_insert" ON public.games;
CREATE POLICY "games_server_insert" ON public.games
  FOR INSERT TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "games_server_update" ON public.games;
CREATE POLICY "games_server_update" ON public.games
  FOR UPDATE TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "tables_server_insert" ON public.tables;
CREATE POLICY "tables_server_insert" ON public.tables
  FOR INSERT TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can create tables" ON public.tables;

REVOKE INSERT ON public.games, public.tables FROM anon, authenticated;
