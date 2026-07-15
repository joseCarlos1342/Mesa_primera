CREATE OR REPLACE FUNCTION public.append_issue_ticket_message(p_ticket_id UUID,p_message TEXT,p_from_admin BOOLEAN DEFAULT false)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user UUID:=auth.uid(); v_admin BOOLEAN:=COALESCE((SELECT public.is_admin()),false); v_ticket public.issue_tickets%ROWTYPE; v_id UUID;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Acceso denegado' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_ticket FROM public.issue_tickets WHERE id=p_ticket_id FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Consulta no encontrada'); END IF;
 IF NOT v_admin AND v_ticket.user_id<>v_user THEN RETURN jsonb_build_object('success',false,'error','Acceso denegado'); END IF;
 IF v_ticket.status IN ('resolved','closed') THEN RETURN jsonb_build_object('success',false,'error','La consulta está cerrada'); END IF;
 INSERT INTO public.issue_ticket_messages(ticket_id,author_id,from_admin,message) VALUES(p_ticket_id,v_user,v_admin,trim(p_message)) RETURNING id INTO v_id;
 UPDATE public.issue_tickets SET status=CASE WHEN v_admin AND status='open' THEN 'investigating' ELSE status END,updated_at=now() WHERE id=p_ticket_id;
 RETURN jsonb_build_object('success',true,'message_id',v_id);
END; $$;


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
