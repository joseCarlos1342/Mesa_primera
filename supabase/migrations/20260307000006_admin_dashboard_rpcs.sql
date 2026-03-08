-- Get total valid users balance
CREATE OR REPLACE FUNCTION get_total_users_balance()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total BIGINT;
BEGIN
  SELECT COALESCE(SUM(balance_cents), 0) INTO total FROM users;
  RETURN total;
END;
$$;

-- Get ledger net balance (credits - debits)
CREATE OR REPLACE FUNCTION get_ledger_net_balance()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_credits BIGINT;
  total_debits BIGINT;
BEGIN
  SELECT COALESCE(SUM(amount_cents), 0) INTO total_credits FROM ledger WHERE direction = 'credit' AND status = 'completed';
  SELECT COALESCE(SUM(amount_cents), 0) INTO total_debits FROM ledger WHERE direction = 'debit' AND status = 'completed';
  RETURN total_credits - total_debits;
END;
$$;
