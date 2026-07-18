-- PostgREST requiere una restricción UNIQUE, no un índice parcial, para onConflict.
-- UNIQUE admite múltiples NULL y por tanto solo deduplica alertas que aportan clave.
DROP INDEX IF EXISTS public.server_alerts_dedupe_key_unique;
ALTER TABLE public.server_alerts
  ADD CONSTRAINT server_alerts_dedupe_key_key UNIQUE (dedupe_key);

-- Devuelve el estado persistido también en reintentos para que el game-server
-- pueda reparar una alerta fallida sin repetir la transición terminal.
CREATE OR REPLACE FUNCTION public.mark_game_recovery_incident_manual_review(
  p_game_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_updated BOOLEAN := false;
  v_status TEXT;
BEGIN
  UPDATE public.game_recovery_incidents
  SET status = 'manual_review',
      resolution_reason = COALESCE(NULLIF(trim(p_reason), ''), 'refund_derivation_failed'),
      resolved_at = now()
  WHERE game_id = p_game_id
    AND status = 'recovery_pending'
  RETURNING status INTO v_status;

  v_updated := FOUND;
  IF v_updated THEN
    UPDATE public.games SET status = 'finished' WHERE id = p_game_id;
  ELSE
    SELECT incident.status INTO v_status
    FROM public.game_recovery_incidents AS incident
    WHERE incident.game_id = p_game_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'updated', v_updated, 'status', v_status);
END;
$$;
