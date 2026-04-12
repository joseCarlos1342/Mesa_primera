-- =============================================================
-- Migration: Sistema de Bonos por Rake Acumulado Mensual
-- =============================================================
-- Crea la infraestructura para el sistema de bonos:
--   1. Tabla bonus_tiers: umbrales de rake y montos de bono
--   2. Tabla bonus_claims: registro de reclamos (idempotente)
--   3. RPC get_bonus_status: consulta estado actual del bono
--   4. RPC claim_bonus: reclama un bono desbloqueado
--   5. Actualiza process_ledger_entry para admitir type='bonus'
--   6. RLS para que cada jugador solo vea sus propios reclamos
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Tabla bonus_tiers: umbrales configurables por admin
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bonus_tiers (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  min_rake_cents  BIGINT NOT NULL,   -- rake mínimo acumulado en el mes
  bonus_amount_cents BIGINT NOT NULL, -- monto del bono en centavos
  sort_order   INT NOT NULL DEFAULT 0,
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed de tiers iniciales (en COP centavos):
-- $50.000 rake => $5.000 bono
-- $100.000 rake => $10.000 bono
-- $200.000 rake => $20.000 bono
INSERT INTO public.bonus_tiers (name, min_rake_cents, bonus_amount_cents, sort_order) VALUES
  ('Bronce',   5000000,  500000,  1),
  ('Plata',   10000000, 1000000,  2),
  ('Oro',     20000000, 2000000,  3);

-- ─────────────────────────────────────────────────────────────
-- 2. Tabla bonus_claims: registro de reclamos por periodo
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bonus_claims (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  tier_id       INT NOT NULL REFERENCES public.bonus_tiers(id),
  period        TEXT NOT NULL,          -- formato 'YYYY-MM'
  rake_at_claim BIGINT NOT NULL,        -- rake acumulado al momento del reclamo
  bonus_amount_cents BIGINT NOT NULL,   -- monto acreditado
  ledger_entry_id UUID,                 -- referencia al ledger
  claimed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Un usuario puede reclamar cada tier solo una vez por periodo
  CONSTRAINT bonus_claims_unique_per_period UNIQUE (user_id, tier_id, period)
);

-- Índice para consultas rápidas por usuario y periodo
CREATE INDEX IF NOT EXISTS idx_bonus_claims_user_period
  ON public.bonus_claims (user_id, period);

-- ─────────────────────────────────────────────────────────────
-- 3. RLS para bonus_claims
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.bonus_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players see own bonus claims"
  ON public.bonus_claims FOR SELECT
  USING (user_id = auth.uid());

-- Solo RPCs (SECURITY DEFINER) insertan; jugadores no insertan directamente
CREATE POLICY "No direct insert for players"
  ON public.bonus_claims FOR INSERT
  WITH CHECK (false);

-- bonus_tiers es solo lectura para todos los autenticados
ALTER TABLE public.bonus_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active tiers"
  ON public.bonus_tiers FOR SELECT
  USING (active = true);

-- ─────────────────────────────────────────────────────────────
-- 4. Actualizar process_ledger_entry para admitir type='bonus'
-- ─────────────────────────────────────────────────────────────
-- Re-crear la función con 'bonus' en la lista de tipos válidos
-- y exentar 'bonus' de la regla de múltiplos de $1.000.
CREATE OR REPLACE FUNCTION public.process_ledger_entry(
  p_user_id       UUID,
  p_amount_cents  INT,
  p_type          TEXT,
  p_direction     TEXT,
  p_game_id       UUID DEFAULT NULL,
  p_table_id      UUID DEFAULT NULL,
  p_description   TEXT DEFAULT NULL,
  p_reference_id  TEXT DEFAULT NULL,
  p_counterpart_id UUID DEFAULT NULL,
  p_approved_by   UUID DEFAULT NULL,
  p_metadata      JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance BIGINT;
  v_new_balance     BIGINT;
  v_ledger_id       UUID;
BEGIN
  -- Per-user advisory lock to serialize concurrent ledger writes.
  PERFORM pg_advisory_xact_lock(
    ('x' || left(replace(p_user_id::text, '-', ''), 16))::bit(64)::bigint
  );

  -- Validate direction
  IF p_direction NOT IN ('credit', 'debit') THEN
    RETURN jsonb_build_object('error', 'Dirección inválida: debe ser credit o debit');
  END IF;

  -- Validate amount
  IF p_amount_cents <= 0 THEN
    RETURN jsonb_build_object('error', 'El monto debe ser positivo');
  END IF;

  -- Validate type (+ 'bonus' añadido en esta migración)
  IF p_type NOT IN ('deposit', 'withdrawal', 'bet', 'win', 'rake', 'refund', 'adjustment', 'transfer', 'bonus') THEN
    RETURN jsonb_build_object('error', 'Tipo de transacción inválido');
  END IF;

  -- Enforce round-thousand amounts for player-facing operations.
  -- Game operations (bet/win/rake/refund) and bonus are exempt.
  IF p_type IN ('deposit', 'withdrawal', 'transfer', 'adjustment')
     AND (p_amount_cents % 100000) <> 0 THEN
    RETURN jsonb_build_object('error', 'El monto debe ser múltiplo de $1.000 COP');
  END IF;

  -- Deterministic sequence ordering
  SELECT COALESCE(balance_after_cents, 0)
  INTO v_current_balance
  FROM public.ledger
  WHERE user_id = p_user_id
  ORDER BY sequence DESC
  LIMIT 1;

  IF NOT FOUND THEN
    v_current_balance := 0;
  END IF;

  -- Calculate new balance
  IF p_direction = 'credit' THEN
    v_new_balance := v_current_balance + p_amount_cents;
  ELSE
    v_new_balance := v_current_balance - p_amount_cents;
  END IF;

  -- Prevent negative balance
  IF v_new_balance < 0 THEN
    RETURN jsonb_build_object(
      'error', 'Saldo insuficiente',
      'current_balance', v_current_balance,
      'requested', p_amount_cents
    );
  END IF;

  -- INSERT the immutable ledger entry (sequence auto-increments)
  INSERT INTO public.ledger (
    user_id, game_id, table_id, counterpart_id,
    type, direction, amount_cents,
    balance_before_cents, balance_after_cents,
    description, reference_id, approved_by,
    status, metadata
  ) VALUES (
    p_user_id, p_game_id, p_table_id, p_counterpart_id,
    p_type, p_direction, p_amount_cents,
    v_current_balance, v_new_balance,
    p_description, p_reference_id, p_approved_by,
    'completed', p_metadata
  )
  RETURNING id INTO v_ledger_id;

  -- Keep wallets table in sync
  UPDATE public.wallets
  SET balance_cents = v_new_balance,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, balance_cents, currency)
    VALUES (p_user_id, v_new_balance, 'COP')
    ON CONFLICT (user_id) DO UPDATE SET balance_cents = v_new_balance, updated_at = NOW();
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'ledger_id', v_ledger_id,
    'balance_before', v_current_balance,
    'balance_after', v_new_balance
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. RPC get_bonus_status: estado actual del bono para el jugador
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_bonus_status(p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_id       UUID;
  v_current_period TEXT;
  v_monthly_rake  BIGINT;
  v_tiers         JSONB;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No autenticado');
  END IF;

  -- Periodo actual: 'YYYY-MM'
  v_current_period := to_char(NOW(), 'YYYY-MM');

  -- Sumar rake del mes actual desde el ledger (fuente de verdad inmutable)
  SELECT COALESCE(SUM(amount_cents), 0)
  INTO v_monthly_rake
  FROM public.ledger
  WHERE user_id = v_user_id
    AND type = 'rake'
    AND direction = 'debit'
    AND created_at >= date_trunc('month', NOW())
    AND created_at < date_trunc('month', NOW()) + INTERVAL '1 month';

  -- Construir array de tiers con su estado
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', bt.id,
      'name', bt.name,
      'min_rake_cents', bt.min_rake_cents,
      'bonus_amount_cents', bt.bonus_amount_cents,
      'unlocked', v_monthly_rake >= bt.min_rake_cents,
      'claimed', EXISTS (
        SELECT 1 FROM public.bonus_claims bc
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

-- ─────────────────────────────────────────────────────────────
-- 6. RPC claim_bonus: reclama un bono desbloqueado
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.claim_bonus(p_tier_id INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        UUID;
  v_current_period TEXT;
  v_monthly_rake   BIGINT;
  v_tier           RECORD;
  v_ledger_result  JSONB;
  v_claim_id       UUID;
  v_has_collusion  BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No autenticado');
  END IF;

  v_current_period := to_char(NOW(), 'YYYY-MM');

  -- Verificar que el tier existe y está activo
  SELECT * INTO v_tier
  FROM public.bonus_tiers
  WHERE id = p_tier_id AND active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Nivel de bono no encontrado');
  END IF;

  -- Verificar que no se haya reclamado ya este tier en este periodo
  IF EXISTS (
    SELECT 1 FROM public.bonus_claims
    WHERE user_id = v_user_id
      AND tier_id = p_tier_id
      AND period = v_current_period
  ) THEN
    RETURN jsonb_build_object('error', 'Este bono ya fue reclamado este mes');
  END IF;

  -- Verificar flags de colusión activos (server_alerts con status open)
  SELECT EXISTS (
    SELECT 1 FROM public.server_alerts
    WHERE category = 'collusion'
      AND status = 'open'
      AND (
        details->>'player_1' = v_user_id::text
        OR details->>'player_2' = v_user_id::text
      )
  ) INTO v_has_collusion;

  IF v_has_collusion THEN
    RETURN jsonb_build_object('error', 'Tu cuenta tiene una revisión pendiente. Contacta soporte.');
  END IF;

  -- Calcular rake del mes
  SELECT COALESCE(SUM(amount_cents), 0)
  INTO v_monthly_rake
  FROM public.ledger
  WHERE user_id = v_user_id
    AND type = 'rake'
    AND direction = 'debit'
    AND created_at >= date_trunc('month', NOW())
    AND created_at < date_trunc('month', NOW()) + INTERVAL '1 month';

  -- Verificar que cumple el umbral
  IF v_monthly_rake < v_tier.min_rake_cents THEN
    RETURN jsonb_build_object('error', 'Aún no alcanzas el umbral para este bono');
  END IF;

  -- Acreditar el bono via ledger inmutable
  v_ledger_result := public.process_ledger_entry(
    p_user_id      := v_user_id,
    p_amount_cents := v_tier.bonus_amount_cents::INT,
    p_type         := 'bonus',
    p_direction    := 'credit',
    p_description  := 'Bono ' || v_tier.name || ' del mes ' || v_current_period,
    p_reference_id := 'bonus-' || v_user_id::text || '-' || p_tier_id::text || '-' || v_current_period,
    p_metadata     := jsonb_build_object(
      'tier_id', p_tier_id,
      'tier_name', v_tier.name,
      'monthly_rake_at_claim', v_monthly_rake,
      'period', v_current_period
    )
  );

  IF v_ledger_result ? 'error' THEN
    RETURN v_ledger_result;
  END IF;

  -- Registrar el reclamo
  INSERT INTO public.bonus_claims (
    user_id, tier_id, period, rake_at_claim,
    bonus_amount_cents, ledger_entry_id
  ) VALUES (
    v_user_id, p_tier_id, v_current_period, v_monthly_rake,
    v_tier.bonus_amount_cents, (v_ledger_result->>'ledger_id')::UUID
  )
  RETURNING id INTO v_claim_id;

  RETURN jsonb_build_object(
    'success', true,
    'claim_id', v_claim_id,
    'bonus_amount_cents', v_tier.bonus_amount_cents,
    'balance_after', v_ledger_result->>'balance_after'
  );
END;
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION public.get_bonus_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bonus_status(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_bonus(INT) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 7. Hacer visible el tipo 'bonus' en el historial del wallet
-- ─────────────────────────────────────────────────────────────
-- Actualizar la política RLS del ledger para que los jugadores
-- también vean sus entradas de tipo 'bonus'
DROP POLICY IF EXISTS "Players see only vault transactions" ON public.ledger;

CREATE POLICY "Players see only vault transactions"
  ON public.ledger FOR SELECT
  USING (
    CASE
      WHEN EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN true
      ELSE user_id = auth.uid() AND type IN ('deposit', 'withdrawal', 'refund', 'adjustment', 'admin_adjustment', 'transfer', 'bonus')
    END
  );
