BEGIN;

SELECT plan(10);

SELECT has_function(
  'public',
  'renew_game_recovery_room_mapping_lease',
  ARRAY['uuid', 'text', 'uuid', 'bigint'],
  'La RPC de renovación del lease del mapping existe'
);

INSERT INTO public.tables (id, name, game_type)
VALUES ('00000000-0000-0000-0000-000000001101', 'Mesa fencing recovery', 'Mesa')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.games (id, table_id, status)
VALUES
  ('00000000-0000-0000-0000-000000001102', '00000000-0000-0000-0000-000000001101', 'in_progress'),
  ('00000000-0000-0000-0000-000000001103', '00000000-0000-0000-0000-000000001101', 'in_progress'),
  ('00000000-0000-0000-0000-000000001104', '00000000-0000-0000-0000-000000001101', 'in_progress')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

INSERT INTO public.game_recovery_incidents (
  game_id, room_id, detected_at, recovery_deadline_at, cause_code, status,
  recovered_room_id, recovered_room_owner_id, recovered_room_fence,
  recovered_room_lease_expires_at
) VALUES
  ('00000000-0000-0000-0000-000000001102', 'source-concurrent', now(), now() + interval '2 minutes', 'process_restart', 'recovery_pending', NULL, NULL, NULL, NULL),
  ('00000000-0000-0000-0000-000000001103', 'source-active', now(), now() + interval '2 minutes', 'process_restart', 'recovery_pending', 'active-recovery-room', '00000000-0000-0000-0000-000000001111', 7, now() + interval '30 seconds'),
  ('00000000-0000-0000-0000-000000001104', 'source-stale', now(), now() + interval '2 minutes', 'process_restart', 'recovery_pending', 'dead-recovery-room', '00000000-0000-0000-0000-000000001112', 9, now() - interval '1 second')
ON CONFLICT (game_id) DO UPDATE SET
  status = EXCLUDED.status,
  recovered_room_id = EXCLUDED.recovered_room_id,
  recovered_room_owner_id = EXCLUDED.recovered_room_owner_id,
  recovered_room_fence = EXCLUDED.recovered_room_fence,
  recovered_room_lease_expires_at = EXCLUDED.recovered_room_lease_expires_at,
  recovery_claim_owner_id = NULL,
  recovery_claim_expires_at = NULL,
  recovery_claim_fence = 0;

SELECT is(
  public.claim_game_recovery_incident('00000000-0000-0000-0000-000000001102', '00000000-0000-0000-0000-000000001121')->>'claimed',
  'true',
  'El primer contendiente obtiene el claim'
);

SELECT is(
  public.claim_game_recovery_incident('00000000-0000-0000-0000-000000001102', '00000000-0000-0000-0000-000000001121')->>'claimed',
  'true',
  'El owner renueva su propio claim para reintentar sin esperar su lease'
);

SELECT is(
  public.claim_game_recovery_incident('00000000-0000-0000-0000-000000001102', '00000000-0000-0000-0000-000000001121')->>'fence',
  '1',
  'La renovación propia conserva el fence de la sala pendiente'
);

SELECT is(
  public.claim_game_recovery_incident('00000000-0000-0000-0000-000000001102', '00000000-0000-0000-0000-000000001122')->>'claimed',
  'false',
  'El segundo contendiente no puede obtener el mismo claim vigente'
);

SELECT is(
  public.claim_game_recovery_incident('00000000-0000-0000-0000-000000001103', '00000000-0000-0000-0000-000000001123')->>'claimed',
  'false',
  'Un mapping con lease vigente no puede ser reclamado ni sobrescrito'
);

SELECT is(
  (SELECT recovered_room_id FROM public.game_recovery_incidents WHERE game_id = '00000000-0000-0000-0000-000000001103'),
  'active-recovery-room',
  'El claim rechazado conserva el mapping activo'
);

SELECT is(
  public.claim_game_recovery_incident('00000000-0000-0000-0000-000000001104', '00000000-0000-0000-0000-000000001124')->>'fence',
  '1',
  'Un mapping vencido se reclama con un fence nuevo'
);

SELECT is(
  public.save_game_recovery_room_mapping(
    '00000000-0000-0000-0000-000000001104',
    'source-stale',
    'replacement-after-second-crash',
    '00000000-0000-0000-0000-000000001124',
    1
  )->>'success',
  'true',
  'El owner con el fence vigente puede sustituir el mapping vencido'
);

SELECT is(
  (SELECT recovered_room_id FROM public.game_recovery_incidents WHERE game_id = '00000000-0000-0000-0000-000000001104'),
  'replacement-after-second-crash',
  'El mapping stale queda sustituido por la nueva sala'
);

SELECT * FROM finish();
ROLLBACK;
