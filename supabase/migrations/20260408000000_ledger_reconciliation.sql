-- =============================================================
-- Migration: Reconciliación del Ledger — Cierre de gaps
-- =============================================================
-- CONTEXTO: El bug en process_ledger_entry() que referenciaba
-- wallets.balance (columna inexistente, corregido en 20260402)
-- causó que transacciones de juego (apuestas/ganancias) se
-- aplicaran al wallet pero NO se registraran en el ledger.
-- Esto dejó discrepancias entre SUM(ledger) y wallet_balance.
--
-- Esta migración inserta entradas de tipo 'adjustment' para
-- cerrar formalmente la brecha contable de cada usuario afectado.
-- No modifica saldos de wallets — solo sincroniza el ledger.
-- =============================================================

-- Insertar ajuste de reconciliación para cada usuario con discrepancia
INSERT INTO public.ledger (
  user_id, type, direction, amount_cents,
  balance_before_cents, balance_after_cents,
  description, reference_id, status
)
SELECT
  w.user_id,
  'adjustment',
  'credit',
  (w.balance_cents - COALESCE(l.net, 0))::int,
  COALESCE(l.net, 0)::bigint,                    -- donde estaría el balance según el ledger
  w.balance_cents,                                -- donde realmente está el wallet
  'Reconciliación automática: transacciones de juego no registradas por bug wallets.balance (pre-20260402)',
  'reconciliation-20260408-' || w.user_id::text,
  'completed'
FROM public.wallets w
LEFT JOIN (
  SELECT user_id,
    SUM(CASE WHEN direction = 'credit' THEN amount_cents
             WHEN direction = 'debit'  THEN -amount_cents
             ELSE 0 END) as net
  FROM public.ledger
  GROUP BY user_id
) l ON l.user_id = w.user_id
WHERE (w.balance_cents - COALESCE(l.net, 0)) > 0;
