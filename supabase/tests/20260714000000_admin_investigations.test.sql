BEGIN;

SELECT plan(24);

SELECT has_function('public', 'create_admin_investigation', ARRAY['text','text','text','text','text','uuid[]','uuid','text','jsonb'], 'Existe la RPC de creación');
SELECT has_function('public', 'start_admin_investigation', ARRAY['uuid'], 'Existe la RPC de inicio');
SELECT has_function('public', 'resolve_admin_investigation', ARRAY['uuid','text','text'], 'Existe la RPC de resolución');
SELECT has_function('public', 'propose_admin_investigation_compensation', ARRAY['uuid','uuid','integer','text'], 'Existe la RPC de propuesta');
SELECT has_function('public', 'cancel_admin_investigation_compensation', ARRAY['uuid','text'], 'Existe la RPC de cancelación');
SELECT has_function('public', 'approve_admin_investigation_compensation', ARRAY['uuid'], 'Existe la RPC de acreditación');

SELECT ok(NOT has_function_privilege('anon', 'public.approve_admin_investigation_compensation(uuid)', 'EXECUTE'), 'anon no acredita compensaciones');
SELECT ok(has_function_privilege('authenticated', 'public.approve_admin_investigation_compensation(uuid)', 'EXECUTE'), 'authenticated puede invocar el wrapper protegido');

INSERT INTO auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000001401', 'authenticated', 'authenticated', 'investigation-admin@example.test', now(), now(), now()),
  ('00000000-0000-0000-0000-000000001402', 'authenticated', 'authenticated', 'investigation-player@example.test', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, username, role)
VALUES
  ('00000000-0000-0000-0000-000000001401', 'investigation_admin', 'admin'),
  ('00000000-0000-0000-0000-000000001402', 'investigation_player', 'player')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO public.tables (id, name, game_type)
VALUES ('00000000-0000-0000-0000-000000001403', 'Mesa investigación', 'Mesa')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.games (id, table_id, status)
VALUES ('00000000-0000-0000-0000-000000001404', '00000000-0000-0000-0000-000000001403', 'in_progress')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

INSERT INTO public.server_alerts (id, severity, category, title, game_id, room_id)
VALUES ('00000000-0000-4000-8000-000000001405', 'critical', 'collusion', 'Alerta histórica', '00000000-0000-0000-0000-000000001404', 'room-investigation')
ON CONFLICT (id) DO UPDATE SET game_id = EXCLUDED.game_id;

INSERT INTO public.server_alerts (id, severity, category, title, game_id, room_id)
VALUES ('00000000-0000-4000-8000-000000001406', 'critical', 'collusion', 'Alerta sin partida', NULL, 'active-room-without-history')
ON CONFLICT (id) DO UPDATE SET game_id = NULL, room_id = EXCLUDED.room_id;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000001401', true);

SELECT is(
  public.create_admin_investigation(
    'game_integrity', 'Partida activa', 'No debe exponer una partida activa', 'high', 'manual',
    ARRAY['00000000-0000-0000-0000-000000001402']::uuid[],
    '00000000-0000-0000-0000-000000001404', NULL, '[]'::jsonb
  )->>'error',
  'La partida debe haber terminado',
  'Admin Blindness impide vincular una partida activa'
);

SELECT is(
  public.create_admin_investigation(
    'collusion', 'Alerta activa', 'No debe copiar referencias de una partida activa', 'critical', 'server_alert',
    ARRAY['00000000-0000-0000-0000-000000001402']::uuid[], NULL, NULL,
    '[{"entity":"alert","entity_id":"00000000-0000-4000-8000-000000001405","label":"Etiqueta no confiable"}]'::jsonb
  )->>'error',
  'La evidencia pertenece a una partida activa',
  'Admin Blindness también valida el origen real de cada evidencia'
);

SELECT is(
  public.create_admin_investigation(
    'collusion', 'Alerta de sala activa', 'No existe una partida histórica que respalde esta alerta', 'critical', 'server_alert',
    ARRAY['00000000-0000-0000-0000-000000001402']::uuid[], NULL, NULL,
    '[{"entity":"alert","entity_id":"00000000-0000-4000-8000-000000001406","label":"Alerta de sala"}]'::jsonb
  )->>'error',
  'No se puede demostrar que la alerta sea histórica',
  'Una alerta con room_id pero sin partida histórica se rechaza de forma conservadora'
);

RESET ROLE;
UPDATE public.games SET status = 'finished' WHERE id = '00000000-0000-0000-0000-000000001404';
SET LOCAL ROLE authenticated;

CREATE TEMP TABLE created_investigation AS
SELECT public.create_admin_investigation(
  'collusion', 'Patrón coordinado', 'Dos jugadores repiten decisiones coordinadas', 'critical', 'server_alert',
  ARRAY['00000000-0000-0000-0000-000000001402']::uuid[],
  '00000000-0000-0000-0000-000000001404', 'room-investigation',
  '[{"entity":"alert","entity_id":"00000000-0000-4000-8000-000000001405","label":"Alerta histórica"}]'::jsonb
) AS data;

