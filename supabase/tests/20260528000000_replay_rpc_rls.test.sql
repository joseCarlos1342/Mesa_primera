BEGIN;

SELECT plan(10);

-- Regression fixture for replay RPC authorization.  The UUIDs are fixed so
-- failing pgTAP messages are easy to correlate with the test data.
INSERT INTO auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-00000000a001', 'authenticated', 'authenticated', 'admin-rls@example.test', now(), now(), now()),
  ('00000000-0000-0000-0000-00000000b001', 'authenticated', 'authenticated', 'player-one-rls@example.test', now(), now(), now()),
  ('00000000-0000-0000-0000-00000000b002', 'authenticated', 'authenticated', 'player-two-rls@example.test', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, username, role)
VALUES
  ('00000000-0000-0000-0000-00000000a001', 'admin_rls', 'admin'),
  ('00000000-0000-0000-0000-00000000b001', 'player_one_rls', 'player'),
  ('00000000-0000-0000-0000-00000000b002', 'player_two_rls', 'player')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO public.tables (id, name, game_type, created_by)
VALUES ('00000000-0000-0000-0000-00000000d001', 'Mesa RLS', 'primera_28', '00000000-0000-0000-0000-00000000a001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.games (id, table_id, status, started_at, finished_at)
VALUES (
  '00000000-0000-0000-0000-00000000c001',
  '00000000-0000-0000-0000-00000000d001',
  'finished',
  now() - interval '10 minutes',
  now() - interval '1 minute'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.game_participants (game_id, user_id, seat_number)
VALUES ('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-00000000b001', 1)
ON CONFLICT (game_id, user_id) DO NOTHING;

INSERT INTO public.game_rounds (id, game_id, round_number, status)
VALUES ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-00000000c001', 1, 'completed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.game_actions (id, round_id, game_id, user_id, action_type, amount)
VALUES (
  '00000000-0000-0000-0000-00000000f101',
  '00000000-0000-0000-0000-00000000f001',
  '00000000-0000-0000-0000-00000000c001',
  '00000000-0000-0000-0000-00000000b001',
  'bet',
  100
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.game_replays (
  id, game_id, round_number, players, timeline, pot_breakdown, final_hands,
  rng_seed, admin_timeline, room_id, table_name, created_at
)
VALUES (
  '00000000-0000-0000-0000-00000000e001',
  '00000000-0000-0000-0000-00000000c001',
  1,
  '[{"userId":"00000000-0000-0000-0000-00000000b001","nickname":"Player One"}]'::jsonb,
  '[]'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  'seed-rls',
  '[]'::jsonb,
  'room-rls',
  'Mesa RLS',
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ledger (
  id, user_id, game_id, type, direction, amount_cents,
  balance_before_cents, balance_after_cents, status, description
)
VALUES (
  '00000000-0000-0000-0000-00000000a101',
  '00000000-0000-0000-0000-00000000b001',
  '00000000-0000-0000-0000-00000000c001',
  'win',
  'credit',
  100,
  0,
  100,
  'completed',
  'Fixture RLS replay ledger'
)
ON CONFLICT (id) DO NOTHING;

SET LOCAL ROLE authenticated;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000b002', true);

SELECT throws_ok(
  $$ SELECT count(*) FROM public.get_player_replays('00000000-0000-0000-0000-00000000b001', 50) $$,
  '42501',
  'Acceso denegado',
  'Un jugador no puede listar replays de otro jugador'
);

SELECT throws_ok(
  $$ SELECT count(*) FROM public.get_player_replays_by_mesa('00000000-0000-0000-0000-00000000b001', 50) $$,
  '42501',
  'Acceso denegado',
  'Un jugador no puede listar mesas de replay de otro jugador'
);

SELECT throws_ok(
  $$ SELECT count(*) FROM public.get_player_replays_for_room('00000000-0000-0000-0000-00000000b001', 'room-rls', 100) $$,
  '42501',
  'Acceso denegado',
  'Un jugador no puede listar replays por sala de otro jugador'
);

SELECT throws_ok(
  $$ SELECT count(*) FROM public.get_admin_replays(50, 0) $$,
  '42501',
  'Acceso denegado',
  'Un jugador no puede ejecutar el listado admin de replays'
);

SELECT throws_ok(
  $$ SELECT count(*) FROM public.get_replay_ledger('00000000-0000-0000-0000-00000000c001') $$,
  '42501',
  'Acceso denegado',
  'Un jugador no puede ejecutar el ledger admin de replay'
);

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000b001', true);

SELECT is(
  (SELECT count(*)::int FROM public.get_player_replays('00000000-0000-0000-0000-00000000b001', 50)),
  1,
  'El jugador puede listar sus propios replays'
);

SELECT is(
  (SELECT count(*)::int FROM public.get_player_replays_by_mesa('00000000-0000-0000-0000-00000000b001', 50)),
  1,
  'El jugador puede agrupar sus propios replays por mesa'
);

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a001', true);

SELECT is(
  (SELECT count(*)::int FROM public.get_admin_replays(50, 0)),
  1,
  'El admin puede listar replays finalizados'
);

SELECT is(
  (SELECT count(*)::int FROM public.get_replay_ledger('00000000-0000-0000-0000-00000000c001')),
  1,
  'El admin puede ver ledger de replay finalizado'
);

SELECT is(
  (SELECT count(*)::int FROM public.game_rounds),
  0,
  'El admin sigue sin SELECT directo sobre game_rounds por Admin Blindness'
);

SELECT * FROM finish();
ROLLBACK;
