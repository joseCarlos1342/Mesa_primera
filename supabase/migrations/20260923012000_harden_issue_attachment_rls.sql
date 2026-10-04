-- Enforce active-ticket ownership and caller-prefixed paths for issue uploads.

DROP POLICY IF EXISTS "Owners or admins insert issue attachments" ON public.issue_ticket_attachments;
DROP POLICY IF EXISTS "Users insert issue attachment metadata" ON public.issue_ticket_attachments;
CREATE POLICY "Users insert issue attachment metadata"
  ON public.issue_ticket_attachments FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = (SELECT auth.uid())
    AND (storage.foldername(storage_path))[1] = (SELECT auth.uid()::text)
    AND EXISTS (
      SELECT 1 FROM public.issue_tickets ticket
      WHERE ticket.id = issue_ticket_attachments.ticket_id
        AND ticket.status NOT IN ('resolved', 'closed')
        AND (ticket.user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()))
    )
  );

DROP POLICY IF EXISTS "Users upload own issue images" ON storage.objects;
CREATE POLICY "Users upload own issue images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'issue-attachments'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
    AND EXISTS (
      SELECT 1 FROM public.issue_tickets ticket
      WHERE ticket.id::text = (storage.foldername(name))[2]
        AND ticket.status NOT IN ('resolved', 'closed')
        AND (ticket.user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()))
    )
  );
