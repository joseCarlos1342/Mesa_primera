CREATE TABLE public.issue_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.issue_tickets(id) ON DELETE RESTRICT,
  author_id UUID REFERENCES public.profiles(id),
  from_admin BOOLEAN NOT NULL DEFAULT false,
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_issue_ticket_messages_ticket_created ON public.issue_ticket_messages(ticket_id, created_at);
ALTER TABLE public.issue_ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own issue messages" ON public.issue_ticket_messages FOR SELECT USING (EXISTS (SELECT 1 FROM public.issue_tickets ticket WHERE ticket.id = ticket_id AND ticket.user_id = auth.uid()));
CREATE POLICY "Admins view issue messages" ON public.issue_ticket_messages FOR SELECT USING ((SELECT public.is_admin()));

CREATE OR REPLACE FUNCTION public.append_issue_ticket_message(p_ticket_id UUID,p_message TEXT,p_from_admin BOOLEAN DEFAULT false)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user UUID:=auth.uid(); v_admin BOOLEAN:=COALESCE((SELECT public.is_admin()),false); v_ticket public.issue_tickets%ROWTYPE; v_id UUID;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Acceso denegado' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_ticket FROM public.issue_tickets WHERE id=p_ticket_id FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Consulta no encontrada'); END IF;
 IF NOT v_admin AND v_ticket.user_id<>v_user THEN RETURN jsonb_build_object('success',false,'error','Acceso denegado'); END IF;
 IF v_ticket.status IN ('resolved','closed') AND NOT v_admin THEN RETURN jsonb_build_object('success',false,'error','La consulta está cerrada'); END IF;
 INSERT INTO public.issue_ticket_messages(ticket_id,author_id,from_admin,message) VALUES(p_ticket_id,v_user,v_admin,trim(p_message)) RETURNING id INTO v_id;
 UPDATE public.issue_tickets SET status=CASE WHEN v_admin AND status='open' THEN 'investigating' ELSE status END,updated_at=now() WHERE id=p_ticket_id;
 RETURN jsonb_build_object('success',true,'message_id',v_id);
END; $$;
REVOKE ALL ON FUNCTION public.append_issue_ticket_message(UUID,TEXT,BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.append_issue_ticket_message(UUID,TEXT,BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_support_issue(p_category TEXT,p_message TEXT,p_transaction_reference TEXT DEFAULT NULL,p_table_reference TEXT DEFAULT NULL,p_occurred_at TIMESTAMPTZ DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID; v_message_id UUID; v_user UUID:=auth.uid();
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Acceso denegado' USING ERRCODE='42501'; END IF;
 INSERT INTO public.issue_tickets(user_id,category,description,transaction_reference,table_reference,occurred_at) VALUES(v_user,p_category,trim(p_message),NULLIF(trim(p_transaction_reference),''),NULLIF(trim(p_table_reference),''),COALESCE(p_occurred_at,now())) RETURNING id INTO v_id;
 INSERT INTO public.issue_ticket_messages(ticket_id,author_id,from_admin,message) VALUES(v_id,v_user,false,trim(p_message)) RETURNING id INTO v_message_id;
 RETURN jsonb_build_object('success',true,'ticket_id',v_id,'message_id',v_message_id);
EXCEPTION WHEN check_violation THEN RETURN jsonb_build_object('success',false,'error','Datos del reclamo inválidos'); END; $$;
