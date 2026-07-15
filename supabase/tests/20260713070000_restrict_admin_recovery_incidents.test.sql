BEGIN;

SELECT plan(3);

INSERT INTO auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000701', 'authenticated', 'authenticated',
  'recovery-incidents-admin@example.test', now(), now(), now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, username, role)
VALUES ('00000000-0000-0000-0000-000000000701', 'recovery_incidents_admin', 'admin')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO public.tables (id, name, game_type)
VALUES ('00000000-0000-0000-0000-000000000702', 'Mesa incidentes recovery', 'Mesa')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.games (id, table_id, status)
VALUES ('00000000-0000-0000-0000-000000000703', '00000000-0000-0000-0000-000000000702', 'in_progress')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

INSERT INTO public.game_recovery_incidents (
  game_id, room_id, detected_at, recovery_deadline_at, cause_code, status
) VALUES (
  '00000000-0000-0000-0000-000000000703',
  'admin-blindness-recovery-room',
  now() - interval '3 minutes',
  now() - interval '1 minute',
  'process_restart',
  'manual_review'
) ON CONFLICT (game_id) DO UPDATE SET status = EXCLUDED.status;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000701', true);

SELECT is(
  (SELECT count(*)::int FROM public.game_recovery_incidents WHERE game_id = '00000000-0000-0000-0000-000000000703'),
  0,
  'Un admin no lee incidentes de una partida in_progress aunque estén en revisión manual'
);

RESET ROLE;
UPDATE public.games SET status = 'finished' WHERE id = '00000000-0000-0000-0000-000000000703';
UPDATE public.game_recovery_incidents SET status = 'resumed' WHERE game_id = '00000000-0000-0000-0000-000000000703';

SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.game_recovery_incidents WHERE game_id = '00000000-0000-0000-0000-000000000703'),
  0,
  'Un admin no lee incidentes resumed aunque la partida ya sea terminal'
);

RESET ROLE;
UPDATE public.game_recovery_incidents SET status = 'cancelled_crash' WHERE game_id = '00000000-0000-0000-0000-000000000703';

SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.game_recovery_incidents WHERE game_id = '00000000-0000-0000-0000-000000000703'),
  1,
  'Un admin puede leer un incidente cancelado de una partida terminal'
);

SELECT * FROM finish();
ROLLBACK;
