-- Require a fresh MFA assurance level for deposit/withdrawal processing.

CREATE OR REPLACE FUNCTION public.process_admin_transaction(
  p_request_id UUID,
  p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_type TEXT;
  v_result JSONB;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN jsonb_build_object('error', 'No autorizado');
  END IF;

  IF COALESCE(auth.jwt() ->> 'aal', '') <> 'aal2' THEN
    RAISE EXCEPTION 'Se requiere autenticación multifactor' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_request
  FROM public.deposit_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF FOUND THEN
    v_type := 'deposit';
  ELSE
    SELECT * INTO v_request
    FROM public.withdrawal_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF FOUND THEN
      v_type := 'withdrawal';
    ELSE
      RETURN jsonb_build_object('error', 'Solicitud no encontrada');
    END IF;
  END IF;

  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object('error', 'La solicitud ya fue procesada');
  END IF;

  IF p_status NOT IN ('completed', 'failed') THEN
    RETURN jsonb_build_object('error', 'Estado inválido');
  END IF;

  IF p_status = 'completed' THEN
    v_result := public.process_ledger_entry(
      p_user_id      := v_request.user_id,
      p_amount_cents := v_request.amount_cents,
      p_type         := v_type,
      p_direction    := CASE WHEN v_type = 'deposit' THEN 'credit' ELSE 'debit' END,
      p_description  := 'Admin procesó ' || v_type,
      p_reference_id  := p_request_id::text,
      p_approved_by   := auth.uid()
    );

    IF v_result ? 'error' THEN
      RETURN v_result;
    END IF;
  END IF;

  IF v_type = 'deposit' THEN
    UPDATE public.deposit_requests
    SET status = CASE WHEN p_status = 'completed' THEN 'approved' ELSE 'rejected' END,
        reviewed_by = auth.uid(), reviewed_at = NOW(), updated_at = NOW()
    WHERE id = p_request_id;
  ELSE
    UPDATE public.withdrawal_requests
    SET status = CASE WHEN p_status = 'completed' THEN 'approved' ELSE 'rejected' END,
        reviewed_by = auth.uid(), reviewed_at = NOW(), updated_at = NOW()
    WHERE id = p_request_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.process_admin_transaction(UUID, TEXT) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.process_admin_transaction(UUID, TEXT) TO authenticated;
