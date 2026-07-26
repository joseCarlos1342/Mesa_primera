BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL ROLE postgres;
GRANT USAGE ON SCHEMA extensions TO PUBLIC;
SET LOCAL search_path = public, extensions;

SELECT plan(18);

SELECT ok(NOT has_function_privilege('anon', 'public.append_issue_ticket_message(uuid,text,boolean)', 'EXECUTE'), 'anon no puede publicar mensajes de consultas');
SELECT ok(NOT has_function_privilege('anon', 'public.close_issue_ticket(uuid)', 'EXECUTE'), 'anon no puede cerrar consultas');
SELECT ok(NOT has_function_privilege('anon', 'public.create_support_issue(text,text,text,text,timestamptz)', 'EXECUTE'), 'anon no puede crear consultas');
SELECT ok(NOT has_function_privilege('anon', 'public.enqueue_notification_outbox()', 'EXECUTE'), 'anon no puede invocar el trigger de outbox');
SELECT ok(NOT has_function_privilege('anon', 'public.get_admin_replay_detail(uuid)', 'EXECUTE'), 'anon no puede consultar detalle de replays admin');
SELECT ok(NOT has_function_privilege('anon', 'public.get_player_replay_detail(uuid)', 'EXECUTE'), 'anon no puede consultar detalle de replays');
SELECT ok(NOT has_function_privilege('anon', 'public.get_player_replays(uuid,integer,timestamptz,timestamptz)', 'EXECUTE'), 'anon no puede consultar historial de replays');
SELECT ok(NOT has_function_privilege('anon', 'public.get_player_replays_by_mesa(uuid,integer,timestamptz,timestamptz)', 'EXECUTE'), 'anon no puede consultar replays por mesa');
SELECT ok(NOT has_function_privilege('anon', 'public.get_player_replays_for_room(uuid,text,integer,timestamptz,timestamptz)', 'EXECUTE'), 'anon no puede consultar replays por sala');
SELECT ok(NOT has_function_privilege('anon', 'public.mark_game_recovery_incident_manual_review(uuid,text)', 'EXECUTE'), 'anon no puede marcar recovery manual');
SELECT ok(NOT has_function_privilege('anon', 'public.notify_financial_request_event()', 'EXECUTE'), 'anon no puede invocar triggers financieros');
SELECT ok(NOT has_function_privilege('anon', 'public.resolve_support_issue_adjustment(uuid,integer,text)', 'EXECUTE'), 'anon no puede ajustar consultas');
SELECT ok(NOT has_function_privilege('anon', 'public.save_game_recovery_checkpoint(uuid,text,bigint,text,jsonb,uuid[])', 'EXECUTE'), 'anon no puede guardar checkpoints de recovery');
SELECT ok(NOT has_function_privilege('anon', 'public.search_admin_replays(text)', 'EXECUTE'), 'anon no puede buscar replays admin');

SELECT ok(has_function_privilege('anon', 'public.check_phone_exists(text)', 'EXECUTE'), 'check_phone_exists permanece disponible para registro');
SELECT ok(has_function_privilege('anon', 'public.is_device_trusted(text,text)', 'EXECUTE'), 'is_device_trusted permanece disponible para login');
SELECT ok(has_function_privilege('anon', 'public.lookup_passkey_device(text,text)', 'EXECUTE'), 'lookup_passkey_device permanece disponible para passkeys');
SELECT ok(has_function_privilege('anon', 'public.user_has_pin(text)', 'EXECUTE'), 'user_has_pin permanece disponible para inicio de sesión');

SELECT * FROM finish();
ROLLBACK;
