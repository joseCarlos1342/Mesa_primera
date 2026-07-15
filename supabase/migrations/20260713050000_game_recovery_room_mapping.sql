-- La sala original desaparece al reiniciar el proceso. Persistimos la sala de
-- reemplazo en el incidente para que el detector no vuelva a crear otra.
ALTER TABLE public.game_recovery_incidents
  ADD COLUMN recovered_room_id TEXT,
  ADD COLUMN recovered_at TIMESTAMPTZ;

CREATE UNIQUE INDEX game_recovery_incidents_recovered_room_id_unique
  ON public.game_recovery_incidents (recovered_room_id)
  WHERE recovered_room_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.load_pending_game_recovery_checkpoints()
RETURNS TABLE (
  game_id UUID,
  room_id TEXT,
  checkpoint_version BIGINT,
  state_hash TEXT,
  private_state JSONB,
  roster_user_ids UUID[],
  recovery_deadline_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT checkpoint.game_id,
         checkpoint.room_id,
         checkpoint.checkpoint_version,
         checkpoint.state_hash,
         checkpoint.private_state,
          checkpoint.roster_user_ids,
          incident.recovery_deadline_at
  FROM public.game_recovery_checkpoints checkpoint
  INNER JOIN public.games game ON game.id = checkpoint.game_id
  LEFT JOIN public.game_recovery_incidents incident ON incident.game_id = checkpoint.game_id
  WHERE game.status = 'in_progress'
    AND (
      incident.id IS NULL
      OR (
        incident.status = 'recovery_pending'
        AND incident.recovered_room_id IS NULL
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.save_game_recovery_room_mapping(
  p_game_id UUID,
  p_original_room_id TEXT,
  p_recovered_room_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident public.game_recovery_incidents%ROWTYPE;
BEGIN
  IF p_original_room_id IS NULL OR length(trim(p_original_room_id)) = 0
     OR p_recovered_room_id IS NULL OR length(trim(p_recovered_room_id)) = 0 THEN
    RETURN jsonb_build_object('error', 'Los IDs de sala son obligatorios');
  END IF;

  SELECT * INTO v_incident
  FROM public.game_recovery_incidents
  WHERE game_id = p_game_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Incidente de recuperación no encontrado');
  END IF;

  IF v_incident.room_id <> trim(p_original_room_id) THEN
    RETURN jsonb_build_object('error', 'La sala original no coincide con el incidente');
  END IF;

  IF v_incident.status <> 'recovery_pending' THEN
    RETURN jsonb_build_object('error', 'El incidente ya fue resuelto');
  END IF;

  IF v_incident.recovered_room_id IS NOT NULL THEN
    IF v_incident.recovered_room_id = trim(p_recovered_room_id) THEN
      RETURN jsonb_build_object('success', true, 'already_mapped', true);
    END IF;
    RETURN jsonb_build_object('error', 'El incidente ya tiene una sala recuperada');
  END IF;

  UPDATE public.game_recovery_incidents
  SET recovered_room_id = trim(p_recovered_room_id),
      recovered_at = now()
  WHERE id = v_incident.id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.load_pending_game_recovery_checkpoints() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.load_pending_game_recovery_checkpoints() TO service_role;
REVOKE ALL ON FUNCTION public.save_game_recovery_room_mapping(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_game_recovery_room_mapping(UUID, TEXT, TEXT) TO service_role;
