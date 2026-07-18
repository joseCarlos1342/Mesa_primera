-- Los incidentes cerrados siguen siendo terminales; mantiene la lista y su metadata coherentes.
DROP POLICY IF EXISTS "admins_read_terminal_game_recovery_incidents"
  ON public.game_recovery_incidents;

CREATE POLICY "admins_read_terminal_game_recovery_incidents"
  ON public.game_recovery_incidents FOR SELECT TO authenticated
  USING (
    status IN ('cancelled_crash', 'manual_review', 'closed')
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
