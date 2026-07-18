-- Explorador administrativo de recovery: solo resumen de incidentes terminales.
-- Nunca expone checkpoints, roster, datos por jugador ni estado activo de mesas.
CREATE INDEX IF NOT EXISTS idx_game_recovery_incidents_terminal_cursor
  ON public.game_recovery_incidents (detected_at DESC, game_id DESC)
  WHERE status IN ('cancelled_crash', 'manual_review');

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
  game_id UUID,
  room_id TEXT,
  cause_code TEXT,
  detected_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  status TEXT,
  resolution_reason TEXT,
  refunds_completed_count BIGINT,
  refunds_total_count BIGINT,
  replay_available BOOLEAN,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 26), 1), 101);
BEGIN
  IF NOT COALESCE((SELECT public.is_admin()), false) THEN
    RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501';
  END IF;

  IF (p_cursor_detected_at IS NULL) <> (p_cursor_game_id IS NULL) THEN
    RAISE EXCEPTION 'Cursor inválido' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT
      incident.id,
      incident.game_id,
      incident.room_id,
      incident.cause_code,
      incident.detected_at,
      incident.resolved_at,
      incident.status,
      incident.resolution_reason,
      EXISTS (
        SELECT 1
        FROM public.game_replays AS replay
        WHERE replay.game_id = incident.game_id
      ) AS replay_available
    FROM public.game_recovery_incidents AS incident
    INNER JOIN public.games AS game ON game.id = incident.game_id
    WHERE incident.status IN ('cancelled_crash', 'manual_review')
      AND game.status = 'finished'
      AND (p_status IS NULL OR incident.status = p_status)
      AND (p_cause_code IS NULL OR incident.cause_code = p_cause_code)
      AND (
        p_query IS NULL
        OR incident.room_id ILIKE p_query || '%'
        OR incident.game_id::TEXT = p_query
      )
      AND (
        p_detected_from IS NULL
        OR incident.detected_at >= (p_detected_from::TIMESTAMP AT TIME ZONE 'America/Bogota')
      )
      AND (
        p_detected_to IS NULL
        OR incident.detected_at < ((p_detected_to + 1)::TIMESTAMP AT TIME ZONE 'America/Bogota')
      )
  ),
  summarized AS (
    SELECT
      filtered.*,
      COUNT(refund.id) FILTER (WHERE refund.status = 'completed') AS refunds_completed_count,
      COUNT(refund.id) AS refunds_total_count
    FROM filtered
    LEFT JOIN public.game_recovery_refunds AS refund ON refund.incident_id = filtered.id
    GROUP BY filtered.id, filtered.game_id, filtered.room_id, filtered.cause_code,
      filtered.detected_at, filtered.resolved_at, filtered.status, filtered.resolution_reason,
      filtered.replay_available
  ),
  counted AS (
    SELECT summarized.*, COUNT(*) OVER() AS total_count
    FROM summarized
  )
  SELECT
    counted.game_id,
    counted.room_id,
    counted.cause_code,
    counted.detected_at,
    counted.resolved_at,
    counted.status,
    counted.resolution_reason,
    counted.refunds_completed_count,
    counted.refunds_total_count,
    counted.replay_available,
    counted.total_count
  FROM counted
  WHERE p_cursor_detected_at IS NULL
    OR (counted.detected_at, counted.game_id) < (p_cursor_detected_at, p_cursor_game_id)
  ORDER BY counted.detected_at DESC, counted.game_id DESC
  LIMIT v_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.list_admin_recovery_incidents_v2(TEXT, TEXT, TEXT, DATE, DATE, TIMESTAMPTZ, UUID, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_admin_recovery_incidents_v2(TEXT, TEXT, TEXT, DATE, DATE, TIMESTAMPTZ, UUID, INTEGER)
  TO authenticated;
