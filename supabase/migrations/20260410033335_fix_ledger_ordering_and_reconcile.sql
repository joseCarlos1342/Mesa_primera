-- =============================================================
-- Migration: Fix Non-Deterministic Ledger Ordering
-- =============================================================
-- BUG: process_ledger_entry() uses ORDER BY created_at DESC, id DESC
-- to find the last entry. But `id` is UUID (random), so when two
-- entries share the same timestamp (e.g. win+rake inside award_pot),
-- the "last" row is non-deterministic. This corrupts
-- balance_before_cents / balance_after_cents for subsequent entries.
--
-- FIX:
--   1. Add `sequence BIGSERIAL` column for deterministic ordering
--   2. Backfill sequence for existing rows using (created_at, id)
--   3. Override process_ledger_entry() to use ORDER BY sequence DESC
--   4. Override get_user_balance() to use ORDER BY sequence DESC
--   5. Add composite index (user_id, sequence DESC) for perf
--   6. Add advisory-lock per user for serialization safety
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Add sequence column
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.ledger
  ADD COLUMN IF NOT EXISTS sequence BIGSERIAL;

-- Backfill: assign sequence values to existing rows in insertion order.
-- Since we only have (created_at, id) as ordering hints, use them.
-- The BIGSERIAL default will auto-increment for new rows after this.
WITH ordered AS (
  SELECT id,
         ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM public.ledger
)
UPDATE public.ledger l
SET sequence = ordered.rn
FROM ordered
WHERE l.id = ordered.id;

-- Reset the sequence to continue after the highest backfilled value
SELECT setval(
  pg_get_serial_sequence('public.ledger', 'sequence'),
  COALESCE((SELECT MAX(sequence) FROM public.ledger), 0)
);

-- Make it unique and not null (the BIGSERIAL already sets NOT NULL)
ALTER TABLE public.ledger
  ADD CONSTRAINT ledger_sequence_unique UNIQUE (sequence);

-- ─────────────────────────────────────────────────────────────
-- 2. Composite index for fast per-user lookups by sequence
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ledger_user_sequence
  ON public.ledger (user_id, sequence DESC);

