ALTER TABLE public.game_recovery_incidents
  ADD COLUMN acknowledged_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD COLUMN acknowledged_at TIMESTAMPTZ,
  ADD CONSTRAINT game_recovery_incident_acknowledgement_consistency CHECK (
    (acknowledged_by IS NULL AND acknowledged_at IS NULL)
    OR (acknowledged_by IS NOT NULL AND acknowledged_at IS NOT NULL)
  );

CREATE FUNCTION public.acknowledge_game_recovery_incident(p_incident_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_acknowledged_at TIMESTAMPTZ;
  v_updated BOOLEAN := false;
BEGIN
  IF v_admin_id IS NULL OR NOT COALESCE((SELECT public.is_admin()), false) THEN
    RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501';
  END IF;

  UPDATE public.game_recovery_incidents AS incident
  SET acknowledged_by = v_admin_id,
      acknowledged_at = now()
  FROM public.games AS game
  WHERE incident.id = p_incident_id
    AND incident.game_id = game.id
    AND incident.status = 'manual_review'
    AND game.status = 'finished'
    AND incident.acknowledged_at IS NULL
  RETURNING incident.acknowledged_at INTO v_acknowledged_at;

  v_updated := FOUND;
  IF NOT v_updated THEN
    SELECT incident.acknowledged_at INTO v_acknowledged_at
    FROM public.game_recovery_incidents AS incident
    INNER JOIN public.games AS game ON game.id = incident.game_id
    WHERE incident.id = p_incident_id
      AND incident.status = 'manual_review'
      AND game.status = 'finished';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Incidente no disponible para reconocimiento' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  IF v_updated THEN
    INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
    VALUES (
      v_admin_id,
      'recovery_incident_acknowledged',
      'game_recovery_incident',
      p_incident_id::TEXT,
      jsonb_build_object('acknowledged_at', v_acknowledged_at)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'incident_id', p_incident_id,
    'acknowledged_at', v_acknowledged_at,
    'already_acknowledged', NOT v_updated
  );
END;
$$;

REVOKE ALL ON FUNCTION public.acknowledge_game_recovery_incident(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acknowledge_game_recovery_incident(UUID) TO authenticated;
