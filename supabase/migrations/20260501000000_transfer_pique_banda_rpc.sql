-- RPC: transfer_pique_banda
-- Transfiere las bandas de pique de los perdedores al ganador en una única
-- transacción atómica.  Cada débito y crédito se registra en el ledger inmutable.
-- La función es idempotente: si se llama dos veces con el mismo p_transfer_id,
-- la segunda llamada retorna éxito sin crear entradas duplicadas.

CREATE OR REPLACE FUNCTION public.transfer_pique_banda(
  p_transfer_id   UUID,                       -- idempotency key (game_id works well)
  p_winner_id     UUID,                        -- supabase auth UUID del ganador del pique
  p_losers        JSONB,                       -- [{user_id: UUID, amount_cents: INT}, ...]
  p_game_id       UUID DEFAULT NULL,
  p_metadata      JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_banda    INT := 0;
  v_loser          RECORD;
  v_balance_after  INT;
  v_winner_balance INT;
  v_rake           INT;
  v_payout         INT;
  v_existing       INT;
BEGIN
  -- Idempotency: check if this transfer already happened
  SELECT COUNT(*) INTO v_existing
    FROM public.ledger
   WHERE reference_id = 'banda-transfer-' || p_transfer_id::text;
  IF v_existing > 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent', true
    );
  END IF;

  -- Acquire advisory locks for all involved users to prevent concurrency issues
  PERFORM pg_advisory_xact_lock(hashtext(p_winner_id::text));
  FOR v_loser IN
    SELECT (l->>'user_id')::UUID AS user_id, (l->>'amount_cents')::INT AS amount_cents
      FROM jsonb_array_elements(p_losers) AS l
     ORDER BY l->>'user_id'   -- deterministic order for advisory locks
  LOOP
    PERFORM pg_advisory_xact_lock(hashtext(v_loser.user_id::text));
  END LOOP;

  -- Phase 1: Debit each loser (banda)
  FOR v_loser IN
    SELECT (l->>'user_id')::UUID AS user_id, (l->>'amount_cents')::INT AS amount_cents
      FROM jsonb_array_elements(p_losers) AS l
     ORDER BY l->>'user_id'   -- deterministic processing order
  LOOP
    IF v_loser.amount_cents <= 0 THEN
      CONTINUE;
    END IF;

    INSERT INTO public.ledger (
      user_id, game_id, type, direction, amount_cents,
      description, reference_id, metadata
    ) VALUES (
      v_loser.user_id,
      p_game_id,
      'bet',
      'debit',
      v_loser.amount_cents,
      'Banda (pique reiniciado)',
      'banda-transfer-' || p_transfer_id::text || '-loser-' || v_loser.user_id::text,
      jsonb_build_object(
        'transfer_id', p_transfer_id,
        'reason', 'banda',
        'phase', 'PIQUE'
      )
    );

    UPDATE public.wallets
       SET balance_cents = balance_cents - v_loser.amount_cents,
           updated_at   = now()
     WHERE user_id = v_loser.user_id;

    v_total_banda := v_total_banda + v_loser.amount_cents;
  END LOOP;

  -- Phase 2: Credit winner (payout = total - 5% rake, rounded to nearest 100)
  v_rake    := ceil(v_total_banda * 0.05 / 100) * 100;
  v_payout  := v_total_banda - v_rake;

  IF v_payout > 0 THEN
    INSERT INTO public.ledger (
      user_id, game_id, type, direction, amount_cents,
      description, reference_id, metadata
    ) VALUES (
      p_winner_id,
      p_game_id,
      'win',
      'credit',
      v_payout,
      'Banda ganada (pique reiniciado)',
      'banda-transfer-' || p_transfer_id::text || '-winner',
      jsonb_build_object(
        'transfer_id', p_transfer_id,
        'reason', 'banda_payout',
        'phase', 'PIQUE',
        'total_banda', v_total_banda,
        'rake', v_rake
      )
    );

    UPDATE public.wallets
       SET balance_cents = balance_cents + v_payout,
           updated_at   = now()
     WHERE user_id = p_winner_id;

    -- Phase 3: Credit rake (house)
    IF v_rake > 0 THEN
      INSERT INTO public.ledger (
        user_id, game_id, type, direction, amount_cents,
        description, reference_id, metadata
      ) VALUES (
        p_winner_id,
        p_game_id,
        'rake',
        'debit',
        v_rake,
        'Rake de banda',
        'banda-transfer-' || p_transfer_id::text || '-rake',
        jsonb_build_object(
          'transfer_id', p_transfer_id,
          'reason', 'banda_rake',
          'phase', 'PIQUE',
          'rake_pct', 0.05
        )
      );
    END IF;
  END IF;

  -- Return the winner's final balance for confirmation
  SELECT balance_cents INTO v_winner_balance
    FROM public.wallets
   WHERE user_id = p_winner_id;

  RETURN jsonb_build_object(
    'success', true,
    'total_banda', v_total_banda,
    'payout', v_payout,
    'rake', v_rake,
    'winner_balance_after', v_winner_balance
  );
END;
$$;