BEGIN;

SELECT plan(4);

SELECT has_function(
  'public',
  'process_ledger_entry',
  ARRAY['uuid', 'integer', 'text', 'text', 'uuid', 'uuid', 'text', 'text', 'uuid', 'uuid', 'jsonb'],
  'process_ledger_entry conserva el contrato del ledger'
);

SELECT has_function(
  'public',
  'award_pot',
  ARRAY['uuid', 'integer', 'integer', 'uuid', 'uuid', 'jsonb'],
  'award_pot expone liquidación atómica'
);

SELECT ok(
  to_regclass('public.ledger_user_reference_id_unique') IS NOT NULL,
  'Existe la unicidad por usuario y referencia'
);

SELECT ok(
  to_regclass('public.ledger') IS NOT NULL,
  'La liquidación usa el ledger inmutable'
);

SELECT * FROM finish();
ROLLBACK;
