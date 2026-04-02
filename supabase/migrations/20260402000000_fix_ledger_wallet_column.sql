-- =============================================================
-- Migration: Fix process_ledger_entry wallet column mismatch
-- =============================================================
-- BUG: process_ledger_entry() references wallets.balance but the
--      actual column is balance_cents. This caused ALL bet/win
--      transactions to silently fail and rollback, leaving zero
--      game-related entries in the ledger.
-- =============================================================

-- 0. Seed ledger entries for users whose wallets have a balance
--    but no corresponding ledger history (ensures process_ledger_entry
--    can calculate correct balances going forward).
INSERT INTO public.ledger (
  user_id, type, direction, amount_cents,
  balance_before_cents, balance_after_cents,
  description, reference_id, status
)
SELECT
  w.user_id,
  'deposit',
  'credit',
  w.balance_cents,
  0,
  w.balance_cents,
  'Saldo inicial (migración de sincronización ledger)',
  'seed-migration-' || w.user_id::text,
  'completed'
FROM public.wallets w
LEFT JOIN (SELECT DISTINCT user_id FROM public.ledger) l ON l.user_id = w.user_id
WHERE w.balance_cents > 0 AND l.user_id IS NULL;

-- 1. Fix process_ledger_entry to use the correct column name
CREATE OR REPLACE FUNCTION public.process_ledger_entry(
  p_user_id     UUID,
  p_amount_cents INT,
  p_type        TEXT,       -- 'deposit','withdrawal','bet','win','rake','refund'
  p_direction   TEXT,       -- 'credit' or 'debit'
  p_game_id     UUID DEFAULT NULL,
  p_table_id    UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL,
  p_counterpart_id UUID DEFAULT NULL,
  p_approved_by UUID DEFAULT NULL,
  p_metadata    JSONB DEFAULT NULL
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
  -- Validate direction
  IF p_direction NOT IN ('credit', 'debit') THEN
    RETURN jsonb_build_object('error', 'Dirección inválida: debe ser credit o debit');
  END IF;

  -- Validate amount
  IF p_amount_cents <= 0 THEN
    RETURN jsonb_build_object('error', 'El monto debe ser positivo');
  END IF;

  -- Validate type
  IF p_type NOT IN ('deposit', 'withdrawal', 'bet', 'win', 'rake', 'refund', 'adjustment') THEN
    RETURN jsonb_build_object('error', 'Tipo de transacción inválido');
  END IF;

  -- Calculate current balance from the LAST ledger entry (most recent)
  SELECT COALESCE(balance_after_cents, 0)
  INTO v_current_balance
  FROM public.ledger
  WHERE user_id = p_user_id
  ORDER BY created_at DESC, id DESC
  LIMIT 1
  FOR UPDATE;

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

  -- INSERT the immutable ledger entry
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

  -- Keep wallets table in sync (using correct column: balance_cents)
  UPDATE public.wallets
  SET balance_cents = v_new_balance,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- If no wallet row exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, balance_cents, currency)
    VALUES (p_user_id, v_new_balance, 'USD')
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

-- 2. Fix the award_pot overload that calls process_ledger_entry
--    (the overload with p_payout/p_rake/p_table_id/p_pot_details params)
CREATE OR REPLACE FUNCTION public.award_pot(
  p_winner_id   UUID,
  p_payout      INT,
  p_rake        INT,
  p_game_id     UUID,
  p_table_id    UUID DEFAULT NULL,
  p_pot_details JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_win_result  JSONB;
  v_rake_result JSONB;
BEGIN
  -- 1. Credit the winner with the net payout
  v_win_result := public.process_ledger_entry(
    p_user_id      := p_winner_id,
    p_amount_cents  := p_payout,
    p_type          := 'win',
    p_direction     := 'credit',
    p_game_id       := p_game_id,
    p_table_id      := p_table_id,
    p_description   := 'Ganancia de pozo',
    p_reference_id  := 'pot-win-' || COALESCE(p_game_id::text, 'unknown'),
    p_metadata      := p_pot_details
  );

  IF v_win_result ? 'error' THEN
    RETURN v_win_result;
  END IF;

  -- 2. Record the rake as a debit from the winner (house commission)
  IF p_rake > 0 THEN
    v_rake_result := public.process_ledger_entry(
      p_user_id      := p_winner_id,
      p_amount_cents  := p_rake,
      p_type          := 'rake',
      p_direction     := 'debit',
      p_game_id       := p_game_id,
      p_table_id      := p_table_id,
      p_description   := 'Comisión de la casa (5%)',
      p_reference_id  := 'rake-' || COALESCE(p_game_id::text, 'unknown'),
      p_metadata      := jsonb_build_object('commission_pct', 0.05)
    );

    IF v_rake_result ? 'error' THEN
      RETURN v_rake_result;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'win_result', v_win_result,
    'rake_result', COALESCE(v_rake_result, '{}'::jsonb),
    'balance_after', (v_win_result->>'balance_after')::bigint - COALESCE(p_rake, 0)
  );
END;
$$;
