-- ============================================================
-- Migration: Round all fractional wallet balances to whole pesos
-- ============================================================
-- The 5% rake calculation (Math.floor(amount * 0.05)) could produce
-- centavo amounts not divisible by 100 after cascading through all-in bets.
-- This rounds all balances UP to the nearest 100 centavos ($1 peso).
-- The game server rake has been fixed to use Math.ceil(amount * 0.05 / 100) * 100.
-- ============================================================

-- 1. Log the adjustment for audit trail FIRST (before updating balances)
INSERT INTO ledger (user_id, type, direction, amount_cents, balance_before_cents, balance_after_cents, description, status)
SELECT
  w.user_id,
  'adjustment',
  'credit',
  (CEIL(w.balance_cents::NUMERIC / 100) * 100 - w.balance_cents)::BIGINT,
  w.balance_cents,
  (CEIL(w.balance_cents::NUMERIC / 100) * 100)::BIGINT,
  'Redondeo automático de saldo fraccionario a peso entero',
  'completed'
FROM wallets w
WHERE w.balance_cents % 100 != 0;

-- 2. Round all non-whole-peso balances UP to nearest $1 (100 centavos)
UPDATE wallets
SET balance_cents = CEIL(balance_cents::NUMERIC / 100) * 100
WHERE balance_cents % 100 != 0;
