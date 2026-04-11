-- =============================================================
-- Migration: Admin Ledger Summary RPC
-- =============================================================
-- Replaces the N+1 query pattern in getUsersWithBalances() with
-- a single aggregation that returns a consistent snapshot of
-- balance, total credits, total debits, and last activity per
-- user.  Also surfaces a discrepancy flag when wallets.balance_cents
-- differs from the last ledger balance_after_cents.
--
-- PERF: Uses the (user_id, sequence DESC) index added in
--       20260410033335_fix_ledger_ordering_and_reconcile.sql
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_admin_ledger_summary()
RETURNS TABLE (
  id            UUID,
  display_name  TEXT,
  username      TEXT,
  balance       BIGINT,
  total_credits BIGINT,
  total_debits  BIGINT,
  last_activity TIMESTAMPTZ,
  has_discrepancy BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  -- Admin-only guard
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  RETURN QUERY
  SELECT
    w.user_id                                                    AS id,
    COALESCE(p.full_name, p.username, 'Desconocido')::TEXT       AS display_name,
    p.username::TEXT                                              AS username,
    COALESCE(w.balance_cents, 0)::BIGINT                         AS balance,
    COALESCE(SUM(l.amount_cents)
      FILTER (WHERE l.direction = 'credit'), 0)::BIGINT          AS total_credits,
    COALESCE(SUM(l.amount_cents)
      FILTER (WHERE l.direction = 'debit'), 0)::BIGINT           AS total_debits,
    MAX(l.created_at)                                            AS last_activity,
    -- Flag: wallet balance out of sync with latest ledger snapshot
    (w.balance_cents IS DISTINCT FROM (
      SELECT balance_after_cents
      FROM ledger ls
      WHERE ls.user_id = w.user_id
      ORDER BY ls.sequence DESC
      LIMIT 1
    ))                                                           AS has_discrepancy
  FROM wallets w
  LEFT JOIN profiles p  ON p.id = w.user_id
  LEFT JOIN ledger   l  ON l.user_id = w.user_id
  GROUP BY w.user_id, p.full_name, p.username, w.balance_cents
  ORDER BY w.balance_cents DESC;
END;
$$;

-- Only authenticated users (admin guard is inside the function)
REVOKE ALL ON FUNCTION public.get_admin_ledger_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_ledger_summary() TO authenticated;
