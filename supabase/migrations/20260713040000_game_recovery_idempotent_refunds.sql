-- Cierre de recuperación por crash: cada crédito queda ligado a una operación
-- estable y solo service_role puede abrir o expirar incidentes.

CREATE UNIQUE INDEX ledger_refund_operation_id_unique
  ON public.ledger ((metadata ->> 'operation_id'))
  WHERE type = 'refund' AND metadata ? 'operation_id';

CREATE OR REPLACE FUNCTION public.open_game_recovery_incident(
  p_game_id UUID,
  p_room_id TEXT,
  p_detected_at TIMESTAMPTZ,
  p_cause_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident public.game_recovery_incidents%ROWTYPE;
BEGIN
  IF p_room_id IS NULL OR length(trim(p_room_id)) = 0
     OR p_cause_code IS NULL OR length(trim(p_cause_code)) = 0 THEN
    RETURN jsonb_build_object('error', 'Los datos del incidente son obligatorios');
  END IF;

  INSERT INTO public.game_recovery_incidents (
    game_id, room_id, detected_at, recovery_deadline_at, cause_code, status
  ) VALUES (
    p_game_id,
    trim(p_room_id),
    COALESCE(p_detected_at, now()),
    COALESCE(p_detected_at, now()) + interval '2 minutes',
    trim(p_cause_code),
    'recovery_pending'
  )
  ON CONFLICT (game_id) DO NOTHING
  RETURNING * INTO v_incident;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', v_incident.status,
      'created', true,
      'recovery_deadline_at', v_incident.recovery_deadline_at
    );
  END IF;

  SELECT * INTO v_incident
  FROM public.game_recovery_incidents
  WHERE game_id = p_game_id
  FOR UPDATE;

  RETURN jsonb_build_object(
    'success', true,
    'status', v_incident.status,
    'created', false,
    'already_resolved', v_incident.status <> 'recovery_pending',
    'recovery_deadline_at', v_incident.recovery_deadline_at
  );
END;
$$;

-- Los importes se calculan en la base de datos desde apuestas y créditos ya
-- persistidos. El proceso nunca reconstruye cantidades desde memoria.
CREATE OR REPLACE FUNCTION public.derive_game_recovery_refunds(p_game_id UUID)
RETURNS TABLE (user_id UUID, amount_cents INTEGER)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ledger.user_id,
         (
           COALESCE(SUM(ledger.amount_cents) FILTER (WHERE ledger.type = 'bet' AND ledger.direction = 'debit'), 0)
           - COALESCE(SUM(ledger.amount_cents) FILTER (WHERE ledger.type = 'refund' AND ledger.direction = 'credit'), 0)
         )::INTEGER AS amount_cents
  FROM public.ledger ledger
  INNER JOIN public.game_recovery_checkpoints checkpoint ON checkpoint.game_id = ledger.game_id
  INNER JOIN public.game_recovery_incidents incident ON incident.game_id = ledger.game_id
  WHERE ledger.game_id = p_game_id
    AND incident.status = 'recovery_pending'
    AND ledger.user_id = ANY(checkpoint.roster_user_ids)
  GROUP BY ledger.user_id
  HAVING (
    COALESCE(SUM(ledger.amount_cents) FILTER (WHERE ledger.type = 'bet' AND ledger.direction = 'debit'), 0)
    - COALESCE(SUM(ledger.amount_cents) FILTER (WHERE ledger.type = 'refund' AND ledger.direction = 'credit'), 0)
  ) > 0;
$$;