SELECT is((SELECT data->>'status' FROM created_investigation), 'open', 'La investigación nace abierta');
SELECT is(
  (SELECT evidence_snapshot->0->>'label' FROM public.admin_dispute_cases WHERE id = ((SELECT data->>'id' FROM created_investigation))::uuid),
  'Alerta histórica verificada',
  'La base reconstruye la etiqueta y no confía en el texto recibido'
);

CREATE TEMP TABLE started_investigation AS
SELECT public.start_admin_investigation(((SELECT data->>'id' FROM created_investigation))::uuid) AS data;

SELECT is((SELECT data->>'status' FROM started_investigation), 'investigating', 'El admin inicia su propia investigación');

CREATE TEMP TABLE proposed_compensation AS
SELECT public.propose_admin_investigation_compensation(
  ((SELECT data->>'id' FROM created_investigation))::uuid,
  '00000000-0000-0000-0000-000000001402',
  100000,
  'Compensación por una mano anulada tras confirmar colusión'
) AS data;

SELECT is((SELECT data->>'compensation_status' FROM proposed_compensation), 'proposed', 'La propuesta no acredita todavía');
SELECT is((SELECT count(*)::int FROM public.ledger WHERE metadata->>'operation_kind' = 'admin_investigation_compensation'), 0, 'Proponer no modifica el ledger');

SELECT is(
  public.cancel_admin_investigation_compensation(
    ((SELECT data->>'id' FROM created_investigation))::uuid,
    'Se seleccionó un beneficiario incorrecto durante la revisión'
  )->>'compensation_status',
  NULL,
  'Una propuesta equivocada puede cancelarse sin bloquear el expediente'
);

SELECT is(
  public.propose_admin_investigation_compensation(
    ((SELECT data->>'id' FROM created_investigation))::uuid,
    '00000000-0000-0000-0000-000000001402',
    100000,
    'Compensación corregida por una mano anulada tras confirmar colusión'
  )->>'compensation_status',
  'proposed',
  'Después de cancelar puede registrarse una propuesta corregida'
);

CREATE TEMP TABLE approved_compensation AS
SELECT public.approve_admin_investigation_compensation(((SELECT data->>'id' FROM created_investigation))::uuid) AS data;

SELECT is((SELECT data->>'status' FROM approved_compensation), 'resolved', 'Aprobar acredita y resuelve atómicamente');
SELECT is((SELECT count(*)::int FROM public.ledger WHERE metadata->>'operation_kind' = 'admin_investigation_compensation'), 1, 'La acreditación crea un solo movimiento');

SELECT is(
  public.approve_admin_investigation_compensation(((SELECT data->>'id' FROM created_investigation))::uuid)->>'ledger_id',
  (SELECT data->>'ledger_id' FROM approved_compensation),
  'Reintentar devuelve el mismo ledger sin duplicarlo'
);

SELECT is((SELECT count(*)::int FROM public.admin_dispute_case_events WHERE case_id = ((SELECT data->>'id' FROM created_investigation))::uuid), 6, 'El expediente conserva apertura, inicio, propuestas, cancelación y resolución');

CREATE TEMP TABLE conflicting_investigation AS
SELECT public.create_admin_investigation(
  'fraud', 'Operación conflictiva', 'Valida que una operation_id no pueda enlazarse a otro monto', 'high', 'manual',
  ARRAY['00000000-0000-0000-0000-000000001402']::uuid[], NULL, NULL, '[]'::jsonb
) AS data;

DO $$
BEGIN
  PERFORM public.start_admin_investigation(((SELECT data->>'id' FROM conflicting_investigation))::uuid);
  PERFORM public.propose_admin_investigation_compensation(
    ((SELECT data->>'id' FROM conflicting_investigation))::uuid,
    '00000000-0000-0000-0000-000000001402', 100000,
    'Compensación que debe detectar una entrada incompatible'
  );
END;
$$;

RESET ROLE;
INSERT INTO public.ledger (
  user_id, type, direction, amount_cents, balance_before_cents, balance_after_cents,
  description, reference_id, status, metadata
)
SELECT
  '00000000-0000-0000-0000-000000001402', 'adjustment', 'credit', 200000, 100000, 300000,
  'Entrada incompatible', 'referencia-incorrecta', 'completed',
  jsonb_build_object(
    'operation_kind', 'admin_investigation_compensation',
    'operation_id', compensation_operation_id,
    'investigation_id', id
  )
FROM public.admin_dispute_cases
WHERE id = ((SELECT data->>'id' FROM conflicting_investigation))::uuid;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000001401', true);

SELECT throws_ok(
  format('SELECT public.approve_admin_investigation_compensation(%L::uuid)', (SELECT data->>'id' FROM conflicting_investigation)),
  '23505',
  'La operación idempotente no coincide con la compensación',
  'Una entrada reutilizada debe coincidir en todos sus atributos financieros'
);

SELECT is(
  (SELECT status FROM public.admin_dispute_cases WHERE id = ((SELECT data->>'id' FROM conflicting_investigation))::uuid),
  'investigating',
  'Un conflicto idempotente no cierra la investigación'
);

SELECT * FROM finish();
ROLLBACK;
