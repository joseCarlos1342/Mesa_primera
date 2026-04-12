-- Migration: Permitir que transfer_between_players acepte p_sender_id explícito
-- para uso desde el game-server con service_role (donde auth.uid() es NULL).
--
-- Seguridad: Si p_sender_id es provisto Y auth.uid() es NULL (service_role),
-- se usa p_sender_id. Si auth.uid() tiene valor (cliente web), se ignora
-- p_sender_id y se usa auth.uid() siempre.

CREATE OR REPLACE FUNCTION public.transfer_between_players(
  p_recipient_id   UUID,
  p_amount_cents   INT,
  p_description    TEXT DEFAULT NULL,
  p_sender_id      UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id    UUID;
  v_reference_id TEXT;
  v_debit_result JSONB;
  v_credit_result JSONB;
  v_sender_name  TEXT;
  v_recipient_name TEXT;
BEGIN
  -- Si hay un usuario autenticado (cliente web), siempre usar auth.uid()
  -- Solo usar p_sender_id cuando auth.uid() es NULL (service_role desde game-server)
  v_sender_id := COALESCE(auth.uid(), p_sender_id);

  IF v_sender_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No autenticado');
  END IF;

  IF v_sender_id = p_recipient_id THEN
    RETURN jsonb_build_object('error', 'No puedes transferirte a ti mismo');
  END IF;

  -- Monto mínimo: $1.000 COP = 100,000 centavos
  IF p_amount_cents < 100000 THEN
    RETURN jsonb_build_object('error', 'El monto mínimo de transferencia es $1.000');
  END IF;

  -- Múltiplo de $1.000 COP
  IF (p_amount_cents % 100000) <> 0 THEN
    RETURN jsonb_build_object('error', 'El monto debe ser múltiplo de $1.000 COP');
  END IF;

  SELECT username INTO v_recipient_name
  FROM public.profiles
  WHERE id = p_recipient_id;

  IF v_recipient_name IS NULL THEN
    RETURN jsonb_build_object('error', 'Destinatario no encontrado');
  END IF;

  SELECT username INTO v_sender_name
  FROM public.profiles
  WHERE id = v_sender_id;

  v_reference_id := 'transfer-' || v_sender_id::text || '-' || p_recipient_id::text || '-' || extract(epoch from now())::text;

  -- Debit sender
  v_debit_result := public.process_ledger_entry(
    p_user_id       := v_sender_id,
    p_amount_cents   := p_amount_cents,
    p_type           := 'transfer',
    p_direction      := 'debit',
    p_description    := COALESCE(p_description, 'Transferencia a ' || COALESCE(v_recipient_name, 'usuario')),
    p_reference_id   := v_reference_id,
    p_counterpart_id := p_recipient_id
  );

  IF v_debit_result ? 'error' THEN
    RETURN v_debit_result;
  END IF;

  -- Credit recipient
  v_credit_result := public.process_ledger_entry(
    p_user_id       := p_recipient_id,
    p_amount_cents   := p_amount_cents,
    p_type           := 'transfer',
    p_direction      := 'credit',
    p_description    := 'Transferencia de ' || COALESCE(v_sender_name, 'usuario'),
    p_reference_id   := v_reference_id,
    p_counterpart_id := v_sender_id
  );

  IF v_credit_result ? 'error' THEN
    RETURN v_credit_result;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'debit_result', v_debit_result,
    'credit_result', v_credit_result,
    'sender', v_sender_name,
    'recipient', v_recipient_name
  );
END;
$$;

-- Mantener permisos: authenticated (web) y service_role (game-server) pueden invocar
REVOKE ALL ON FUNCTION public.transfer_between_players(UUID, INT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_between_players(UUID, INT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_between_players(UUID, INT, TEXT, UUID) TO service_role;
