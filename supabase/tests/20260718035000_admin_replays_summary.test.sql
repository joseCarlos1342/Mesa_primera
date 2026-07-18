BEGIN;

SELECT plan(6);

SELECT has_function('public', 'get_admin_replays_summary', ARRAY[]::text[], 'Existe el summary administrativo de replays');
SELECT ok(has_function_privilege('authenticated', 'public.get_admin_replays_summary()', 'EXECUTE'), 'authenticated puede invocar la RPC para que valide rol internamente');
SELECT ok(NOT has_function_privilege('anon', 'public.get_admin_replays_summary()', 'EXECUTE'), 'anon no puede invocar el summary');
SELECT ok(
  pg_get_functiondef('public.get_admin_replays_summary()'::regprocedure) LIKE '%public.is_admin()%'
  AND pg_get_functiondef('public.get_admin_replays_summary()'::regprocedure) LIKE '%game.status = ''finished''%',
  'La RPC exige admin y limita el universo a partidas terminadas'
);
SELECT ok(
  pg_get_functiondef('public.get_admin_replays_summary()'::regprocedure) LIKE '%COUNT(DISTINCT game_id)%'
  AND pg_get_functiondef('public.get_admin_replays_summary()'::regprocedure) LIKE '%ledger.status = ''completed''%',
  'La RPC deduplica partidas y solo suma rake completado'
);
SELECT ok(
  pg_get_functiondef('public.get_admin_replays_summary()'::regprocedure) LIKE '%jsonb_typeof(replay.players) = ''array''%'
  AND pg_get_functiondef('public.get_admin_replays_summary()'::regprocedure) NOT LIKE '%::uuid%',
  'La RPC tolera snapshots no array y userId no UUID'
);

SELECT * FROM finish();
ROLLBACK;
