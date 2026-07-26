-- Restaura el contrato de adjuntos del chat de soporte cuando la migración
-- histórica quedó registrada pero sus objetos no existen en el esquema remoto.

CREATE TABLE IF NOT EXISTS public.support_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.support_messages(id),
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_attachments_ticket
  ON public.support_attachments(ticket_id);

ALTER TABLE public.support_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ticket attachments" ON public.support_attachments;
CREATE POLICY "Users can view own ticket attachments"
  ON public.support_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.support_tickets AS ticket
      WHERE ticket.id = ticket_id
        AND ticket.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can view all attachments" ON public.support_attachments;
CREATE POLICY "Admins can view all attachments"
  ON public.support_attachments FOR SELECT
  USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "Users can add attachments to own open tickets" ON public.support_attachments;
CREATE POLICY "Users can add attachments to own open tickets"
  ON public.support_attachments FOR INSERT
  WITH CHECK (
    uploaded_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.support_tickets AS ticket
      WHERE ticket.id = ticket_id
        AND ticket.user_id = (SELECT auth.uid())
        AND ticket.status <> 'finalized'
    )
  );

DROP POLICY IF EXISTS "Admins can add attachments to open tickets" ON public.support_attachments;
CREATE POLICY "Admins can add attachments to open tickets"
  ON public.support_attachments FOR INSERT
  WITH CHECK (
    (SELECT public.is_admin())
    AND EXISTS (
      SELECT 1
      FROM public.support_tickets AS ticket
      WHERE ticket.id = ticket_id
        AND ticket.status <> 'finalized'
    )
  );

DROP POLICY IF EXISTS "No deletes on attachments" ON public.support_attachments;
CREATE POLICY "No deletes on attachments"
  ON public.support_attachments FOR DELETE
  USING (false);

DROP POLICY IF EXISTS "No updates on attachments" ON public.support_attachments;
CREATE POLICY "No updates on attachments"
  ON public.support_attachments FOR UPDATE
  USING (false);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support-attachments',
  'support-attachments',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload support attachments" ON storage.objects;
CREATE POLICY "Users can upload support attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'support-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can view own support attachments" ON storage.objects;
CREATE POLICY "Users can view own support attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'support-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Admins can view all support attachments" ON storage.objects;
CREATE POLICY "Admins can view all support attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'support-attachments'
    AND (SELECT public.is_admin())
  );
