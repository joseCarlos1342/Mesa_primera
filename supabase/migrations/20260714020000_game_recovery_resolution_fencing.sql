-- Un proceso puede renovar su propio claim para reintentar crear la sala;
-- un contendiente distinto debe esperar al vencimiento del lease.
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
      recovery_claim_fence = CASE
        WHEN recovery_claim_owner_id = p_owner_id
          AND recovery_claim_expires_at > now()
        THEN recovery_claim_fence
        ELSE recovery_claim_fence + 1
      END
  WHERE game_id = p_game_id
    AND status = 'recovery_pending'
    AND recovery_deadline_at > now()
    AND (
      recovery_claim_expires_at IS NULL
      OR recovery_claim_expires_at <= now()
      OR recovery_claim_owner_id = p_owner_id
    )
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

-- La sala que completa el roster debe probar que sigue siendo la publicación
-- vigente del incidente. Sin este fence una instancia stale podría reanudarlo.
DROP FUNCTION IF EXISTS public.resolve_game_recovery_incident(UUID);

CREATE FUNCTION public.resolve_game_recovery_incident(
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
DECLARE
  v_updated BOOLEAN := false;
BEGIN
  IF p_recovered_room_id IS NULL OR length(trim(p_recovered_room_id)) = 0
    OR p_owner_id IS NULL OR p_claim_fence IS NULL OR p_claim_fence <= 0 THEN
    RETURN jsonb_build_object('error', 'La sala recuperada, owner y fence son obligatorios');
  END IF;

  UPDATE public.game_recovery_incidents
  SET status = 'resumed',
      resolution_reason = 'roster_rejoined',
      resolved_at = now()
  WHERE game_id = p_game_id
    AND status = 'recovery_pending'
    AND recovery_deadline_at > now()
    AND recovered_room_id = trim(p_recovered_room_id)
    AND recovered_room_owner_id = p_owner_id
    AND recovered_room_fence = p_claim_fence
    AND recovered_room_lease_expires_at > now()
    AND recovery_claim_owner_id = p_owner_id
    AND recovery_claim_fence = p_claim_fence
    AND recovery_claim_expires_at > now()
  RETURNING true INTO v_updated;

  RETURN jsonb_build_object('success', true, 'updated', v_updated);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_game_recovery_incident(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_game_recovery_incident(UUID, UUID) TO service_role;
REVOKE ALL ON FUNCTION public.resolve_game_recovery_incident(UUID, TEXT, UUID, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_game_recovery_incident(UUID, TEXT, UUID, BIGINT) TO service_role;
