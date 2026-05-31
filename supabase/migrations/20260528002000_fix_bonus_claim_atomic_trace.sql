-- =============================================================
-- Fix: reclamo de bonos atomico y trazable
-- =============================================================
-- Serializa los reclamos por usuario antes de comprobar duplicados para que
-- dobles clics/concurrencia devuelvan un error controlado sin intentar un
-- segundo credito. Tambien devuelve balance_after como numero JSON.

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

  -- Serializa el flujo completo antes de validar el reclamo ya existente.
  PERFORM pg_advisory_xact_lock(
    ('x' || left(replace(v_user_id::text, '-', ''), 16))::bit(64)::bigint
  );

  v_current_period := to_char(NOW(), 'YYYY-MM');

  SELECT * INTO v_tier
  FROM public.bonus_tiers
  WHERE id = p_tier_id AND active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Nivel de bono no encontrado');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bonus_claims
    WHERE user_id = v_user_id
      AND tier_id = p_tier_id
      AND period = v_current_period
  ) THEN
    RETURN jsonb_build_object('error', 'Este bono ya fue reclamado este mes');
  END IF;

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

  SELECT COALESCE(SUM(amount_cents), 0)
  INTO v_monthly_rake
  FROM public.ledger
  WHERE user_id = v_user_id
    AND type = 'rake'
    AND direction = 'debit'
    AND created_at >= date_trunc('month', NOW())
    AND created_at < date_trunc('month', NOW()) + INTERVAL '1 month';

  IF v_monthly_rake < v_tier.min_rake_cents THEN
    RETURN jsonb_build_object('error', 'Aún no alcanzas el umbral para este bono');
  END IF;

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
    'balance_after', (v_ledger_result->>'balance_after')::BIGINT
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('error', 'Este bono ya fue reclamado este mes');
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_bonus(INT) TO authenticated;
