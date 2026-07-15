-- Corrige la primera iteración: consultas formales no pertenecen al chat de soporte.
CREATE TABLE IF NOT EXISTS public.issue_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES public.profiles(id),
  category TEXT NOT NULL CHECK (category IN ('deposit_missing','transfer_missing','withdrawal_missing','table_error','other')),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 5000),
  transaction_reference TEXT, table_reference TEXT, occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','closed')),
  resolution_notes TEXT, resolved_by UUID REFERENCES public.profiles(id), resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (category NOT IN ('deposit_missing','transfer_missing','withdrawal_missing') OR transaction_reference IS NOT NULL),
  CHECK (category <> 'table_error' OR table_reference IS NOT NULL)
);
ALTER TABLE public.issue_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own issue tickets" ON public.issue_tickets;
DROP POLICY IF EXISTS "Admins view issue tickets" ON public.issue_tickets;
CREATE POLICY "Users view own issue tickets" ON public.issue_tickets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins view issue tickets" ON public.issue_tickets FOR SELECT USING ((SELECT public.is_admin()));

DROP FUNCTION IF EXISTS public.create_support_issue(TEXT,TEXT,TEXT,TEXT,TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION public.create_support_issue(p_category TEXT,p_message TEXT,p_transaction_reference TEXT DEFAULT NULL,p_table_reference TEXT DEFAULT NULL,p_occurred_at TIMESTAMPTZ DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID; v_user UUID := auth.uid();
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501'; END IF;
 INSERT INTO public.issue_tickets(user_id,category,description,transaction_reference,table_reference,occurred_at)
 VALUES(v_user,p_category,trim(p_message),NULLIF(trim(p_transaction_reference),''),NULLIF(trim(p_table_reference),''),COALESCE(p_occurred_at,now())) RETURNING id INTO v_id;
 RETURN jsonb_build_object('success',true,'ticket_id',v_id,'message_id',v_id);
EXCEPTION WHEN check_violation THEN RETURN jsonb_build_object('success',false,'error','Datos del reclamo inválidos'); END;
$$;
REVOKE ALL ON FUNCTION public.create_support_issue(TEXT,TEXT,TEXT,TEXT,TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_support_issue(TEXT,TEXT,TEXT,TEXT,TIMESTAMPTZ) TO authenticated;
