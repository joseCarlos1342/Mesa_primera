-- Un reinicio puede dejar una sala recuperada persistida pero inexistente. El
-- lease serializa la creación de su reemplazo entre procesos del game server.
ALTER TABLE public.game_recovery_incidents
  ADD COLUMN recovery_claim_owner_id UUID,
  ADD COLUMN recovery_claimed_at TIMESTAMPTZ,
  ADD COLUMN recovery_claim_expires_at TIMESTAMPTZ;

CREATE FUNCTION public.load_pending_game_recovery_checkpoints_v2()
RETURNS TABLE (
  game_id UUID,
  room_id TEXT,
  checkpoint_version BIGINT,
  state_hash TEXT,
  private_state JSONB,
  roster_user_ids UUID[],
  recovery_deadline_at TIMESTAMPTZ,
  recovered_room_id TEXT
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
         incident.recovery_deadline_at,
         incident.recovered_room_id
  FROM public.game_recovery_checkpoints checkpoint
  INNER JOIN public.games game ON game.id = checkpoint.game_id
  LEFT JOIN public.game_recovery_incidents incident ON incident.game_id = checkpoint.game_id
  WHERE game.status = 'in_progress'
    AND (incident.id IS NULL OR incident.status = 'recovery_pending');
$$;

CREATE FUNCTION public.claim_game_recovery_incident(
  p_game_id UUID,
  p_owner_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deadline TIMESTAMPTZ;
BEGIN
  IF p_owner_id IS NULL THEN
    RETURN jsonb_build_object('error', 'El owner del claim es obligatorio');
  END IF;

  UPDATE public.game_recovery_incidents
  SET recovery_claim_owner_id = p_owner_id,
      recovery_claimed_at = now(),
      recovery_claim_expires_at = now() + interval '30 seconds'
  WHERE game_id = p_game_id
    AND status = 'recovery_pending'
    AND recovery_deadline_at > now()
    AND recovered_room_id IS NULL
    AND (recovery_claim_expires_at IS NULL OR recovery_claim_expires_at <= now())
  RETURNING recovery_deadline_at INTO v_deadline;

  RETURN jsonb_build_object(
    'claimed', FOUND,
    'recovery_deadline_at', v_deadline
  );
END;
$$;

CREATE FUNCTION public.save_game_recovery_room_mapping(
  p_game_id UUID,
  p_original_room_id TEXT,
  p_recovered_room_id TEXT,
  p_owner_id UUID
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
     OR p_recovered_room_id IS NULL OR length(trim(p_recovered_room_id)) = 0
     OR p_owner_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Los IDs de sala y owner son obligatorios');
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

  IF v_incident.status <> 'recovery_pending' OR v_incident.recovery_deadline_at <= now() THEN
    RETURN jsonb_build_object('error', 'El incidente ya fue resuelto o expiró');
  END IF;

  IF v_incident.recovery_claim_owner_id IS DISTINCT FROM p_owner_id
     OR v_incident.recovery_claim_expires_at IS NULL
     OR v_incident.recovery_claim_expires_at <= now() THEN
    RETURN jsonb_build_object('error', 'El proceso no posee un claim vigente');
  END IF;

  UPDATE public.game_recovery_incidents
  SET recovered_room_id = trim(p_recovered_room_id),
      recovered_at = now()
  WHERE id = v_incident.id
    AND recovered_room_id IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'El incidente ya tiene una sala recuperada');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.save_game_recovery_room_mapping(UUID, TEXT, TEXT) FROM service_role;
REVOKE ALL ON FUNCTION public.load_pending_game_recovery_checkpoints_v2() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.load_pending_game_recovery_checkpoints_v2() TO service_role;
REVOKE ALL ON FUNCTION public.claim_game_recovery_incident(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_game_recovery_incident(UUID, UUID) TO service_role;
REVOKE ALL ON FUNCTION public.save_game_recovery_room_mapping(UUID, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_game_recovery_room_mapping(UUID, TEXT, TEXT, UUID) TO service_role;
