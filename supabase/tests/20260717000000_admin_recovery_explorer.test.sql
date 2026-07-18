BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL ROLE postgres;
GRANT USAGE ON SCHEMA extensions TO PUBLIC;
SET LOCAL search_path = public, extensions;

SELECT plan(7);

SELECT has_function(
  'public',
  'list_admin_recovery_incidents_v2',
  ARRAY['text', 'text', 'text', 'date', 'date', 'timestamp with time zone', 'uuid', 'integer'],
  'La RPC paginada de incidentes terminales existe'
);

SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.list_admin_recovery_incidents_v2(text, text, text, date, date, timestamp with time zone, uuid, integer)',
    'EXECUTE'
  ),
  'authenticated puede invocar la RPC protegida'
);

SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.list_admin_recovery_incidents_v2(text, text, text, date, date, timestamp with time zone, uuid, integer)',
    'EXECUTE'
  ),
  'anon no puede invocar la RPC paginada'
);

INSERT INTO auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at)
VALUES ('00000000-0000-4000-8000-000000000971', 'authenticated', 'authenticated', 'recovery-explorer-admin@example.test', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, username, role)
VALUES ('00000000-0000-4000-8000-000000000971', 'recovery_explorer_admin', 'admin')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO public.tables (id, name, game_type)
VALUES ('00000000-0000-4000-8000-000000000972', 'Mesa explorer recovery', 'Mesa')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.games (id, table_id, status)
VALUES
  ('00000000-0000-4000-8000-000000000973', '00000000-0000-4000-8000-000000000972', 'finished'),
  ('00000000-0000-4000-8000-000000000974', '00000000-0000-4000-8000-000000000972', 'in_progress'),
  ('00000000-0000-4000-8000-000000000976', '00000000-0000-4000-8000-000000000972', 'finished')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

INSERT INTO public.game_recovery_incidents (
  game_id, room_id, detected_at, recovery_deadline_at, cause_code, status, resolution_reason, resolved_at
) VALUES
  ('00000000-0000-4000-8000-000000000973', 'pgtap-recovery-973', now() - interval '5 minutes', now() - interval '3 minutes', 'process_restart', 'manual_review', 'needs_attention', now() - interval '2 minutes'),
  ('00000000-0000-4000-8000-000000000974', 'active-explorer-room', now() - interval '5 minutes', now() + interval '2 minutes', 'process_restart', 'manual_review', 'needs_attention', now()),
  ('00000000-0000-4000-8000-000000000976', 'pgtap-recovery-976', now() - interval '6 minutes', now() - interval '3 minutes', 'lease_expired', 'cancelled_crash', 'recovery_deadline_expired', now() - interval '3 minutes')
ON CONFLICT (game_id) DO UPDATE SET
  room_id = EXCLUDED.room_id,
  detected_at = EXCLUDED.detected_at,
  recovery_deadline_at = EXCLUDED.recovery_deadline_at,
  cause_code = EXCLUDED.cause_code,
  status = EXCLUDED.status,
  resolution_reason = EXCLUDED.resolution_reason,
  resolved_at = EXCLUDED.resolved_at;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000971', true);

SELECT is(
  (SELECT count(*)::int FROM public.list_admin_recovery_incidents_v2(NULL, NULL, 'pgtap-recovery-973', NULL, NULL, NULL, NULL, 26)),
  1,
  'La búsqueda encuentra solo el incidente terminal y nunca el activo'
);

SELECT results_eq(
  $$SELECT game_id, room_id, cause_code, status, replay_available, total_count
    FROM public.list_admin_recovery_incidents_v2('manual_review', 'process_restart', 'pgtap-recovery-973', NULL, NULL, NULL, NULL, 26)$$,
  $$VALUES ('00000000-0000-4000-8000-000000000973'::uuid, 'pgtap-recovery-973'::text, 'process_restart'::text, 'manual_review'::text, false, 1::bigint)$$,
  'La RPC conserva el resumen terminal, informa replay y el total filtrado'
);

SET LOCAL ROLE postgres;

INSERT INTO auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at)
VALUES ('00000000-0000-4000-8000-000000000975', 'authenticated', 'authenticated', 'recovery-explorer-player@example.test', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, username, role)
VALUES ('00000000-0000-4000-8000-000000000975', 'recovery_explorer_player', 'player')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000975', true);

SELECT throws_ok(
  $$SELECT * FROM public.list_admin_recovery_incidents_v2(NULL, NULL, NULL, NULL, NULL, NULL, NULL, 26)$$,
  '42501',
  'Acceso denegado',
  'Un usuario autenticado no admin no puede invocar el resumen SECURITY DEFINER'
);

SET LOCAL ROLE postgres;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000971', true);

SELECT is(
  (SELECT total_count FROM public.list_admin_recovery_incidents_v2(
    NULL, NULL, 'pgtap-recovery', NULL, NULL,
    (SELECT detected_at FROM public.game_recovery_incidents WHERE game_id = '00000000-0000-4000-8000-000000000973'),
    '00000000-0000-4000-8000-000000000973',
    26
  ) LIMIT 1),
  2::bigint,
  'El cursor conserva el total filtrado antes de paginar'
);

SELECT * FROM finish();
ROLLBACK;
