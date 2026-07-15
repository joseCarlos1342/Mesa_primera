BEGIN;

SELECT plan(5);

SELECT has_function(
  'public',
  'list_admin_recovery_incidents',
  ARRAY[]::text[],
  'La RPC de historial terminal de recovery existe'
);

SELECT ok(
  has_function_privilege('authenticated', 'public.list_admin_recovery_incidents()', 'EXECUTE'),
  'authenticated puede invocar la RPC protegida por su propia sesión'
);

SELECT ok(
  NOT has_function_privilege('anon', 'public.list_admin_recovery_incidents()', 'EXECUTE'),
  'anon no puede invocar el historial de recovery'
);

INSERT INTO auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000901', 'authenticated', 'authenticated', 'recovery-history-admin@example.test', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, username, role)
VALUES ('00000000-0000-0000-0000-000000000901', 'recovery_history_admin', 'admin')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO public.tables (id, name, game_type)
VALUES ('00000000-0000-0000-0000-000000000902', 'Mesa historial recovery', 'Mesa')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.games (id, table_id, status)
VALUES
  ('00000000-0000-0000-0000-000000000903', '00000000-0000-0000-0000-000000000902', 'finished'),
  ('00000000-0000-0000-0000-000000000904', '00000000-0000-0000-0000-000000000902', 'in_progress')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

INSERT INTO public.game_recovery_incidents (
  game_id, room_id, detected_at, recovery_deadline_at, cause_code, status, resolution_reason, resolved_at
) VALUES
  ('00000000-0000-0000-0000-000000000903', 'terminal-recovery-room', now() - interval '5 minutes', now() - interval '3 minutes', 'process_restart', 'cancelled_crash', 'recovery_deadline_expired', now() - interval '2 minutes'),
  ('00000000-0000-0000-0000-000000000904', 'active-recovery-room', now() - interval '5 minutes', now() + interval '2 minutes', 'process_restart', 'manual_review', 'needs_attention', now())
ON CONFLICT (game_id) DO UPDATE SET
  status = EXCLUDED.status,
  resolution_reason = EXCLUDED.resolution_reason,
  resolved_at = EXCLUDED.resolved_at;

INSERT INTO public.game_recovery_refunds (incident_id, user_id, amount_cents, operation_id, status)
SELECT incident.id, '00000000-0000-0000-0000-000000000901', 100, operation_id, status
FROM public.game_recovery_incidents AS incident
CROSS JOIN (VALUES
  ('00000000-0000-0000-0000-000000000905'::uuid, 'completed'),
  ('00000000-0000-0000-0000-000000000906'::uuid, 'pending')
) AS refunds(operation_id, status)
WHERE incident.game_id = '00000000-0000-0000-0000-000000000903'
ON CONFLICT (operation_id) DO UPDATE SET status = EXCLUDED.status;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000901', true);

SELECT is(
  (SELECT count(*)::int FROM public.list_admin_recovery_incidents()),
  1,
  'El historial omite incidentes de partidas activas'
);

SELECT row_eq(
  $$SELECT game_id, room_id, cause_code, status, resolution_reason, refunds_completed_count, refunds_total_count
    FROM public.list_admin_recovery_incidents()
    WHERE game_id = '00000000-0000-0000-0000-000000000903'$$,
  $$VALUES ('00000000-0000-0000-0000-000000000903'::uuid, 'terminal-recovery-room'::text, 'process_restart'::text, 'cancelled_crash'::text, 'recovery_deadline_expired'::text, 1::bigint, 2::bigint)$$,
  'El historial expone solo el resumen y los conteos agregados de refunds'
);

SELECT * FROM finish();
ROLLBACK;
