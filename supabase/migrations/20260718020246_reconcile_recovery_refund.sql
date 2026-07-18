-- Reconciliación manual excepcional de refunds terminales.
-- Reutiliza la operation_id original: nunca acepta usuario, monto ni operación del cliente.
CREATE FUNCTION public.reconcile_game_recovery_refund(
  p_refund_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_refund public.game_recovery_refunds%ROWTYPE;
  v_incident_id UUID;
  v_game_id UUID;
  v_ledger_id UUID;
  v_ledger public.ledger%ROWTYPE;
  v_ledger_result JSONB;
  v_reason TEXT := trim(COALESCE(p_reason, ''));
BEGIN
  IF v_admin_id IS NULL OR NOT COALESCE((SELECT public.is_admin()), false) THEN
    RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501';
  END IF;

  IF p_refund_id IS NULL OR length(v_reason) NOT BETWEEN 10 AND 500 THEN
    RAISE EXCEPTION 'Motivo de reconciliación inválido' USING ERRCODE = '22023';
  END IF;

  SELECT refund.*
  INTO v_refund
  FROM public.game_recovery_refunds AS refund
  WHERE refund.id = p_refund_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Refund no disponible para reconciliación' USING ERRCODE = 'P0002';
  END IF;

  SELECT incident.id, incident.game_id
  INTO v_incident_id, v_game_id
  FROM public.game_recovery_incidents AS incident
  INNER JOIN public.games AS game ON game.id = incident.game_id
  WHERE incident.id = v_refund.incident_id
    AND incident.status IN ('manual_review', 'cancelled_crash')
    AND game.status = 'finished';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Refund no disponible para reconciliación' USING ERRCODE = '23514';
  END IF;

  IF v_refund.status = 'completed' THEN
    RETURN jsonb_build_object(
      'success', true,
      'refund_id', v_refund.id,
      'ledger_id', v_refund.ledger_id,
      'already_reconciled', true
    );
  END IF;

  IF v_refund.status NOT IN ('pending', 'failed') THEN
    RAISE EXCEPTION 'Refund no disponible para reconciliación' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_ledger
  FROM public.ledger AS ledger
  WHERE ledger.type = 'refund'
    AND ledger.metadata->>'operation_id' = v_refund.operation_id::TEXT;

  IF FOUND THEN
    IF v_ledger.user_id IS DISTINCT FROM v_refund.user_id
      OR v_ledger.amount_cents IS DISTINCT FROM v_refund.amount_cents
      OR v_ledger.direction IS DISTINCT FROM 'credit'
      OR v_ledger.type IS DISTINCT FROM 'refund'
      OR v_ledger.game_id IS DISTINCT FROM v_game_id
      OR v_ledger.status IS DISTINCT FROM 'completed'
      OR v_ledger.reference_id IS DISTINCT FROM 'recovery-refund-' || v_refund.operation_id::TEXT
      OR v_ledger.metadata->>'operation_id' IS DISTINCT FROM v_refund.operation_id::TEXT
      OR v_ledger.metadata->>'recovery_incident_id' IS DISTINCT FROM v_incident_id::TEXT THEN
      RAISE EXCEPTION 'La operación idempotente no coincide con el refund' USING ERRCODE = '23505';
    END IF;
    v_ledger_id := v_ledger.id;
  ELSE
    v_ledger_result := public.process_ledger_entry(
      p_user_id := v_refund.user_id,
      p_amount_cents := v_refund.amount_cents,
      p_type := 'refund',
      p_direction := 'credit',
      p_game_id := v_game_id,
      p_description := 'Reembolso conciliado por recovery: ' || v_reason,
      p_reference_id := 'recovery-refund-' || v_refund.operation_id::TEXT,
      p_approved_by := v_admin_id,
      p_metadata := jsonb_build_object(
        'operation_id', v_refund.operation_id,
        'recovery_incident_id', v_incident_id,
        'reason', 'manual_recovery_reconciliation',
        'reconciliation_reason', v_reason,
        'reconciled_by', v_admin_id
      )
    );

    IF v_ledger_result ? 'error' THEN
      RAISE EXCEPTION 'No se pudo crear el crédito de refund: %', v_ledger_result->>'error';
    END IF;
    v_ledger_id := (v_ledger_result->>'ledger_id')::UUID;
  END IF;

  UPDATE public.game_recovery_refunds
  SET ledger_id = v_ledger_id,
      status = 'completed',
      completed_at = now()
  WHERE id = v_refund.id;

  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (
    v_admin_id,
    'recovery_refund_reconciled',
    'game_recovery_refund',
    v_refund.id::TEXT,
    jsonb_build_object(
      'game_id', v_game_id,
      'incident_id', v_incident_id,
      'ledger_id', v_ledger_id,
      'operation_id', v_refund.operation_id,
      'reason', v_reason
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'refund_id', v_refund.id,
    'ledger_id', v_ledger_id,
    'already_reconciled', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_game_recovery_refund(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reconcile_game_recovery_refund(UUID, TEXT) TO authenticated;
