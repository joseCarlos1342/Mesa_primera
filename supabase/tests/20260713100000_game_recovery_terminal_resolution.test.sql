BEGIN;

SELECT plan(7);

SELECT has_function(
  'public',
  'mark_game_recovery_incident_manual_review',
  ARRAY['uuid', 'text'],
  'La RPC de revisión manual existe'
);

INSERT INTO public.tables (id, name, game_type)
VALUES ('00000000-0000-0000-0000-000000001002', 'Mesa cierre recovery', 'Mesa')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.games (id, table_id, status)
VALUES
  ('00000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000001002', 'in_progress'),
  ('00000000-0000-0000-0000-000000001004', '00000000-0000-0000-0000-000000001002', 'in_progress'),
  ('00000000-0000-0000-0000-000000001005', '00000000-0000-0000-0000-000000001002', 'in_progress')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

INSERT INTO public.game_recovery_incidents (
  game_id, room_id, detected_at, recovery_deadline_at, cause_code, status
) VALUES
  ('00000000-0000-0000-0000-000000001003', 'manual-review-room', now(), now() + interval '2 minutes', 'invalid_checkpoint', 'recovery_pending'),
  ('00000000-0000-0000-0000-000000001004', 'terminal-room', now(), now() + interval '2 minutes', 'process_restart', 'manual_review'),
  ('00000000-0000-0000-0000-000000001005', 'expired-room', now(), now() - interval '1 second', 'process_restart', 'recovery_pending')
ON CONFLICT (game_id) DO UPDATE SET status = EXCLUDED.status;

SELECT is(
  public.mark_game_recovery_incident_manual_review(
    '00000000-0000-0000-0000-000000001003',
    'checkpoint inválido'
  )->>'updated',
  'true',
  'La revisión manual confirma que cerró un incidente pending'
);

SELECT is(
  (SELECT status FROM public.games WHERE id = '00000000-0000-0000-0000-000000001003'),
  'finished',
  'La revisión manual termina la partida en la misma transacción'
);

SELECT is(
  public.resolve_game_recovery_incident('00000000-0000-0000-0000-000000001004', 'terminal-recovery-room', '00000000-0000-0000-0000-000000001014', 1)->>'updated',
  'false',
  'Resolver un incidente ya terminal informa que no lo actualizó'
);

SELECT is(
  (SELECT status FROM public.game_recovery_incidents WHERE game_id = '00000000-0000-0000-0000-000000001004'),
  'manual_review',
  'Resolver no reabre un incidente terminal como pending'
);

SELECT is(
  public.resolve_game_recovery_incident('00000000-0000-0000-0000-000000001005', 'expired-recovery-room', '00000000-0000-0000-0000-000000001015', 1)->>'updated',
  'false',
  'Un rejoin después del deadline no reanuda el incidente'
);

SELECT is(
  (SELECT status FROM public.game_recovery_incidents WHERE game_id = '00000000-0000-0000-0000-000000001005'),
  'recovery_pending',
  'Un rejoin tardío deja el incidente pendiente para su cancelación controlada'
);

SELECT * FROM finish();
ROLLBACK;
