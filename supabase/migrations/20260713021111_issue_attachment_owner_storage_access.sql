-- Un jugador puede abrir imágenes de su consulta aunque las haya subido un admin.
DROP POLICY IF EXISTS "Issue ticket owners view all issue images" ON storage.objects;
CREATE POLICY "Issue ticket owners view all issue images"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'issue-attachments'
    AND EXISTS (
      SELECT 1
      FROM public.issue_ticket_attachments attachment
      INNER JOIN public.issue_tickets ticket ON ticket.id = attachment.ticket_id
      WHERE attachment.storage_path = name
        AND ticket.user_id = (SELECT auth.uid())
    )
  );