-- ─────────────────────────────────────────────────────────────
-- 3. Fix process_ledger_entry — deterministic ordering + advisory lock
-- ─────────────────────────────────────────────────────────────
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
  -- Uses the first 8 bytes of the user UUID as the lock key.
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

  -- Validate type (includes 'transfer' from 20260407 migration)
  IF p_type NOT IN ('deposit', 'withdrawal', 'bet', 'win', 'rake', 'refund', 'adjustment', 'transfer') THEN
    RETURN jsonb_build_object('error', 'Tipo de transacción inválido');
  END IF;

  -- Enforce round-thousand amounts for player-facing operations.
  -- Deposits, withdrawals, transfers and adjustments must be multiples of
  -- 100,000 centavos (= $1,000 COP).  Game operations (bet/win/rake/refund)
  -- are exempt because the engine calculates them at smaller granularity.
  IF p_type IN ('deposit', 'withdrawal', 'transfer', 'adjustment')
     AND (p_amount_cents % 100000) <> 0 THEN
    RETURN jsonb_build_object('error', 'El monto debe ser múltiplo de $1.000 COP');
  END IF;

  -- *** FIX: Use deterministic sequence ordering instead of created_at ***
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
-- 4. Fix get_user_balance — deterministic ordering
-- ─────────────────────────────────────────────────────────────
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
  SELECT COALESCE(balance_after_cents, 0)
  INTO v_balance
  FROM public.ledger
  WHERE user_id = p_user_id
  ORDER BY sequence DESC
  LIMIT 1;

  RETURN COALESCE(v_balance, 0);
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. Update transfer_between_players minimum to $1,000 COP
--    (must be multiple of 100,000 centavos per the new rule)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.transfer_between_players(
  p_recipient_id   UUID,
  p_amount_cents   INT,
  p_description    TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id    UUID;
  v_reference_id TEXT;
  v_debit_result JSONB;
  v_credit_result JSONB;
  v_sender_name  TEXT;
  v_recipient_name TEXT;
BEGIN
  v_sender_id := auth.uid();

  IF v_sender_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No autenticado');
  END IF;

  IF v_sender_id = p_recipient_id THEN
    RETURN jsonb_build_object('error', 'No puedes transferirte a ti mismo');
  END IF;

  -- Monto mínimo: $1.000 COP = 100,000 centavos
  IF p_amount_cents < 100000 THEN
    RETURN jsonb_build_object('error', 'El monto mínimo de transferencia es $1.000');
  END IF;

  -- Múltiplo de $1.000 COP
  IF (p_amount_cents % 100000) <> 0 THEN
    RETURN jsonb_build_object('error', 'El monto debe ser múltiplo de $1.000 COP');
  END IF;

  SELECT username INTO v_recipient_name
  FROM public.profiles
  WHERE id = p_recipient_id;

  IF v_recipient_name IS NULL THEN
    RETURN jsonb_build_object('error', 'Destinatario no encontrado');
  END IF;

  SELECT username INTO v_sender_name
  FROM public.profiles
  WHERE id = v_sender_id;

  v_reference_id := 'transfer-' || v_sender_id::text || '-' || p_recipient_id::text || '-' || extract(epoch from now())::text;

  -- Debit sender
  v_debit_result := public.process_ledger_entry(
    p_user_id       := v_sender_id,
    p_amount_cents   := p_amount_cents,
    p_type           := 'transfer',
    p_direction      := 'debit',
    p_description    := COALESCE(p_description, 'Transferencia a ' || COALESCE(v_recipient_name, 'usuario')),
    p_reference_id   := v_reference_id,
    p_counterpart_id := p_recipient_id
  );

  IF v_debit_result ? 'error' THEN
    RETURN v_debit_result;
  END IF;

  -- Credit recipient
  v_credit_result := public.process_ledger_entry(
    p_user_id       := p_recipient_id,
    p_amount_cents   := p_amount_cents,
    p_type           := 'transfer',
    p_direction      := 'credit',
    p_description    := 'Transferencia de ' || COALESCE(v_sender_name, 'usuario'),
    p_reference_id   := v_reference_id,
    p_counterpart_id := v_sender_id
  );

  IF v_credit_result ? 'error' THEN
    RETURN v_credit_result;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'debit_result', v_debit_result,
    'credit_result', v_credit_result,
    'sender', v_sender_name,
    'recipient', v_recipient_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_between_players(UUID, INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_between_players(UUID, INT, TEXT) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 6. Reconciliation: detect and fix existing discrepancies
--    caused by the non-deterministic ordering bug.
--    Compare wallet balance vs last ledger balance_after_cents
--    (by sequence) and insert adjustment entries if mismatched.
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.ledger (
  user_id, type, direction, amount_cents,
  balance_before_cents, balance_after_cents,
  description, reference_id, status
)
SELECT
  w.user_id,
  'adjustment',
  CASE WHEN w.balance_cents > COALESCE(last_ledger.balance_after_cents, 0) THEN 'credit' ELSE 'debit' END,
  ABS(w.balance_cents - COALESCE(last_ledger.balance_after_cents, 0))::int,
  COALESCE(last_ledger.balance_after_cents, 0)::bigint,
  w.balance_cents,
  'Reconciliación: fix ledger ordering bug (pre-20260410)',
  'reconciliation-ordering-20260410-' || w.user_id::text,
  'completed'
FROM public.wallets w
LEFT JOIN LATERAL (
  SELECT balance_after_cents
  FROM public.ledger
  WHERE user_id = w.user_id
  ORDER BY sequence DESC
  LIMIT 1
) last_ledger ON true
WHERE w.balance_cents IS DISTINCT FROM COALESCE(last_ledger.balance_after_cents, 0)
  AND ABS(w.balance_cents - COALESCE(last_ledger.balance_after_cents, 0)) > 0;
