-- La UI de jugador solo necesita conocer la sala reemplazo y su ventana de
-- recuperación. El checkpoint y el roster permanecen inaccesibles por RLS.
CREATE OR REPLACE FUNCTION public.resolve_player_recovery_room(p_original_room_id TEXT)
RETURNS TABLE (
  status TEXT,
  recovered_room_id TEXT,
  recovery_deadline_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_original_room_id IS NULL OR length(trim(p_original_room_id)) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT incident.status, incident.recovered_room_id, incident.recovery_deadline_at
  FROM public.game_recovery_incidents AS incident
  INNER JOIN public.game_recovery_checkpoints AS checkpoint
    ON checkpoint.game_id = incident.game_id
  WHERE incident.room_id = trim(p_original_room_id)
    AND auth.uid() = ANY(checkpoint.roster_user_ids)
    AND incident.status IN ('recovery_pending', 'resumed')
    AND incident.recovered_room_id IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_player_recovery_room(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_player_recovery_room(TEXT) TO authenticated;
