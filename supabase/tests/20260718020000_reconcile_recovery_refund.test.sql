BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL ROLE postgres;
GRANT USAGE ON SCHEMA extensions TO PUBLIC;
SET LOCAL search_path = public, extensions;

SELECT plan(11);

SELECT has_function(
  'public',
  'reconcile_game_recovery_refund',
  ARRAY['uuid', 'text'],
  'La RPC de reconciliación de refund existe'
);

SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.reconcile_game_recovery_refund(uuid,text)',
    'EXECUTE'
  ),
  'authenticated puede invocar la RPC protegida'
);

SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.reconcile_game_recovery_refund(uuid,text)',
    'EXECUTE'
  ),
  'anon no puede invocar la reconciliación'
);

INSERT INTO auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at)
VALUES
  ('00000000-0000-4000-8000-000000000981', 'authenticated', 'authenticated', 'reconcile-admin@example.test', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000982', 'authenticated', 'authenticated', 'reconcile-player@example.test', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000984', 'authenticated', 'authenticated', 'reconcile-recipient@example.test', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, username, role)
VALUES
  ('00000000-0000-4000-8000-000000000981', 'reconcile_admin', 'admin'),
  ('00000000-0000-4000-8000-000000000982', 'reconcile_player', 'player'),
  ('00000000-0000-4000-8000-000000000984', 'reconcile_recipient', 'player')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO public.tables (id, name, game_type)
VALUES ('00000000-0000-4000-8000-000000000985', 'Mesa reconcile recovery', 'Mesa')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.games (id, table_id, status)
VALUES ('00000000-0000-4000-8000-000000000986', '00000000-0000-4000-8000-000000000985', 'finished')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

INSERT INTO public.game_recovery_incidents (
  game_id, room_id, detected_at, recovery_deadline_at, cause_code, status, resolution_reason, resolved_at
) VALUES (
  '00000000-0000-4000-8000-000000000986', 'reconcile-room', now() - interval '5 minutes',
  now() - interval '3 minutes', 'process_restart', 'manual_review', 'requires_review', now() - interval '2 minutes'
)
ON CONFLICT (game_id) DO UPDATE SET status = EXCLUDED.status, resolved_at = EXCLUDED.resolved_at;

INSERT INTO public.game_recovery_refunds (id, incident_id, user_id, amount_cents, operation_id, status)
SELECT
  '00000000-0000-4000-8000-000000000987', incident.id,
  '00000000-0000-4000-8000-000000000984', 500000,
  '00000000-0000-4000-8000-000000000988', 'pending'
FROM public.game_recovery_incidents AS incident
WHERE incident.game_id = '00000000-0000-4000-8000-000000000986'
ON CONFLICT (id) DO UPDATE SET status = 'pending', ledger_id = NULL, completed_at = NULL;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000982', true);

SELECT throws_ok(
  $$SELECT public.reconcile_game_recovery_refund('00000000-0000-4000-8000-000000000983', 'Investigación operativa del refund pendiente')$$,
  '42501',
  'Acceso denegado',
  'Un jugador no puede reconciliar refunds'
);

SET LOCAL ROLE postgres;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000981', true);

CREATE TEMP TABLE reconciliation_results (step TEXT PRIMARY KEY, value JSONB);

SELECT throws_ok(
  $$SELECT public.reconcile_game_recovery_refund('00000000-0000-4000-8000-000000000983', 'corto')$$,
  '22023',
  'Motivo de reconciliación inválido',
  'La reconciliación exige un motivo operativo suficiente'
);

INSERT INTO reconciliation_results (step, value)
SELECT 'first', public.reconcile_game_recovery_refund(
  '00000000-0000-4000-8000-000000000987',
  'Conciliación validada mediante prueba financiera idempotente'
);

SELECT ok(
  (SELECT (value->>'success')::boolean AND NOT (value->>'already_reconciled')::boolean FROM reconciliation_results WHERE step = 'first'),
  'El primer intento completa la reconciliación'
);

SELECT is(
  (SELECT count(*)::int FROM public.ledger WHERE metadata->>'operation_id' = '00000000-0000-4000-8000-000000000988'),
  1,
  'La reconciliación crea exactamente un crédito idempotente'
);

SET LOCAL ROLE postgres;
SELECT is(
  (SELECT status FROM public.game_recovery_refunds WHERE id = '00000000-0000-4000-8000-000000000987'),
  'completed',
  'El refund queda completado dentro de la misma transacción'
);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000981', true);

INSERT INTO reconciliation_results (step, value)
SELECT 'second', public.reconcile_game_recovery_refund(
  '00000000-0000-4000-8000-000000000987',
  'Segundo intento de conciliación idempotente del mismo refund'
);

SELECT ok(
  (SELECT (value->>'success')::boolean AND (value->>'already_reconciled')::boolean FROM reconciliation_results WHERE step = 'second'),
  'El segundo intento informa que la operación ya estaba conciliada'
);

SELECT is(
  (SELECT count(*)::int FROM public.ledger WHERE metadata->>'operation_id' = '00000000-0000-4000-8000-000000000988'),
  1,
  'El reintento no duplica el crédito'
);

SELECT is(
  (SELECT count(*)::int FROM public.admin_audit_log WHERE action = 'recovery_refund_reconciled' AND target_id = '00000000-0000-4000-8000-000000000987'),
  1,
  'El reintento tampoco duplica la auditoría'
);

SELECT * FROM finish();
ROLLBACK;
