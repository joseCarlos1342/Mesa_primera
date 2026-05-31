BEGIN;

SELECT plan(18);

-- ─────────────────────────────────────────────────────────────
-- Test 1: Tabla bonus_tiers existe con columnas requeridas
-- ─────────────────────────────────────────────────────────────
SELECT has_table('public', 'bonus_tiers', 'Table bonus_tiers exists');

SELECT has_column('public', 'bonus_tiers', 'min_rake_cents', 'Column min_rake_cents exists');

-- ─────────────────────────────────────────────────────────────
-- Test 2: Tabla bonus_claims existe con constraint de unicidad
-- ─────────────────────────────────────────────────────────────
SELECT has_table('public', 'bonus_claims', 'Table bonus_claims exists');

SELECT has_column('public', 'bonus_claims', 'period', 'Column period exists');

-- ─────────────────────────────────────────────────────────────
-- Test 3: RPCs existen con las firmas correctas
-- ─────────────────────────────────────────────────────────────
SELECT has_function('public', 'get_bonus_status', ARRAY['uuid'], 'Function get_bonus_status exists');

SELECT has_function('public', 'claim_bonus', ARRAY['integer'], 'Function claim_bonus exists');

-- ─────────────────────────────────────────────────────────────
-- Test 4: process_ledger_entry acepta type bonus
-- ─────────────────────────────────────────────────────────────
SELECT has_function('public', 'process_ledger_entry',
  'Function process_ledger_entry exists');

-- ─────────────────────────────────────────────────────────────
-- Test 5: Tiers seed data fue insertada
-- ─────────────────────────────────────────────────────────────
SELECT is(
  (SELECT COUNT(*)::INT FROM public.bonus_tiers WHERE active = true),
  3,
  'Three active bonus tiers exist'
);

-- ─────────────────────────────────────────────────────────────
-- Test 6: Reclamo real de bono deja rastro completo en ledger + claims
-- ─────────────────────────────────────────────────────────────
INSERT INTO auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-00000000b003',
  'authenticated',
  'authenticated',
  'bonus-player@example.test',
  now(),
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, username, role)
VALUES ('00000000-0000-0000-0000-00000000b003', 'bonus_player', 'player')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO public.ledger (
  id, user_id, type, direction, amount_cents,
  balance_before_cents, balance_after_cents, status, description, created_at
)
VALUES (
  '00000000-0000-0000-0000-00000000a301',
  '00000000-0000-0000-0000-00000000b003',
  'rake',
  'debit',
  5000000,
  5000000,
  0,
  'completed',
  'Fixture rake mensual para bono',
  now()
)
ON CONFLICT (id) DO NOTHING;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000b003', true);

CREATE TEMP TABLE bonus_claim_result AS
SELECT public.claim_bonus(1) AS data;

SELECT is(
  (SELECT data->>'success' FROM bonus_claim_result),
  'true',
  'El jugador con rake suficiente puede reclamar el bono Bronce'
);

SELECT is(
  (SELECT (data->>'bonus_amount_cents')::INT FROM bonus_claim_result),
  500000,
  'El reclamo devuelve el monto correcto del bono'
);

SELECT is(
  (SELECT jsonb_typeof(data->'balance_after') FROM bonus_claim_result),
  'number',
  'El reclamo devuelve balance_after como número JSON'
);

SELECT is(
  (
    SELECT COUNT(*)::INT
    FROM public.ledger
    WHERE user_id = '00000000-0000-0000-0000-00000000b003'
      AND type = 'bonus'
      AND direction = 'credit'
      AND amount_cents = 500000
  ),
  1,
  'El bono queda acreditado como entrada immutable de ledger'
);

SELECT is(
  (
    SELECT COUNT(*)::INT
    FROM public.bonus_claims bc
    JOIN public.ledger l ON l.id = bc.ledger_entry_id
    WHERE bc.user_id = '00000000-0000-0000-0000-00000000b003'
      AND bc.tier_id = 1
      AND bc.period = to_char(now(), 'YYYY-MM')
      AND bc.rake_at_claim = 5000000
      AND bc.bonus_amount_cents = 500000
      AND l.type = 'bonus'
      AND l.direction = 'credit'
  ),
  1,
  'bonus_claims queda enlazado al ledger del bono reclamado'
);

SELECT is(
  (
    SELECT l.reference_id
    FROM public.bonus_claims bc
    JOIN public.ledger l ON l.id = bc.ledger_entry_id
    WHERE bc.user_id = '00000000-0000-0000-0000-00000000b003'
      AND bc.tier_id = 1
      AND bc.period = to_char(now(), 'YYYY-MM')
  ),
  'bonus-00000000-0000-0000-0000-00000000b003-1-' || to_char(now(), 'YYYY-MM'),
  'El ledger conserva un reference_id trazable del bono'
);

SELECT is(
  (
    SELECT l.metadata->>'monthly_rake_at_claim'
    FROM public.bonus_claims bc
    JOIN public.ledger l ON l.id = bc.ledger_entry_id
    WHERE bc.user_id = '00000000-0000-0000-0000-00000000b003'
      AND bc.tier_id = 1
      AND bc.period = to_char(now(), 'YYYY-MM')
  ),
  '5000000',
  'El metadata del ledger conserva el rake usado para desbloquear el bono'
);

SELECT is(
  public.get_bonus_status('00000000-0000-0000-0000-00000000b003')->'tiers'->0->>'claimed',
  'true',
  'get_bonus_status marca el tier reclamado después del reclamo'
);

SELECT is(
  public.claim_bonus(1)->>'error',
  'Este bono ya fue reclamado este mes',
  'El segundo reclamo del mismo tier y periodo queda bloqueado'
);

SELECT is(
  (
    SELECT COUNT(*)::INT
    FROM public.ledger
    WHERE user_id = '00000000-0000-0000-0000-00000000b003'
      AND type = 'bonus'
      AND direction = 'credit'
  ),
  1,
  'El segundo reclamo no duplica la entrada del ledger'
);

SELECT * FROM finish();
ROLLBACK;
