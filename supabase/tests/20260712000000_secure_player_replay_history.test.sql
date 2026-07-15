BEGIN;

SELECT plan(5);

INSERT INTO auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-00000000b101', 'authenticated', 'authenticated',
  'replay-history-player@example.test', now(), now(), now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, username, role)
VALUES ('00000000-0000-0000-0000-00000000b101', 'replay_history_player', 'player')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO public.tables (id, name, game_type, created_by)
VALUES ('00000000-0000-0000-0000-00000000d101', 'Mesa Historial', 'primera_28', '00000000-0000-0000-0000-00000000b101')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.games (id, table_id, status, started_at, finished_at)
VALUES ('00000000-0000-0000-0000-00000000c101', '00000000-0000-0000-0000-00000000d101', 'finished', now() - interval '91 days', now() - interval '90 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.game_replays (id, game_id, round_number, players, timeline, pot_breakdown, final_hands, rng_seed, admin_timeline, created_at)
VALUES (
  '00000000-0000-0000-0000-00000000e101', '00000000-0000-0000-0000-00000000c101', 1,
  '[{"userId":"00000000-0000-0000-0000-00000000b101","nickname":"Yo","cards":"1O,2O"},{"userId":"00000000-0000-0000-0000-00000000b102","nickname":"Otro","cards":"7E,6E"}]'::jsonb,
  '[{"event":"action","droppedCards":["7E"],"rng_state":"private"}]'::jsonb,
  '{}'::jsonb,
  '{"00000000-0000-0000-0000-00000000b101":{"cards":"1O,2O"},"00000000-0000-0000-0000-00000000b102":{"cards":"7E,6E"}}'::jsonb,
  'private-seed', '[{"rng_state":"private"}]'::jsonb, now() - interval '90 days'
) ON CONFLICT (id) DO NOTHING;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000b101', true);

SELECT throws_ok(
  $$ SELECT * FROM public.game_replays WHERE game_id = '00000000-0000-0000-0000-00000000c101' $$,
  '42501', NULL,
  'Un player no puede seleccionar la fila cruda del replay'
);

SELECT is(
  (SELECT count(*)::int FROM public.get_player_replays('00000000-0000-0000-0000-00000000b101', 100, NULL, NULL)),
  1,
  'El historial player incluye replays sin limite de siete dias'
);

SELECT is(
  (SELECT NOT EXISTS (SELECT 1 FROM jsonb_array_elements(players) AS player WHERE player ? 'cards') FROM public.get_player_replay_detail('00000000-0000-0000-0000-00000000c101')),
  false,
  'El detalle player no devuelve cartas privadas en la lista de jugadores'
);

SELECT is(
  (SELECT final_hands ? '00000000-0000-0000-0000-00000000b102' FROM public.get_player_replay_detail('00000000-0000-0000-0000-00000000c101')),
  false,
  'El detalle player no devuelve final_hands ajenas'
);

SELECT is(
  (SELECT timeline::text LIKE '%rng_state%' OR timeline::text LIKE '%droppedCards%' FROM public.get_player_replay_detail('00000000-0000-0000-0000-00000000c101')),
  false,
  'El detalle player elimina pistas de cartas y estado RNG'
);

SELECT * FROM finish();
ROLLBACK;
