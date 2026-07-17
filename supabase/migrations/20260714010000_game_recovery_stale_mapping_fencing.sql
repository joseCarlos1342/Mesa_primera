-- El mapping de una sala recuperada es un lease: una instancia viva lo renueva
-- y un proceso nuevo solo puede reemplazarlo tras vencimiento y con un fence.
ALTER TABLE public.game_recovery_incidents
  ADD COLUMN recovery_claim_fence BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN recovered_room_owner_id UUID,
  ADD COLUMN recovered_room_fence BIGINT,
  ADD COLUMN recovered_room_lease_expires_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.claim_game_recovery_incident(
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
  v_fence BIGINT;
BEGIN
  IF p_owner_id IS NULL THEN
    RETURN jsonb_build_object('error', 'El owner del claim es obligatorio');
  END IF;

  UPDATE public.game_recovery_incidents
  SET recovery_claim_owner_id = p_owner_id,
      recovery_claimed_at = now(),
      recovery_claim_expires_at = now() + interval '30 seconds',
      recovery_claim_fence = recovery_claim_fence + 1
  WHERE game_id = p_game_id
    AND status = 'recovery_pending'
    AND recovery_deadline_at > now()
    AND (recovery_claim_expires_at IS NULL OR recovery_claim_expires_at <= now())
    AND (
      recovered_room_id IS NULL
      OR (
        recovered_room_lease_expires_at IS NOT NULL
        AND recovered_room_lease_expires_at <= now()
      )
    )
  RETURNING recovery_deadline_at, recovery_claim_fence INTO v_deadline, v_fence;

  RETURN jsonb_build_object(
    'claimed', FOUND,
    'recovery_deadline_at', v_deadline,
    'fence', v_fence
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.save_game_recovery_room_mapping(
  p_game_id UUID,
  p_original_room_id TEXT,
  p_recovered_room_id TEXT,
  p_owner_id UUID,
  p_claim_fence BIGINT
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
     OR p_owner_id IS NULL OR p_claim_fence IS NULL OR p_claim_fence <= 0 THEN
    RETURN jsonb_build_object('error', 'Los IDs, owner y fence son obligatorios');
  END IF;

  SELECT * INTO v_incident
  FROM public.game_recovery_incidents
  WHERE game_id = p_game_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Incidente de recuperación no encontrado');
  END IF;

  IF v_incident.room_id <> trim(p_original_room_id)
     OR v_incident.status <> 'recovery_pending'
     OR v_incident.recovery_deadline_at <= now() THEN
    RETURN jsonb_build_object('error', 'El incidente no admite un mapping de recuperación');
  END IF;

  IF v_incident.recovery_claim_owner_id IS DISTINCT FROM p_owner_id
     OR v_incident.recovery_claim_fence <> p_claim_fence
     OR v_incident.recovery_claim_expires_at IS NULL
     OR v_incident.recovery_claim_expires_at <= now() THEN
    RETURN jsonb_build_object('error', 'El proceso no posee un claim vigente con este fence');
  END IF;

  IF v_incident.recovered_room_id IS NOT NULL
     AND (
       v_incident.recovered_room_lease_expires_at IS NULL
       OR v_incident.recovered_room_lease_expires_at > now()
     ) THEN
    IF v_incident.recovered_room_id = trim(p_recovered_room_id)
       AND v_incident.recovered_room_owner_id = p_owner_id
       AND v_incident.recovered_room_fence = p_claim_fence THEN
      RETURN jsonb_build_object('success', true, 'already_mapped', true);
    END IF;
    RETURN jsonb_build_object('error', 'El incidente tiene una sala recuperada activa');
  END IF;

  UPDATE public.game_recovery_incidents
  SET recovered_room_id = trim(p_recovered_room_id),
      recovered_room_owner_id = p_owner_id,
      recovered_room_fence = p_claim_fence,
      recovered_room_lease_expires_at = now() + interval '30 seconds',
      recovered_at = now()
  WHERE id = v_incident.id;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE FUNCTION public.renew_game_recovery_room_mapping_lease(
  p_game_id UUID,
  p_recovered_room_id TEXT,
  p_owner_id UUID,
  p_claim_fence BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.game_recovery_incidents
  SET recovery_claim_expires_at = now() + interval '30 seconds',
      recovered_room_lease_expires_at = now() + interval '30 seconds'
  WHERE game_id = p_game_id
    AND status = 'recovery_pending'
    AND recovery_deadline_at > now()
    AND recovered_room_id = trim(p_recovered_room_id)
    AND recovered_room_owner_id = p_owner_id
    AND recovered_room_fence = p_claim_fence
    AND recovery_claim_owner_id = p_owner_id
    AND recovery_claim_fence = p_claim_fence
    AND recovery_claim_expires_at > now()
    AND recovered_room_lease_expires_at > now();

  RETURN jsonb_build_object('renewed', FOUND);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_game_recovery_incident(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_game_recovery_incident(UUID, UUID) TO service_role;
-- Los procesos anteriores no pueden crear mappings sin lease ni fencing.
REVOKE ALL ON FUNCTION public.save_game_recovery_room_mapping(UUID, TEXT, TEXT, UUID) FROM service_role;
REVOKE ALL ON FUNCTION public.save_game_recovery_room_mapping(UUID, TEXT, TEXT, UUID, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_game_recovery_room_mapping(UUID, TEXT, TEXT, UUID, BIGINT) TO service_role;
REVOKE ALL ON FUNCTION public.renew_game_recovery_room_mapping_lease(UUID, TEXT, UUID, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.renew_game_recovery_room_mapping_lease(UUID, TEXT, UUID, BIGINT) TO service_role;
