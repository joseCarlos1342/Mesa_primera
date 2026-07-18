-- Operaciones administrativas sobre recovery solo después del cierre del juego.
-- No expone checkpoints, roster, operation_id ni metadata privada.

ALTER TABLE public.game_recovery_incidents
  ADD COLUMN closed_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD COLUMN closed_at TIMESTAMPTZ,
  ADD COLUMN close_reason TEXT;

ALTER TABLE public.game_recovery_incidents
  DROP CONSTRAINT IF EXISTS game_recovery_incidents_status_check,
  ADD CONSTRAINT game_recovery_incidents_status_check
    CHECK (status IN ('recovery_pending', 'resumed', 'cancelled_crash', 'manual_review', 'closed')),
  ADD CONSTRAINT game_recovery_incident_closure_consistency CHECK (
    (closed_by IS NULL AND closed_at IS NULL AND close_reason IS NULL)
    OR (closed_by IS NOT NULL AND closed_at IS NOT NULL AND length(trim(close_reason)) BETWEEN 10 AND 500)
  );

ALTER TABLE public.server_alerts ADD COLUMN dedupe_key TEXT;
CREATE UNIQUE INDEX server_alerts_dedupe_key_unique
  ON public.server_alerts (dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.list_admin_recovery_refunds(p_game_id UUID)
RETURNS TABLE (
  refund_id UUID,
  user_id UUID,
  amount_cents INTEGER,
  status TEXT,
  ledger_id UUID,
  completed_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT refund.id, refund.user_id, refund.amount_cents, refund.status, refund.ledger_id, refund.completed_at
  FROM public.game_recovery_refunds AS refund
  INNER JOIN public.game_recovery_incidents AS incident ON incident.id = refund.incident_id
  INNER JOIN public.games AS game ON game.id = incident.game_id
  WHERE incident.game_id = p_game_id
    AND incident.status IN ('cancelled_crash', 'manual_review', 'closed')
    AND game.status = 'finished'
    AND COALESCE((SELECT public.is_admin()), false)
  ORDER BY refund.created_at ASC, refund.id ASC;
$$;

CREATE OR REPLACE FUNCTION public.list_admin_recovery_incidents_export(
  p_status TEXT DEFAULT NULL,
  p_cause_code TEXT DEFAULT NULL,
  p_query TEXT DEFAULT NULL,
  p_detected_from DATE DEFAULT NULL,
  p_detected_to DATE DEFAULT NULL
)
RETURNS TABLE (
  room_id TEXT,
  game_id UUID,
  cause_code TEXT,
  status TEXT,
  resolution_reason TEXT,
  refunds_completed_count BIGINT,
  refunds_total_count BIGINT,
  detected_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT COALESCE((SELECT public.is_admin()), false) THEN
    RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT incident.room_id, incident.game_id, incident.cause_code, incident.status, incident.resolution_reason,
    COUNT(refund.id) FILTER (WHERE refund.status = 'completed'), COUNT(refund.id), incident.detected_at, incident.resolved_at
  FROM public.game_recovery_incidents AS incident
  INNER JOIN public.games AS game ON game.id = incident.game_id
  LEFT JOIN public.game_recovery_refunds AS refund ON refund.incident_id = incident.id
  WHERE incident.status IN ('cancelled_crash', 'manual_review', 'closed')
    AND game.status = 'finished'
    AND (p_status IS NULL OR incident.status = p_status)
    AND (p_cause_code IS NULL OR incident.cause_code = p_cause_code)
    AND (p_query IS NULL OR incident.room_id ILIKE p_query || '%' OR incident.game_id::TEXT = p_query)
    AND (p_detected_from IS NULL OR incident.detected_at >= (p_detected_from::TIMESTAMP AT TIME ZONE 'America/Bogota'))
    AND (p_detected_to IS NULL OR incident.detected_at < ((p_detected_to + 1)::TIMESTAMP AT TIME ZONE 'America/Bogota'))
  GROUP BY incident.id, incident.room_id, incident.game_id, incident.cause_code, incident.status,
    incident.resolution_reason, incident.detected_at, incident.resolved_at
  ORDER BY incident.detected_at DESC, incident.game_id DESC
  LIMIT 5001;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_admin_recovery_incidents_v2(
  p_status TEXT DEFAULT NULL,
  p_cause_code TEXT DEFAULT NULL,
  p_query TEXT DEFAULT NULL,
  p_detected_from DATE DEFAULT NULL,
  p_detected_to DATE DEFAULT NULL,
  p_cursor_detected_at TIMESTAMPTZ DEFAULT NULL,
  p_cursor_game_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 26
)
RETURNS TABLE (
  game_id UUID, room_id TEXT, cause_code TEXT, detected_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ, status TEXT, resolution_reason TEXT,
  refunds_completed_count BIGINT, refunds_total_count BIGINT,
  replay_available BOOLEAN, total_count BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 26), 1), 101);
BEGIN
  IF NOT COALESCE((SELECT public.is_admin()), false) THEN RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501'; END IF;
  IF (p_cursor_detected_at IS NULL) <> (p_cursor_game_id IS NULL) THEN RAISE EXCEPTION 'Cursor inválido' USING ERRCODE = '22023'; END IF;
  RETURN QUERY
  WITH summarized AS (
    SELECT incident.game_id, incident.room_id, incident.cause_code, incident.detected_at, incident.resolved_at,
      incident.status, incident.resolution_reason,
      COUNT(refund.id) FILTER (WHERE refund.status = 'completed') AS refunds_completed_count,
      COUNT(refund.id) AS refunds_total_count,
      EXISTS (SELECT 1 FROM public.game_replays AS replay WHERE replay.game_id = incident.game_id) AS replay_available
    FROM public.game_recovery_incidents AS incident
    INNER JOIN public.games AS game ON game.id = incident.game_id
    LEFT JOIN public.game_recovery_refunds AS refund ON refund.incident_id = incident.id
    WHERE incident.status IN ('cancelled_crash', 'manual_review', 'closed') AND game.status = 'finished'
      AND (p_status IS NULL OR incident.status = p_status)
      AND (p_cause_code IS NULL OR incident.cause_code = p_cause_code)
      AND (p_query IS NULL OR incident.room_id ILIKE p_query || '%' OR incident.game_id::TEXT = p_query)
      AND (p_detected_from IS NULL OR incident.detected_at >= (p_detected_from::TIMESTAMP AT TIME ZONE 'America/Bogota'))
      AND (p_detected_to IS NULL OR incident.detected_at < ((p_detected_to + 1)::TIMESTAMP AT TIME ZONE 'America/Bogota'))
    GROUP BY incident.id, incident.game_id, incident.room_id, incident.cause_code, incident.detected_at,
      incident.resolved_at, incident.status, incident.resolution_reason
  ), counted AS (SELECT summarized.*, COUNT(*) OVER() AS total_count FROM summarized)
  SELECT * FROM counted
  WHERE p_cursor_detected_at IS NULL OR (counted.detected_at, counted.game_id) < (p_cursor_detected_at, p_cursor_game_id)
  ORDER BY counted.detected_at DESC, counted.game_id DESC LIMIT v_limit;
END;
$$;

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
    SELECT 1 FROM public.game_recovery_refunds AS refund
    WHERE refund.incident_id = v_incident.id AND refund.status <> 'completed'
  ) THEN
    RAISE EXCEPTION 'Todos los refunds deben estar completados antes del cierre' USING ERRCODE = '23514';
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

REVOKE ALL ON FUNCTION public.list_admin_recovery_refunds(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_admin_recovery_refunds(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.list_admin_recovery_incidents_export(TEXT, TEXT, TEXT, DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_admin_recovery_incidents_export(TEXT, TEXT, TEXT, DATE, DATE) TO authenticated;
REVOKE ALL ON FUNCTION public.close_game_recovery_incident(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_game_recovery_incident(UUID, TEXT) TO authenticated;
