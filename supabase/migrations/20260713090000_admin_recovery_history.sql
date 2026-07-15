-- El dashboard administrativo recibe solo un resumen de incidentes ya
-- terminales. La función no expone checkpoints, roster ni datos por jugador.
CREATE FUNCTION public.list_admin_recovery_incidents()
RETURNS TABLE (
  game_id UUID,
  room_id TEXT,
  cause_code TEXT,
  detected_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  status TEXT,
  resolution_reason TEXT,
  refunds_completed_count BIGINT,
  refunds_total_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    incident.game_id,
    incident.room_id,
    incident.cause_code,
    incident.detected_at,
    incident.resolved_at,
    incident.status,
    incident.resolution_reason,
    COUNT(refund.id) FILTER (WHERE refund.status = 'completed') AS refunds_completed_count,
    COUNT(refund.id) AS refunds_total_count
  FROM public.game_recovery_incidents AS incident
  INNER JOIN public.games AS game ON game.id = incident.game_id
  LEFT JOIN public.game_recovery_refunds AS refund ON refund.incident_id = incident.id
  WHERE incident.status IN ('cancelled_crash', 'manual_review')
    AND game.status = 'finished'
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  GROUP BY incident.id
  ORDER BY incident.resolved_at DESC NULLS LAST, incident.detected_at DESC;
$$;

REVOKE ALL ON FUNCTION public.list_admin_recovery_incidents() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_admin_recovery_incidents() TO authenticated;
