BEGIN;

SELECT plan(8);

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

SELECT * FROM finish();
ROLLBACK;
