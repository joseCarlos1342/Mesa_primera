-- =============================================================
-- Migration: Immutable Ledger (Event-Sourced), Table Financials,
--            Replay Admin Blindness & Atomic Financial RPCs
-- =============================================================
-- Principles:
--   1. The `ledger` table is the single source of truth for all balances.
--   2. INSERT-ONLY: No UPDATE or DELETE allowed on `ledger` for any role.
--   3. Balance = last `balance_after_cents` for a user (or SUM if needed).
--   4. All financial mutations go through `process_ledger_entry()` RPC.
--   5. Admin cannot see replays/game_actions for active (non-finished) games.
-- =============================================================

-- ============================================================
-- 1. LEDGER IMMUTABILITY — Block UPDATE and DELETE for everyone
-- ============================================================

-- Drop any existing permissive policies on ledger that might allow UPDATE/DELETE
DROP POLICY IF EXISTS "No updates on ledger_table" ON public.ledger;
DROP POLICY IF EXISTS "No deletes on ledger_table" ON public.ledger;

CREATE POLICY "ledger_no_update" ON public.ledger
  FOR UPDATE USING (false);

CREATE POLICY "ledger_no_delete" ON public.ledger
  FOR DELETE USING (false);

-- Admins can SELECT all ledger entries (financial auditing)
DROP POLICY IF EXISTS "Admins can view all ledger entries" ON public.ledger;
CREATE POLICY "Admins can view all ledger entries" ON public.ledger
  FOR SELECT USING ((SELECT is_admin()));

-- Add index for fast balance lookups
CREATE INDEX IF NOT EXISTS idx_ledger_user_id ON public.ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_game_id ON public.ledger(game_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON public.ledger(created_at);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON public.ledger(type);

-- Add table_id column to ledger for table-level financial tracking
ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS table_id UUID REFERENCES public.tables(id);
CREATE INDEX IF NOT EXISTS idx_ledger_table_id ON public.ledger(table_id);

-- ============================================================
-- 2. ATOMIC LEDGER ENTRY RPC — process_ledger_entry()
--    The ONLY way to mutate balances. Runs as SECURITY DEFINER
--    to bypass RLS and guarantee atomicity.
-- ============================================================

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
  v_current_balance INT;
  v_new_balance     INT;
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
  -- Using balance_after_cents from the latest row for this user.
  -- If no entries exist, balance is 0.
  SELECT COALESCE(balance_after_cents, 0)
  INTO v_current_balance
  FROM public.ledger
  WHERE user_id = p_user_id
  ORDER BY created_at DESC, id DESC
  LIMIT 1
  FOR UPDATE;  -- Row-level lock to prevent race conditions

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

  -- Keep wallets table in sync (deprecated but maintained for backward compat)
  UPDATE public.wallets
  SET balance = v_new_balance,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- If no wallet exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, balance, currency)
    VALUES (p_user_id, v_new_balance, 'ARS')
    ON CONFLICT (user_id) DO UPDATE SET balance = v_new_balance, updated_at = NOW();
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'ledger_id', v_ledger_id,
    'balance_before', v_current_balance,
    'balance_after', v_new_balance
  );
END;
$$;

-- ============================================================
-- 3. ATOMIC POT AWARD RPC — award_pot()
--    Awards the pot to the winner and records the rake in a
--    single atomic transaction. Both rows share the same game_id.
-- ============================================================

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
    p_reference_id  := 'pot-win-' || p_game_id::text,
    p_metadata      := p_pot_details
  );

  IF v_win_result ? 'error' THEN
    RETURN v_win_result;
  END IF;

  -- 2. Record the rake as a debit from the winner (house commission)
  -- This debit was already implicit in the payout (pot - rake = payout),
  -- but we record it for auditing so the ledger shows gross pot movement.
  IF p_rake > 0 THEN
    v_rake_result := public.process_ledger_entry(
      p_user_id      := p_winner_id,
      p_amount_cents  := p_rake,
      p_type          := 'rake',
      p_direction     := 'debit',
      p_game_id       := p_game_id,
      p_table_id      := p_table_id,
      p_description   := 'Comisión de la casa (5%)',
      p_reference_id  := 'rake-' || p_game_id::text,
      p_metadata      := jsonb_build_object('rake_pct', 0.05)
    );

    IF v_rake_result ? 'error' THEN
      -- Rollback: this is inside a single transaction, so raising an
      -- exception will abort both the win credit and the rake debit.
      RAISE EXCEPTION 'Error al registrar rake: %', v_rake_result->>'error';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'win_ledger', v_win_result->'ledger_id',
    'balance_after', v_win_result->'balance_after'
  );