CREATE OR REPLACE FUNCTION public.mark_game_recovery_incident_manual_review(
  p_game_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.game_recovery_incidents
  SET status = 'manual_review',
      resolution_reason = COALESCE(NULLIF(trim(p_reason), ''), 'refund_derivation_failed'),
      resolved_at = now()
  WHERE game_id = p_game_id
    AND status = 'recovery_pending';

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_game_recovery_incident(p_game_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.game_recovery_incidents
  SET status = 'resumed',
      resolution_reason = 'roster_rejoined',
      resolved_at = now()
  WHERE game_id = p_game_id
    AND status = 'recovery_pending';

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_game_recovery_incident(
  p_game_id UUID,
  p_refunds JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident public.game_recovery_incidents%ROWTYPE;
  v_refund public.game_recovery_refunds%ROWTYPE;
  v_item RECORD;
  v_ledger_id UUID;
  v_ledger_result JSONB;
  v_refund_count INTEGER;
  v_completed_count INTEGER := 0;
  v_expected_amount INTEGER;
BEGIN
  IF jsonb_typeof(p_refunds) <> 'array' THEN
    RETURN jsonb_build_object('error', 'Los refunds deben ser un arreglo');
  END IF;

  SELECT * INTO v_incident
  FROM public.game_recovery_incidents
  WHERE game_id = p_game_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Incidente de recuperación no encontrado');
  END IF;

  -- Los incidentes resueltos no vuelven a pending. Un crash ya cancelado es
  -- idempotente y no vuelve a ejecutar ningún crédito.
  IF v_incident.status = 'cancelled_crash' THEN
    RETURN jsonb_build_object('success', true, 'status', v_incident.status, 'already_resolved', true);
  END IF;

  IF v_incident.status <> 'recovery_pending' THEN
    RETURN jsonb_build_object('success', true, 'status', v_incident.status, 'already_resolved', true);
  END IF;

  IF now() < v_incident.recovery_deadline_at THEN
    RETURN jsonb_build_object('success', true, 'status', v_incident.status, 'expired', false);
  END IF;

  SELECT count(*) INTO v_refund_count
  FROM jsonb_to_recordset(p_refunds) AS item(
    user_id UUID,
    amount_cents INTEGER,
    operation_id UUID
  );

  IF v_refund_count <> (
    SELECT count(DISTINCT operation_id)
    FROM jsonb_to_recordset(p_refunds) AS item(
      user_id UUID,
      amount_cents INTEGER,
      operation_id UUID
    )
  ) THEN
    RAISE EXCEPTION 'Cada refund debe tener una operation_id única';
  END IF;

  -- La lista no decide importes: cada crédito debe corresponder exactamente a
  -- apuestas persistidas de un integrante del roster, menos refunds previos.
  IF EXISTS (
    WITH expected_refunds AS (
      SELECT ledger.user_id,
        COALESCE(SUM(ledger.amount_cents) FILTER (WHERE ledger.type = 'bet' AND ledger.direction = 'debit'), 0)
        - COALESCE(SUM(ledger.amount_cents) FILTER (WHERE ledger.type = 'refund' AND ledger.direction = 'credit'), 0) AS amount_cents
      FROM public.ledger ledger
      INNER JOIN public.game_recovery_checkpoints checkpoint ON checkpoint.game_id = ledger.game_id
      WHERE ledger.game_id = v_incident.game_id
        AND ledger.user_id = ANY(checkpoint.roster_user_ids)
      GROUP BY ledger.user_id
    )
    SELECT 1
    FROM expected_refunds expected
    WHERE expected.amount_cents > 0
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_to_recordset(p_refunds) AS supplied(user_id UUID, amount_cents INTEGER, operation_id UUID)
        WHERE supplied.user_id = expected.user_id
          AND supplied.amount_cents = expected.amount_cents
      )
  ) THEN
    RAISE EXCEPTION 'La lista de refunds no coincide con las apuestas recuperables';
  END IF;

  UPDATE public.game_recovery_incidents
  SET status = 'cancelled_crash',
      resolution_reason = 'recovery_deadline_expired',
      resolved_at = now()
  WHERE id = v_incident.id;

  FOR v_item IN
    SELECT *
    FROM jsonb_to_recordset(p_refunds) AS item(
      user_id UUID,
      amount_cents INTEGER,
      operation_id UUID
    )
  LOOP
    IF v_item.user_id IS NULL OR v_item.operation_id IS NULL OR v_item.amount_cents IS NULL OR v_item.amount_cents <= 0 THEN
      RAISE EXCEPTION 'Cada refund requiere user_id, amount_cents positivo y operation_id';
    END IF;

    SELECT
      COALESCE(SUM(ledger.amount_cents) FILTER (WHERE ledger.type = 'bet' AND ledger.direction = 'debit'), 0)
      - COALESCE(SUM(ledger.amount_cents) FILTER (WHERE ledger.type = 'refund' AND ledger.direction = 'credit'), 0)
    INTO v_expected_amount
    FROM public.ledger ledger
    INNER JOIN public.game_recovery_checkpoints checkpoint ON checkpoint.game_id = ledger.game_id
    WHERE ledger.game_id = v_incident.game_id
      AND ledger.user_id = v_item.user_id
      AND v_item.user_id = ANY(checkpoint.roster_user_ids);

    IF v_expected_amount <= 0 OR v_item.amount_cents <> v_expected_amount THEN
      RAISE EXCEPTION 'El refund no corresponde a las apuestas recuperables del jugador';
    END IF;

    INSERT INTO public.game_recovery_refunds (
      incident_id, user_id, amount_cents, operation_id, status
    ) VALUES (
      v_incident.id, v_item.user_id, v_item.amount_cents, v_item.operation_id, 'pending'
    )
    ON CONFLICT (operation_id) DO NOTHING;

    SELECT * INTO v_refund
    FROM public.game_recovery_refunds
    WHERE operation_id = v_item.operation_id
    FOR UPDATE;

    IF v_refund.incident_id <> v_incident.id
       OR v_refund.user_id <> v_item.user_id
       OR v_refund.amount_cents <> v_item.amount_cents THEN
      RAISE EXCEPTION 'operation_id ya pertenece a otro refund';
    END IF;

    IF v_refund.status = 'completed' THEN
      CONTINUE;
    END IF;

    SELECT id INTO v_ledger_id
    FROM public.ledger
    WHERE type = 'refund'
      AND metadata ->> 'operation_id' = v_item.operation_id::text;

    IF FOUND THEN
      IF NOT EXISTS (
        SELECT 1
        FROM public.ledger
        WHERE id = v_ledger_id
          AND user_id = v_item.user_id
          AND amount_cents = v_item.amount_cents
          AND game_id = v_incident.game_id
      ) THEN
        RAISE EXCEPTION 'operation_id ya pertenece a otro crédito de ledger';
      END IF;
    ELSE
      v_ledger_result := public.process_ledger_entry(
        p_user_id := v_item.user_id,
        p_amount_cents := v_item.amount_cents,
        p_type := 'refund',
        p_direction := 'credit',
        p_game_id := v_incident.game_id,
        p_description := 'Reembolso por recuperación de crash',
        p_reference_id := 'recovery-refund-' || v_item.operation_id::text,
        p_metadata := jsonb_build_object(
          'operation_id', v_item.operation_id,
          'recovery_incident_id', v_incident.id,
          'reason', 'recovery_deadline_expired'
        )
      );

      IF v_ledger_result ? 'error' THEN
        RAISE EXCEPTION 'No se pudo crear el crédito de refund: %', v_ledger_result ->> 'error';
      END IF;

      v_ledger_id := (v_ledger_result ->> 'ledger_id')::UUID;
    END IF;

    UPDATE public.game_recovery_refunds
    SET ledger_id = v_ledger_id,
        status = 'completed',
        completed_at = now()
    WHERE id = v_refund.id;

    v_completed_count := v_completed_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'cancelled_crash',
    'completed_refunds', v_completed_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.open_game_recovery_incident(UUID, TEXT, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_game_recovery_incident(UUID, TEXT, TIMESTAMPTZ, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.expire_game_recovery_incident(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_game_recovery_incident(UUID, JSONB) TO service_role;
REVOKE ALL ON FUNCTION public.derive_game_recovery_refunds(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.derive_game_recovery_refunds(UUID) TO service_role;
REVOKE ALL ON FUNCTION public.mark_game_recovery_incident_manual_review(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_game_recovery_incident_manual_review(UUID, TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.resolve_game_recovery_incident(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_game_recovery_incident(UUID) TO service_role;
