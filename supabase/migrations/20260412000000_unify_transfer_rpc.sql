-- Migration: Unificar transfer_between_players en una sola firma de 4 parámetros
-- y eliminar la sobrecarga legacy de 3 parámetros que causa ambigüedad en PostgREST.
--
-- Problema: Conviven dos overloads —(UUID, INT, TEXT) y (UUID, INT, TEXT, UUID)—
-- y Wallet llamaba sin p_sender_id, cayendo en la firma vieja que usa solo auth.uid().
-- Dentro de SECURITY DEFINER, auth.uid() puede ser NULL, causando fallo silencioso.
--
-- Solución:
--   1. DROP explícito de la firma legacy de 3 args.
--   2. CREATE OR REPLACE de la firma de 4 args con contrato de respuesta completo
--      (reference_id, sender_balance_after, recipient_balance_after, sender_name,
--       recipient_name, amount_cents) que ambos callers (web + game-server) esperan.

-- 1. Eliminar la sobrecarga legacy
DROP FUNCTION IF EXISTS public.transfer_between_players(UUID, INT, TEXT);

-- 2. Reemplazar la función activa con contrato de respuesta normalizado
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
  v_sender_id      UUID;
  v_reference_id   TEXT;
  v_debit_result   JSONB;
  v_credit_result  JSONB;
  v_sender_name    TEXT;
  v_recipient_name TEXT;
BEGIN
  -- Si hay un usuario autenticado (cliente web), siempre usar auth.uid().
  -- Solo usar p_sender_id cuando auth.uid() es NULL (service_role desde game-server).
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
    p_user_id        := v_sender_id,
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
    p_user_id        := p_recipient_id,
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

  -- Contrato de respuesta normalizado para web y game-server
  RETURN jsonb_build_object(
    'success', true,
    'reference_id', v_reference_id,
    'sender_balance_after', (v_debit_result->>'balance_after')::bigint,
    'recipient_balance_after', (v_credit_result->>'balance_after')::bigint,
    'sender_name', v_sender_name,
    'recipient_name', v_recipient_name,
    'amount_cents', p_amount_cents
  );
END;
$$;

-- Permisos: authenticated (web) y service_role (game-server) pueden invocar
REVOKE ALL ON FUNCTION public.transfer_between_players(UUID, INT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_between_players(UUID, INT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_between_players(UUID, INT, TEXT, UUID) TO service_role;
