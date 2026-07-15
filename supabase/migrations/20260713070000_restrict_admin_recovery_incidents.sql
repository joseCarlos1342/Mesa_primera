-- Admin Blindness: un incidente solo es visible cuando la partida terminó y
-- la recuperación ya no puede reanudar el estado activo.
DROP POLICY IF EXISTS "admins_read_resolved_game_recovery_incidents"
  ON public.game_recovery_incidents;

CREATE POLICY "admins_read_terminal_game_recovery_incidents"
  ON public.game_recovery_incidents FOR SELECT TO authenticated
  USING (
    status IN ('cancelled_crash', 'manual_review')
    AND EXISTS (
      SELECT 1
      FROM public.games
      WHERE games.id = game_recovery_incidents.game_id
        AND games.status = 'finished'
    )
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