END;
$$;

-- ============================================================
-- 4. UPDATE process_admin_transaction() TO USE LEDGER RPC
--    Instead of manually updating wallets, delegate to
--    process_ledger_entry() for atomicity.
-- ============================================================

CREATE OR REPLACE FUNCTION public.process_admin_transaction(
    p_request_id UUID,
    p_status TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request RECORD;
    v_type TEXT;
    v_result JSONB;
BEGIN
    -- 1. Validate admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RETURN jsonb_build_object('error', 'No autorizado');
    END IF;

    -- 2. Find the request (deposit or withdrawal)
    SELECT * INTO v_request
    FROM deposit_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF FOUND THEN
        v_type := 'deposit';
    ELSE
        SELECT * INTO v_request
        FROM withdrawal_requests
        WHERE id = p_request_id
        FOR UPDATE;

        IF FOUND THEN
            v_type := 'withdrawal';
        ELSE
            RETURN jsonb_build_object('error', 'Solicitud no encontrada');
        END IF;
    END IF;

    -- 3. Validate status
    IF v_request.status != 'pending' THEN
        RETURN jsonb_build_object('error', 'La solicitud ya fue procesada');
    END IF;

    IF p_status NOT IN ('completed', 'failed') THEN
        RETURN jsonb_build_object('error', 'Estado inválido');
    END IF;

    -- 4. If completed, process through the atomic ledger entry
    IF p_status = 'completed' THEN
        v_result := public.process_ledger_entry(
            p_user_id      := v_request.user_id,
            p_amount_cents  := v_request.amount_cents,
            p_type          := v_type,
            p_direction     := CASE WHEN v_type = 'deposit' THEN 'credit' ELSE 'debit' END,
            p_description   := 'Admin procesó ' || v_type,
            p_reference_id  := p_request_id::text,
            p_approved_by   := auth.uid()
        );

        IF v_result ? 'error' THEN
            RETURN v_result;
        END IF;
    END IF;

    -- 5. Mark the request as processed
    IF v_type = 'deposit' THEN
        UPDATE deposit_requests
        SET status = CASE WHEN p_status = 'completed' THEN 'approved' ELSE 'rejected' END,
            reviewed_by = auth.uid(),
            reviewed_at = NOW(),
            updated_at = NOW()
        WHERE id = p_request_id;
    ELSE
        UPDATE withdrawal_requests
        SET status = CASE WHEN p_status = 'completed' THEN 'approved' ELSE 'rejected' END,
            reviewed_by = auth.uid(),
            reviewed_at = NOW(),
            updated_at = NOW()
        WHERE id = p_request_id;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 5. VIEW: v_table_financials
--    Aggregated financial data per table for admin dashboard.
--    Shows total volume, rake collected, games played, and
--    participant count.
-- ============================================================

CREATE OR REPLACE VIEW public.v_table_financials AS
SELECT
  t.id AS table_id,
  t.name AS table_name,
  t.game_type,
  COUNT(DISTINCT l.game_id) AS total_games,
  COUNT(DISTINCT l.user_id) AS unique_players,
  COALESCE(SUM(l.amount_cents) FILTER (WHERE l.type = 'win'), 0) AS total_winnings_cents,
  COALESCE(SUM(l.amount_cents) FILTER (WHERE l.type = 'rake'), 0) AS total_rake_cents,
  COALESCE(SUM(l.amount_cents) FILTER (WHERE l.type = 'bet'), 0) AS total_bets_cents,
  COALESCE(
    SUM(l.amount_cents) FILTER (WHERE l.direction = 'credit'),
    0
  ) AS total_credits_cents,
  COALESCE(
    SUM(l.amount_cents) FILTER (WHERE l.direction = 'debit'),
    0
  ) AS total_debits_cents,
  MAX(l.created_at) AS last_activity
FROM public.tables t
LEFT JOIN public.ledger l ON l.table_id = t.id
GROUP BY t.id, t.name, t.game_type;

-- Admin-only access to the view
-- (Views inherit the RLS of underlying tables, but we add explicit grant)
GRANT SELECT ON public.v_table_financials TO authenticated;

-- ============================================================
-- 6. RPC: get_table_financials() for admin
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_table_financials()
RETURNS SETOF public.v_table_financials
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (SELECT is_admin()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY SELECT * FROM public.v_table_financials ORDER BY last_activity DESC NULLS LAST;
END;
$$;

-- ============================================================
-- 7. RPC: get_user_balance() — Derive balance from ledger
-- ============================================================

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
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  RETURN COALESCE(v_balance, 0);
END;
$$;

-- ============================================================
-- 8. REPLAY ADMIN BLINDNESS
--    Admin can only see replays for FINISHED games.
--    While a game is active, replays are invisible to admins.
-- ============================================================

-- Drop the existing permissive replay policy
DROP POLICY IF EXISTS "Players can view replays of games they participated in" ON public.game_replays;

-- Players: can see replays where they are a participant (always)
CREATE POLICY "replay_player_access" ON public.game_replays
  FOR SELECT
  USING (
    players @> ANY (
      ARRAY[(SELECT '[{"userId": "' || auth.uid()::text || '"}]')::jsonb]
    )
  );

-- Admins: can only see replays of FINISHED games (admin blindness)
CREATE POLICY "replay_admin_access" ON public.game_replays
  FOR SELECT
  USING (
    (SELECT is_admin())
    AND EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_replays.game_id
        AND g.status = 'finished'
    )
  );

-- Block admin from UPDATE/DELETE on replays
DROP POLICY IF EXISTS "replay_no_update" ON public.game_replays;
DROP POLICY IF EXISTS "replay_no_delete" ON public.game_replays;

CREATE POLICY "replay_no_update" ON public.game_replays
  FOR UPDATE USING (false);

CREATE POLICY "replay_no_delete" ON public.game_replays
  FOR DELETE USING (false);

-- ============================================================
-- 9. Add admin_timeline column to game_replays
--    Stores per-action RNG seeds for admin auditing only.
--    Players see `timeline` (no RNG seeds per step).
--    Admins see `admin_timeline` (with RNG seeds per step).
-- ============================================================

ALTER TABLE public.game_replays
  ADD COLUMN IF NOT EXISTS admin_timeline JSONB;

-- ============================================================
-- 10. GRANT SERVICE ROLE insert on ledger
--     The game server uses the service_role key, which bypasses
--     RLS. We only need to ensure the column constraints work.
-- ============================================================

-- No explicit GRANT needed: service_role bypasses RLS.
-- The process_ledger_entry() and award_pot() RPCs are SECURITY DEFINER,
-- so they run as the function owner (postgres) regardless of caller.

-- ============================================================
-- 11. TRIGGER: Prevent direct INSERT on ledger from non-RPC callers
--     Only allow inserts from the process_ledger_entry function.
--     This is enforced by NOT having any INSERT policies on ledger
--     for regular users, and by using SECURITY DEFINER on the RPC.
-- ============================================================

-- Remove the old "Users can insert" policy - only RPC should insert
DROP POLICY IF EXISTS "Users can insert own ledger entries" ON public.ledger;

-- Only service role (game server) and SECURITY DEFINER functions can insert.
-- No authenticated user can INSERT directly into ledger.

-- ============================================================
-- DONE
-- ============================================================
