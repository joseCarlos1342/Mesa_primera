CREATE TABLE public.issue_ticket_adjustments (
  issue_ticket_id UUID PRIMARY KEY REFERENCES public.issue_tickets(id) ON DELETE RESTRICT,
  ledger_id UUID NOT NULL REFERENCES public.ledger(id) ON DELETE RESTRICT,
  delta_cents INTEGER NOT NULL CHECK (delta_cents <> 0), reason TEXT NOT NULL,
  adjusted_by UUID NOT NULL REFERENCES public.profiles(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.issue_ticket_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own issue adjustments" ON public.issue_ticket_adjustments FOR SELECT USING (EXISTS (SELECT 1 FROM public.issue_tickets ticket WHERE ticket.id = issue_ticket_id AND ticket.user_id = auth.uid()));
CREATE POLICY "Admins view issue adjustments" ON public.issue_ticket_adjustments FOR SELECT USING ((SELECT public.is_admin()));

CREATE OR REPLACE FUNCTION public.resolve_support_issue_adjustment(p_ticket_id UUID,p_delta_cents INTEGER,p_reason TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin UUID := auth.uid(); v_ticket public.issue_tickets%ROWTYPE; v_result JSONB; v_ledger UUID;
BEGIN
 IF v_admin IS NULL OR NOT COALESCE((SELECT public.is_admin()),false) THEN RAISE EXCEPTION 'Acceso denegado' USING ERRCODE='42501'; END IF;
 IF p_delta_cents=0 OR p_delta_cents%100000<>0 OR length(trim(p_reason)) NOT BETWEEN 10 AND 500 THEN RETURN jsonb_build_object('success',false,'error','Ajuste inválido'); END IF;
 SELECT * INTO v_ticket FROM public.issue_tickets WHERE id=p_ticket_id FOR UPDATE;
 IF NOT FOUND OR v_ticket.category NOT IN ('deposit_missing','transfer_missing','withdrawal_missing') THEN RETURN jsonb_build_object('success',false,'error','Consulta no ajustable'); END IF;
 IF EXISTS(SELECT 1 FROM public.issue_ticket_adjustments WHERE issue_ticket_id=p_ticket_id) THEN RETURN jsonb_build_object('success',false,'error','La consulta ya tiene un ajuste aplicado'); END IF;
 v_result:=public.process_ledger_entry(p_user_id:=v_ticket.user_id,p_amount_cents:=abs(p_delta_cents),p_type:='adjustment',p_direction:=CASE WHEN p_delta_cents>0 THEN 'credit' ELSE 'debit' END,p_description:='Ajuste por consulta '||p_ticket_id||': '||trim(p_reason),p_reference_id:=p_ticket_id::text,p_approved_by:=v_admin,p_metadata:=jsonb_build_object('issue_ticket_id',p_ticket_id,'admin_id',v_admin));
 IF v_result ? 'error' THEN RETURN v_result || jsonb_build_object('success',false); END IF;
 v_ledger:=(v_result->>'ledger_id')::UUID;
 INSERT INTO public.issue_ticket_adjustments VALUES(p_ticket_id,v_ledger,p_delta_cents,trim(p_reason),v_admin);
 UPDATE public.issue_tickets SET status='resolved',resolution_notes=trim(p_reason),resolved_by=v_admin,resolved_at=now(),updated_at=now() WHERE id=p_ticket_id;
 RETURN jsonb_build_object('success',true,'ledger_id',v_ledger,'balance_after',v_result->'balance_after');
END; $$;
REVOKE ALL ON FUNCTION public.resolve_support_issue_adjustment(UUID,INTEGER,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_support_issue_adjustment(UUID,INTEGER,TEXT) TO authenticated;
