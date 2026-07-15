DROP POLICY IF EXISTS "Users insert issue attachment metadata" ON public.issue_ticket_attachments;
CREATE POLICY "Users insert issue attachment metadata"
  ON public.issue_ticket_attachments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.issue_tickets ticket
      WHERE ticket.id = ticket_id
        AND ticket.status NOT IN ('resolved', 'closed')
        AND (ticket.user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()))
    )
  );
