-- Un refund marcado como completed sin ledger no es evidencia suficiente para cerrar.
CREATE OR REPLACE FUNCTION public.close_game_recovery_incident(
  p_incident_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_incident public.game_recovery_incidents%ROWTYPE;
  v_closed_at TIMESTAMPTZ;
  v_reason TEXT := trim(COALESCE(p_reason, ''));
BEGIN
  IF v_admin_id IS NULL OR NOT COALESCE((SELECT public.is_admin()), false) THEN
    RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501';
  END IF;
  IF p_incident_id IS NULL OR length(v_reason) NOT BETWEEN 10 AND 500 THEN
    RAISE EXCEPTION 'Motivo de cierre inválido' USING ERRCODE = '22023';
  END IF;

  SELECT incident.* INTO v_incident
  FROM public.game_recovery_incidents AS incident
  INNER JOIN public.games AS game ON game.id = incident.game_id
  WHERE incident.id = p_incident_id AND game.status = 'finished'
  FOR UPDATE OF incident;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Incidente no disponible para cierre' USING ERRCODE = 'P0002';
  END IF;
  IF v_incident.status = 'closed' THEN
    RETURN jsonb_build_object('success', true, 'incident_id', v_incident.id, 'closed_at', v_incident.closed_at, 'already_closed', true);
  END IF;
  IF v_incident.status <> 'manual_review' OR v_incident.acknowledged_at IS NULL THEN
    RAISE EXCEPTION 'El incidente requiere reconocimiento previo' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.game_recovery_refunds AS refund
    WHERE refund.incident_id = v_incident.id
      AND (refund.status <> 'completed' OR refund.ledger_id IS NULL)
  ) THEN
    RAISE EXCEPTION 'Todos los refunds deben estar completados y respaldados por ledger antes del cierre' USING ERRCODE = '23514';
  END IF;

  UPDATE public.game_recovery_incidents
  SET status = 'closed', closed_by = v_admin_id, closed_at = now(), close_reason = v_reason
  WHERE id = v_incident.id
  RETURNING closed_at INTO v_closed_at;

  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (v_admin_id, 'recovery_incident_closed', 'game_recovery_incident', v_incident.id::TEXT,
    jsonb_build_object('reason', v_reason, 'acknowledged_at', v_incident.acknowledged_at));

  RETURN jsonb_build_object('success', true, 'incident_id', v_incident.id, 'closed_at', v_closed_at, 'already_closed', false);
END;
$$;

REVOKE ALL ON FUNCTION public.close_game_recovery_incident(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_game_recovery_incident(UUID, TEXT) TO authenticated;
