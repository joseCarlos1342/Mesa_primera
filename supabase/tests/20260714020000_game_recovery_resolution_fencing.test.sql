BEGIN;

SELECT plan(5);

SELECT has_function(
  'public',
  'resolve_game_recovery_incident',
  ARRAY['uuid', 'text', 'uuid', 'bigint'],
  'La resolución fenced exige sala, owner y fence'
);

INSERT INTO public.tables (id, name, game_type)
VALUES ('00000000-0000-0000-0000-000000001201', 'Mesa resolución fencing recovery', 'Mesa')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.games (id, table_id, status)
VALUES
  ('00000000-0000-0000-0000-000000001202', '00000000-0000-0000-0000-000000001201', 'in_progress'),
  ('00000000-0000-0000-0000-000000001203', '00000000-0000-0000-0000-000000001201', 'in_progress')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

INSERT INTO public.game_recovery_incidents (
  game_id, room_id, detected_at, recovery_deadline_at, cause_code, status,
  recovery_claim_owner_id, recovery_claim_expires_at, recovery_claim_fence,
  recovered_room_id, recovered_room_owner_id, recovered_room_fence,
  recovered_room_lease_expires_at
) VALUES
  ('00000000-0000-0000-0000-000000001202', 'source-stale', now(), now() + interval '2 minutes', 'process_restart', 'recovery_pending', '00000000-0000-0000-0000-000000001221', now() + interval '30 seconds', 5, 'stale-recovery-room', '00000000-0000-0000-0000-000000001221', 5, now() - interval '1 second'),
  ('00000000-0000-0000-0000-000000001203', 'source-active', now(), now() + interval '2 minutes', 'process_restart', 'recovery_pending', '00000000-0000-0000-0000-000000001222', now() + interval '30 seconds', 6, 'active-recovery-room', '00000000-0000-0000-0000-000000001222', 6, now() + interval '30 seconds')
ON CONFLICT (game_id) DO UPDATE SET
  status = EXCLUDED.status,
  recovery_deadline_at = EXCLUDED.recovery_deadline_at,
  recovery_claim_owner_id = EXCLUDED.recovery_claim_owner_id,
  recovery_claim_expires_at = EXCLUDED.recovery_claim_expires_at,
  recovery_claim_fence = EXCLUDED.recovery_claim_fence,
  recovered_room_id = EXCLUDED.recovered_room_id,
  recovered_room_owner_id = EXCLUDED.recovered_room_owner_id,
  recovered_room_fence = EXCLUDED.recovered_room_fence,
  recovered_room_lease_expires_at = EXCLUDED.recovered_room_lease_expires_at;

SELECT is(
  public.resolve_game_recovery_incident('00000000-0000-0000-0000-000000001202', 'stale-recovery-room', '00000000-0000-0000-0000-000000001221', 5)->>'updated',
  'false',
  'Una sala con lease vencido no puede marcar resumed'
);

SELECT is(
  public.resolve_game_recovery_incident('00000000-0000-0000-0000-000000001203', 'active-recovery-room', '00000000-0000-0000-0000-000000001223', 6)->>'updated',
  'false',
  'Un owner distinto no puede marcar resumed'
);

SELECT is(
  public.resolve_game_recovery_incident('00000000-0000-0000-0000-000000001203', 'active-recovery-room', '00000000-0000-0000-0000-000000001222', 6)->>'updated',
  'true',
  'La sala, owner y fence vigentes pueden marcar resumed'
);

SELECT is(
  (SELECT status FROM public.game_recovery_incidents WHERE game_id = '00000000-0000-0000-0000-000000001203'),
  'resumed',
  'Solo la resolución fenced cambia el incidente a resumed'
);

SELECT * FROM finish();
ROLLBACK;
