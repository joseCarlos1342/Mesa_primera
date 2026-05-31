-- =============================================================
-- Security hardening: financial SECURITY DEFINER RPC grants
-- =============================================================
-- process_ledger_entry and award_pot are privileged primitives. They must
-- not be callable directly from browser/authenticated clients.

CREATE OR REPLACE FUNCTION public.admin_adjust_user_balance(
  p_user_id UUID,
  p_delta_cents INT,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_direction TEXT;
  v_amount_cents INT;
BEGIN
  IF v_admin_id IS NULL OR NOT COALESCE((SELECT public.is_admin()), false) THEN
    RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501';
  END IF;

  IF p_delta_cents = 0 THEN
    RETURN jsonb_build_object('error', 'El monto debe ser diferente de cero');
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RETURN jsonb_build_object('error', 'El motivo del ajuste es obligatorio');
  END IF;

  v_direction := CASE WHEN p_delta_cents > 0 THEN 'credit' ELSE 'debit' END;
  v_amount_cents := abs(p_delta_cents);

  RETURN public.process_ledger_entry(
    p_user_id      := p_user_id,
    p_amount_cents := v_amount_cents,
    p_type         := 'adjustment',
    p_direction    := v_direction,
    p_description  := 'Ajuste administrativo: ' || trim(p_reason),
    p_approved_by  := v_admin_id,
    p_metadata     := jsonb_build_object('reason', trim(p_reason), 'admin_id', v_admin_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_adjust_user_balance(UUID, INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_adjust_user_balance(UUID, INT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.process_ledger_entry(UUID, INT, TEXT, TEXT, UUID, UUID, TEXT, TEXT, UUID, UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_ledger_entry(UUID, INT, TEXT, TEXT, UUID, UUID, TEXT, TEXT, UUID, UUID, JSONB) TO service_role;

REVOKE ALL ON FUNCTION public.award_pot(UUID, INT, INT, UUID, UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_pot(UUID, INT, INT, UUID, UUID, JSONB) TO service_role;

DO $$
BEGIN
  IF to_regprocedure('public.award_pot(uuid,bigint,bigint,uuid)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.award_pot(UUID, BIGINT, BIGINT, UUID) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.award_pot(UUID, BIGINT, BIGINT, UUID) TO service_role';
  END IF;

  IF to_regprocedure('public.record_ledger_entry(uuid,bigint,text,text,uuid)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.record_ledger_entry(UUID, BIGINT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.record_ledger_entry(UUID, BIGINT, TEXT, TEXT, UUID) TO service_role';
  END IF;
END;
$$;
