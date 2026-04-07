-- =============================================================================
-- Migration: Fix get_total_users_balance RPC + add vault status RPCs
-- =============================================================================
-- BUG: get_total_users_balance() references non-existent "users" table.
--      The actual table is "wallets" with column "balance_cents".
-- NEW: get_vault_status() returns deposits, withdrawals, vault balance,
--      and coverage percentage for the "Status Bóveda" dashboard widget.
-- =============================================================================

-- 1. Fix get_total_users_balance to use correct table
CREATE OR REPLACE FUNCTION get_total_users_balance()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  total BIGINT;
BEGIN
  SELECT COALESCE(SUM(balance_cents), 0) INTO total FROM wallets;
  RETURN total;
END;
$$;

-- 2. Vault status: total deposits vs total withdrawals
--    Vault balance = deposits_in - withdrawals_out = money physically in platform
--    Coverage = vault_balance / user_balances * 100
CREATE OR REPLACE FUNCTION get_vault_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_total_deposits   BIGINT;
  v_total_withdrawals BIGINT;
  v_vault_balance    BIGINT;
  v_user_balances    BIGINT;
  v_coverage         NUMERIC;
BEGIN
  -- Total deposits (credits of type deposit)
  SELECT COALESCE(SUM(amount_cents), 0)
  INTO v_total_deposits
  FROM ledger
  WHERE type = 'deposit' AND direction = 'credit' AND status = 'completed';

  -- Total withdrawals (debits of type withdrawal)
  SELECT COALESCE(SUM(amount_cents), 0)
  INTO v_total_withdrawals
  FROM ledger
  WHERE type = 'withdrawal' AND direction = 'debit' AND status = 'completed';

  -- Vault balance = money that came in - money that went out
  v_vault_balance := v_total_deposits - v_total_withdrawals;

  -- Total owed to users
  SELECT COALESCE(SUM(balance_cents), 0)
  INTO v_user_balances
  FROM wallets;

  -- Coverage percentage (avoid division by zero)
  IF v_user_balances > 0 THEN
    v_coverage := ROUND((v_vault_balance::NUMERIC / v_user_balances::NUMERIC) * 100, 1);
  ELSE
    v_coverage := 100;
  END IF;

  RETURN jsonb_build_object(
    'total_deposits', v_total_deposits,
    'total_withdrawals', v_total_withdrawals,
    'vault_balance', v_vault_balance,
    'user_balances', v_user_balances,
    'coverage', v_coverage
  );
END;
$$;
