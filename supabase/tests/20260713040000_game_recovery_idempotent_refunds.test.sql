BEGIN;

SELECT plan(11);

SELECT has_function(
  'public',
  'open_game_recovery_incident',
  ARRAY['uuid', 'text', 'timestamp with time zone', 'text'],
  'La RPC para abrir incidentes existe'
);

SELECT has_function(
  'public',
  'expire_game_recovery_incident',
  ARRAY['uuid', 'jsonb'],
  'La RPC transaccional de refunds existe'
);

SELECT ok(
  has_function_privilege('service_role', 'public.open_game_recovery_incident(uuid,text,timestamptz,text)', 'EXECUTE'),
  'service_role puede abrir incidentes de recuperación'
);

SELECT ok(
  NOT has_function_privilege('authenticated', 'public.expire_game_recovery_incident(uuid,jsonb)', 'EXECUTE'),
  'authenticated no puede ejecutar refunds de crash'
);

INSERT INTO auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000401', 'authenticated', 'authenticated', 'recovery-refund-player@example.test', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, username, role)
VALUES ('00000000-0000-0000-0000-000000000401', 'recovery_refund_player', 'player')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO public.tables (id, name, game_type)
VALUES ('00000000-0000-0000-0000-000000000402', 'Mesa recovery test', 'Mesa')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.games (id, table_id, status)
VALUES ('00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000402', 'in_progress')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.game_recovery_checkpoints (
  game_id, room_id, checkpoint_version, state_hash, private_state, roster_user_ids
) VALUES (
  '00000000-0000-0000-0000-000000000403',
  'recovery-test-room',
  1,
  'test-checkpoint-hash',
  '{}'::jsonb,
  ARRAY['00000000-0000-0000-0000-000000000401']::uuid[]
);

INSERT INTO public.ledger (
  user_id, game_id, type, direction, amount_cents,
  balance_before_cents, balance_after_cents, status, metadata
) VALUES (
  '00000000-0000-0000-0000-000000000401',
  '00000000-0000-0000-0000-000000000403',
  'bet', 'debit', 250000,
  500000, 250000, 'completed', '{}'::jsonb
);

SELECT is(
  public.open_game_recovery_incident(
    '00000000-0000-0000-0000-000000000403',
    'recovery-test-room',
    now() - interval '3 minutes',
    'process_restart'
  )->>'status',
  'recovery_pending',
  'Un incidente nuevo queda pendiente'
);

CREATE TEMP TABLE first_expiration AS
SELECT public.expire_game_recovery_incident(
  '00000000-0000-0000-0000-000000000403',
  jsonb_build_array(jsonb_build_object(
    'user_id', '00000000-0000-0000-0000-000000000401',
    'amount_cents', 250000,
    'operation_id', '00000000-0000-0000-0000-000000000404'
  ))
) AS data;

SELECT is(
  (SELECT data->>'status' FROM first_expiration),
  'cancelled_crash',
  'El incidente pendiente se cancela después del deadline'
);

SELECT is(
  (SELECT status FROM public.games WHERE id = '00000000-0000-0000-0000-000000000403'),
  'finished',
  'Cancelar por crash también termina la partida para el historial administrativo'
);

SELECT is(
  (SELECT count(*)::int FROM public.game_recovery_refunds WHERE operation_id = '00000000-0000-0000-0000-000000000404'),
  1,
  'La operación de refund queda registrada una sola vez'
);

SELECT is(
  (SELECT count(*)::int FROM public.ledger WHERE type = 'refund' AND metadata->>'operation_id' = '00000000-0000-0000-0000-000000000404'),
  1,
  'El crédito de ledger conserva la operation_id trazable'
);

SELECT is(
  public.expire_game_recovery_incident(
    '00000000-0000-0000-0000-000000000403',
    jsonb_build_array(jsonb_build_object(
      'user_id', '00000000-0000-0000-0000-000000000401',
      'amount_cents', 250000,
      'operation_id', '00000000-0000-0000-0000-000000000404'
    ))
  )->>'status',
  'cancelled_crash',
  'Reintentar una expiración resuelta no reabre el incidente'
);

SELECT is(
  (SELECT count(*)::int FROM public.ledger WHERE type = 'refund' AND metadata->>'operation_id' = '00000000-0000-0000-0000-000000000404'),
  1,
  'Reintentar no duplica el crédito de ledger'
);

SELECT * FROM finish();
ROLLBACK;
