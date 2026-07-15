CREATE TABLE public.issue_ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.issue_tickets(id) ON DELETE RESTRICT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  storage_path TEXT NOT NULL UNIQUE, file_name TEXT NOT NULL, mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_issue_ticket_attachments_ticket ON public.issue_ticket_attachments(ticket_id, created_at);
ALTER TABLE public.issue_ticket_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own issue attachments" ON public.issue_ticket_attachments FOR SELECT USING (EXISTS (SELECT 1 FROM public.issue_tickets ticket WHERE ticket.id=ticket_id AND ticket.user_id=auth.uid()));
CREATE POLICY "Admins view issue attachments" ON public.issue_ticket_attachments FOR SELECT USING ((SELECT public.is_admin()));

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('issue-attachments','issue-attachments',false,10485760,ARRAY['image/jpeg','image/png','image/webp']) ON CONFLICT(id) DO NOTHING;
CREATE POLICY "Users upload own issue images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='issue-attachments' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY "Users view own issue images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='issue-attachments' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY "Admins view issue images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='issue-attachments' AND (SELECT public.is_admin()));

CREATE OR REPLACE FUNCTION public.close_issue_ticket(p_ticket_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_user UUID:=auth.uid(); v_admin BOOLEAN:=COALESCE((SELECT public.is_admin()),false); v_ticket public.issue_tickets%ROWTYPE; v_message UUID;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Acceso denegado' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_ticket FROM public.issue_tickets WHERE id=p_ticket_id FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Consulta no encontrada'); END IF;
 IF NOT v_admin AND v_ticket.user_id<>v_user THEN RETURN jsonb_build_object('success',false,'error','Acceso denegado'); END IF;
 IF v_ticket.status='closed' THEN RETURN jsonb_build_object('success',true); END IF;
 UPDATE public.issue_tickets SET status='closed',updated_at=now() WHERE id=p_ticket_id;
 INSERT INTO public.issue_ticket_messages(ticket_id,author_id,from_admin,message) VALUES(p_ticket_id,v_user,v_admin,CASE WHEN v_admin THEN 'El caso fue cerrado por administración.' ELSE 'El caso fue cerrado por el jugador.' END) RETURNING id INTO v_message;
 RETURN jsonb_build_object('success',true,'message_id',v_message);
END; $$;
REVOKE ALL ON FUNCTION public.close_issue_ticket(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.close_issue_ticket(UUID) TO authenticated;
