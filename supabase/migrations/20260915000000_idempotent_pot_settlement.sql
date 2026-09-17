-- Liquidación de pozos: evita doble rake y reintentos duplicados.
-- Los callers siguen pasando el premio neto y el rake calculado por el motor.

CREATE UNIQUE INDEX IF NOT EXISTS ledger_user_reference_id_unique
  ON public.ledger (user_id, reference_id)
  WHERE reference_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.process_ledger_entry(
  p_user_id       UUID,
  p_amount_cents  INT,
  p_type          TEXT,
  p_direction     TEXT,
  p_game_id      UUID DEFAULT NULL,
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
  v_existing        RECORD;
BEGIN
  PERFORM pg_advisory_xact_lock(
    ('x' || left(replace(p_user_id::text, '-', ''), 16))::bit(64)::bigint
  );

  IF p_direction NOT IN ('credit', 'debit') THEN
    RETURN jsonb_build_object('error', 'Dirección inválida: debe ser credit o debit');
  END IF;

  IF p_amount_cents <= 0 THEN
    RETURN jsonb_build_object('error', 'El monto debe ser positivo');
  END IF;

  IF p_type NOT IN ('deposit', 'withdrawal', 'bet', 'win', 'rake', 'refund', 'adjustment', 'transfer') THEN
    RETURN jsonb_build_object('error', 'Tipo de transacción inválido');
  END IF;

  IF p_type IN ('deposit', 'withdrawal', 'transfer', 'adjustment')
     AND (p_amount_cents % 100000) <> 0 THEN
    RETURN jsonb_build_object('error', 'El monto debe ser múltiplo de $1.000 COP');
  END IF;

  -- Una misma referencia representa una única operación financiera.
  -- Un reintento idéntico devuelve el resultado original; otro payload falla.
  IF p_reference_id IS NOT NULL THEN
    SELECT id, user_id, game_id, table_id, amount_cents, type, direction,
      description, metadata, balance_before_cents, balance_after_cents
    INTO v_existing
    FROM public.ledger
    WHERE user_id = p_user_id AND reference_id = p_reference_id
    LIMIT 1;

    IF FOUND THEN
      IF v_existing.user_id IS DISTINCT FROM p_user_id
         OR v_existing.game_id IS DISTINCT FROM p_game_id
         OR v_existing.table_id IS DISTINCT FROM p_table_id
         OR v_existing.amount_cents IS DISTINCT FROM p_amount_cents
         OR v_existing.type IS DISTINCT FROM p_type
         OR v_existing.direction IS DISTINCT FROM p_direction
         OR v_existing.description IS DISTINCT FROM p_description
         OR v_existing.metadata IS DISTINCT FROM p_metadata THEN
        RETURN jsonb_build_object('error', 'La referencia ya pertenece a otra operación');
      END IF;

      RETURN jsonb_build_object(
        'success', true,
        'idempotent', true,
        'ledger_id', v_existing.id,
        'balance_before', v_existing.balance_before_cents,
        'balance_after', v_existing.balance_after_cents
      );
    END IF;
  END IF;

  SELECT COALESCE(balance_after_cents, 0)
  INTO v_current_balance
  FROM public.ledger
  WHERE user_id = p_user_id
  ORDER BY sequence DESC
  LIMIT 1;

  IF NOT FOUND THEN
    v_current_balance := 0;
  END IF;

  IF p_direction = 'credit' THEN
    v_new_balance := v_current_balance + p_amount_cents;
  ELSE
    v_new_balance := v_current_balance - p_amount_cents;
  END IF;

  IF v_new_balance < 0 THEN
    RETURN jsonb_build_object(
      'error', 'Saldo insuficiente',
      'current_balance', v_current_balance,
      'requested', p_amount_cents
    );
  END IF;

  INSERT INTO public.ledger (
    user_id, game_id, table_id, counterpart_id, type, direction, amount_cents,
    balance_before_cents, balance_after_cents, description, reference_id,
    approved_by, status, metadata
  ) VALUES (
    p_user_id, p_game_id, p_table_id, p_counterpart_id, p_type, p_direction, p_amount_cents,
    v_current_balance, v_new_balance, p_description, p_reference_id,
    p_approved_by, 'completed', p_metadata
  )
  RETURNING id INTO v_ledger_id;

  UPDATE public.wallets
  SET balance_cents = v_new_balance, updated_at = NOW()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, balance_cents, currency)
    VALUES (p_user_id, v_new_balance, 'COP')
    ON CONFLICT (user_id) DO UPDATE
      SET balance_cents = v_new_balance, updated_at = NOW();
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'ledger_id', v_ledger_id,
    'balance_before', v_current_balance,
    'balance_after', v_new_balance
  );
END;
$$;

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
  v_win_result JSONB;
  v_rake_result JSONB;
  v_operation TEXT;
  v_gross_payout INT;
BEGIN
  IF p_payout <= 0 OR p_rake < 0 THEN
    RETURN jsonb_build_object('error', 'La liquidación debe tener importes válidos');
  END IF;

  -- p_payout es neto para conservar el contrato del game-server.
  -- Se acredita bruto y se registra el rake una sola vez, por lo que el
  -- resultado final para el jugador sigue siendo exactamente p_payout.
  v_gross_payout := p_payout + p_rake;
  v_operation := COALESCE(
    p_pot_details->>'operation_id',
    COALESCE(p_game_id::text, 'unknown') || '-' || p_winner_id::text
  );

  v_win_result := public.process_ledger_entry(
    p_user_id := p_winner_id,
    p_amount_cents := v_gross_payout,
    p_type := 'win',
    p_direction := 'credit',
    p_game_id := p_game_id,
    p_table_id := p_table_id,
    p_description := 'Ganancia bruta de pozo',
    p_reference_id := 'pot-win-' || v_operation,
    p_metadata := COALESCE(p_pot_details, '{}'::jsonb) || jsonb_build_object(
      'settlement_operation_id', v_operation,
      'payout_net', p_payout,
      'payout_gross', v_gross_payout
    )
  );

  IF v_win_result ? 'error' THEN
    RETURN v_win_result;
  END IF;

  IF p_rake > 0 THEN
    v_rake_result := public.process_ledger_entry(
      p_user_id := p_winner_id,
      p_amount_cents := p_rake,
      p_type := 'rake',
      p_direction := 'debit',
      p_game_id := p_game_id,
      p_table_id := p_table_id,
      p_description := 'Comisión de la casa (5%)',
      p_reference_id := 'rake-' || v_operation,
      p_metadata := jsonb_build_object(
        'settlement_operation_id', v_operation,
        'commission_pct', 0.05
      )
    );

    IF v_rake_result ? 'error' THEN
      RAISE EXCEPTION 'No se pudo registrar el rake: %', v_rake_result->>'error';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'idempotent', COALESCE((v_win_result->>'idempotent')::boolean, false),
    'win_result', v_win_result,
    'rake_result', COALESCE(v_rake_result, '{}'::jsonb),
    'balance_after', COALESCE((v_rake_result->>'balance_after')::bigint, (v_win_result->>'balance_after')::bigint)
  );
END;
$$;
