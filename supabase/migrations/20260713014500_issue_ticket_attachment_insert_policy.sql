-- Permite registrar la metadata solo a quien subió el archivo y únicamente
-- si participa en el caso o es administrador.
CREATE POLICY "Owners or admins insert issue attachments"
  ON public.issue_ticket_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      (SELECT public.is_admin())
      OR EXISTS (
        SELECT 1
        FROM public.issue_tickets ticket
        WHERE ticket.id = issue_ticket_attachments.ticket_id
          AND ticket.user_id = auth.uid()
      )
    )
  );
