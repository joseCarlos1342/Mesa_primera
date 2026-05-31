-- =============================================================
-- Security hardening: internal RPC surface and aggregate guards
-- =============================================================
-- The Supabase advisor warns when SECURITY DEFINER functions are executable
-- from anon/authenticated roles. Some RPCs are intentionally exposed, but
-- trigger functions, game-server financial primitives, and admin aggregates
-- must not be callable directly by clients.

CREATE OR REPLACE FUNCTION public.get_total_users_balance()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  total BIGINT;
BEGIN
  IF NOT (COALESCE((SELECT public.is_admin()), false) OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(SUM(balance_cents), 0) INTO total FROM public.wallets;
  RETURN total;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_vault_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_total_deposits    BIGINT;
  v_total_withdrawals BIGINT;
  v_vault_balance     BIGINT;
  v_user_balances     BIGINT;
  v_coverage          NUMERIC;
BEGIN
  IF NOT (COALESCE((SELECT public.is_admin()), false) OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(SUM(amount_cents), 0)
  INTO v_total_deposits
  FROM public.ledger
  WHERE type = 'deposit' AND direction = 'credit' AND status = 'completed';

  SELECT COALESCE(SUM(amount_cents), 0)
  INTO v_total_withdrawals
  FROM public.ledger
  WHERE type = 'withdrawal' AND direction = 'debit' AND status = 'completed';

  v_vault_balance := v_total_deposits - v_total_withdrawals;

  SELECT COALESCE(SUM(balance_cents), 0)
  INTO v_user_balances
  FROM public.wallets;

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

ALTER FUNCTION public.transfer_pique_banda(UUID, UUID, JSONB, UUID, JSONB) SET search_path = public;

REVOKE ALL ON FUNCTION public.transfer_pique_banda(UUID, UUID, JSONB, UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_pique_banda(UUID, UUID, JSONB, UUID, JSONB) TO service_role;

REVOKE ALL ON FUNCTION public.get_total_users_balance() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_total_users_balance() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_vault_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_vault_status() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.process_admin_transaction(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_admin_transaction(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.get_admin_ledger_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_ledger_summary() TO authenticated;

-- Trigger/internal helpers should not be exposed through PostgREST RPC.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_dispute_updated_at() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF to_regprocedure('public.handle_friend_request_notification()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.handle_friend_request_notification() FROM PUBLIC, anon, authenticated';
  END IF;

  IF to_regprocedure('public.handle_friend_acceptance_notification()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.handle_friend_acceptance_notification() FROM PUBLIC, anon, authenticated';
  END IF;

  IF to_regprocedure('public.handle_deposit_request_notification()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.handle_deposit_request_notification() FROM PUBLIC, anon, authenticated';
  END IF;

  IF to_regprocedure('public.handle_withdrawal_request_notification()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.handle_withdrawal_request_notification() FROM PUBLIC, anon, authenticated';
  END IF;
END;
$$;
