BEGIN;

SELECT plan(14);

SELECT has_function('public', 'list_admin_recovery_refunds', ARRAY['uuid'], 'El detalle terminal de refunds existe');
SELECT has_function('public', 'list_admin_recovery_incidents_export', ARRAY['text', 'text', 'text', 'date', 'date'], 'El contrato de exportación existe');
SELECT has_function('public', 'close_game_recovery_incident', ARRAY['uuid', 'text'], 'El cierre irreversible existe');
SELECT ok(has_function_privilege('authenticated', 'public.list_admin_recovery_refunds(uuid)', 'EXECUTE'), 'Solo usuarios autenticados pueden pedir refunds terminales');
SELECT ok(NOT has_function_privilege('anon', 'public.list_admin_recovery_refunds(uuid)', 'EXECUTE'), 'anon no puede pedir refunds');
SELECT ok(NOT has_function_privilege('anon', 'public.close_game_recovery_incident(uuid,text)', 'EXECUTE'), 'anon no puede cerrar incidentes');
SELECT ok(
  pg_get_functiondef('public.close_game_recovery_incident(uuid,text)'::regprocedure) LIKE '%refund.ledger_id IS NULL%',
  'El cierre requiere evidencia de ledger para cada refund completado'
);
SELECT ok(
  pg_get_functiondef('public.list_admin_recovery_incidents_export(text,text,text,date,date)'::regprocedure) LIKE '%LIMIT 5001%',
  'La exportación limita el volumen y permite detectar exceso sin truncarlo'
);

INSERT INTO auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at)
VALUES
  ('00000000-0000-4000-8000-000000000991', 'authenticated', 'authenticated', 'operations-admin@example.test', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000992', 'authenticated', 'authenticated', 'operations-player@example.test', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, username, role)
VALUES
  ('00000000-0000-4000-8000-000000000991', 'operations_admin', 'admin'),
  ('00000000-0000-4000-8000-000000000992', 'operations_player', 'player')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO public.tables (id, name, game_type)
VALUES ('00000000-0000-4000-8000-000000000993', 'Mesa recovery operations', 'Mesa')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.games (id, table_id, status)
VALUES
  ('00000000-0000-4000-8000-000000000994', '00000000-0000-4000-8000-000000000993', 'finished'),
  ('00000000-0000-4000-8000-000000000995', '00000000-0000-4000-8000-000000000993', 'in_progress')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

INSERT INTO public.game_recovery_incidents (
  game_id, room_id, detected_at, recovery_deadline_at, cause_code, status, resolution_reason, resolved_at
) VALUES
  ('00000000-0000-4000-8000-000000000994', 'terminal-operations-room', now() - interval '6 minutes', now() - interval '4 minutes', 'process_restart', 'manual_review', 'requires_review', now() - interval '3 minutes'),
  ('00000000-0000-4000-8000-000000000995', 'active-operations-room', now() - interval '5 minutes', now() + interval '2 minutes', 'process_restart', 'manual_review', 'requires_review', now())
ON CONFLICT (game_id) DO UPDATE SET status = EXCLUDED.status, resolved_at = EXCLUDED.resolved_at;

INSERT INTO public.game_recovery_refunds (incident_id, user_id, amount_cents, operation_id, status)
SELECT incident.id, '00000000-0000-4000-8000-000000000992', 100000, operation.id, 'pending'
FROM public.game_recovery_incidents AS incident
JOIN (VALUES
  ('00000000-0000-4000-8000-000000000994'::uuid, '00000000-0000-4000-8000-000000000996'::uuid),
  ('00000000-0000-4000-8000-000000000995'::uuid, '00000000-0000-4000-8000-000000000997'::uuid)
) AS operation(game_id, id) ON operation.game_id = incident.game_id
ON CONFLICT (operation_id) DO UPDATE SET status = EXCLUDED.status;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000992', true);

SELECT is(
  (SELECT count(*)::int FROM public.list_admin_recovery_refunds('00000000-0000-4000-8000-000000000994')),
  0,
  'Un jugador no obtiene refunds terminales'
);

SELECT throws_ok(
  $$SELECT * FROM public.list_admin_recovery_incidents_export(NULL, NULL, NULL, NULL, NULL)$$,
  '42501',
  'Acceso denegado',
  'Un jugador no puede exportar incidentes terminales'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000991', true);

SELECT is(
  (SELECT count(*)::int FROM public.list_admin_recovery_refunds('00000000-0000-4000-8000-000000000995')),
  0,
  'El admin no puede consultar refunds de una partida activa'
);

SELECT is(
  (SELECT count(*)::int FROM public.list_admin_recovery_incidents_export(NULL, NULL, 'active-operations-room', NULL, NULL)),
  0,
  'La exportación omite incidentes de partidas activas'
);

SELECT is(
  (SELECT count(*)::int FROM public.list_admin_recovery_incidents_export('manual_review', 'process_restart', 'terminal-operations-room', NULL, NULL)),
  1,
  'La exportación permite el resumen terminal al admin'
);

RESET ROLE;
SET LOCAL ROLE service_role;

SELECT is(
  public.mark_game_recovery_incident_manual_review(
    '00000000-0000-4000-8000-000000000994',
    'Reintento para reparar una alerta idempotente'
  )->>'status',
  'manual_review',
  'Un reintento conserva el estado para reparar la alerta deduplicada'
);

SELECT * FROM finish();
ROLLBACK;
