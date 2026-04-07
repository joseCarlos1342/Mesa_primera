-- =============================================================================
-- Migration: Transferencias P2P entre jugadores
-- =============================================================================
-- Permite a los jugadores transferir saldo entre sí usando el número de
-- teléfono del destinatario. Incluye:
--   1. Actualizar process_ledger_entry para aceptar tipo 'transfer'
--   2. RPC lookup_user_by_phone (SECURITY DEFINER — accede a auth.users)
--   3. RPC transfer_between_players (atómico: 2 entradas en el ledger)
--   4. Actualizar RLS del ledger para que jugadores vean sus transfers
--   5. Índice parcial para consultas de transferencias
-- =============================================================================

-- ─────────────────────────────────────────
-- 1. Actualizar process_ledger_entry para aceptar 'transfer'
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.process_ledger_entry(
  p_user_id      UUID,
  p_amount_cents  INT,
  p_type          TEXT,
  p_direction     TEXT,
  p_game_id       UUID DEFAULT NULL,
  p_table_id      UUID DEFAULT NULL,
  p_description   TEXT DEFAULT NULL,
  p_reference_id  TEXT DEFAULT NULL,
  p_counterpart_id UUID DEFAULT NULL,
  p_approved_by   UUID DEFAULT NULL,
  p_metadata      JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance BIGINT;
  v_new_balance     BIGINT;
  v_ledger_id       UUID;
BEGIN
  -- Validate direction
  IF p_direction NOT IN ('credit', 'debit') THEN
    RETURN jsonb_build_object('error', 'Dirección inválida: debe ser credit o debit');
  END IF;

  -- Validate amount
  IF p_amount_cents <= 0 THEN
    RETURN jsonb_build_object('error', 'El monto debe ser positivo');
  END IF;

  -- Validate type (ahora incluye 'transfer')
  IF p_type NOT IN ('deposit', 'withdrawal', 'bet', 'win', 'rake', 'refund', 'adjustment', 'transfer') THEN
    RETURN jsonb_build_object('error', 'Tipo de transacción inválido');
  END IF;

  -- Calculate current balance from the LAST ledger entry (most recent)
  SELECT COALESCE(balance_after_cents, 0)
  INTO v_current_balance
  FROM public.ledger
  WHERE user_id = p_user_id
  ORDER BY created_at DESC, id DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    v_current_balance := 0;
  END IF;

  -- Calculate new balance
  IF p_direction = 'credit' THEN
    v_new_balance := v_current_balance + p_amount_cents;
  ELSE
    v_new_balance := v_current_balance - p_amount_cents;
  END IF;

  -- Prevent negative balance
  IF v_new_balance < 0 THEN
    RETURN jsonb_build_object(
      'error', 'Saldo insuficiente',
      'current_balance', v_current_balance,
      'requested', p_amount_cents
    );
  END IF;

  -- INSERT the immutable ledger entry
  INSERT INTO public.ledger (
    user_id, game_id, table_id, counterpart_id,
    type, direction, amount_cents,
    balance_before_cents, balance_after_cents,
    description, reference_id, approved_by,
    status, metadata
  ) VALUES (
    p_user_id, p_game_id, p_table_id, p_counterpart_id,
    p_type, p_direction, p_amount_cents,
    v_current_balance, v_new_balance,
    p_description, p_reference_id, p_approved_by,
    'completed', p_metadata
  )
  RETURNING id INTO v_ledger_id;

  -- Keep wallets table in sync
  UPDATE public.wallets
  SET balance_cents = v_new_balance,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, balance_cents, currency)
    VALUES (p_user_id, v_new_balance, 'COP')
    ON CONFLICT (user_id) DO UPDATE SET balance_cents = v_new_balance, updated_at = NOW();
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'ledger_id', v_ledger_id,
    'balance_before', v_current_balance,
    'balance_after', v_new_balance
  );
END;
$$;


-- ─────────────────────────────────────────
-- 2. RPC: Buscar usuario por teléfono
-- ─────────────────────────────────────────
-- SECURITY DEFINER para acceder a auth.users.phone de forma segura.
-- Solo retorna datos públicos del perfil, nunca datos de auth.
CREATE OR REPLACE FUNCTION public.lookup_user_by_phone(p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_profile RECORD;
BEGIN
  -- Validar input
  IF p_phone IS NULL OR length(trim(p_phone)) < 6 THEN
    RETURN jsonb_build_object('found', false, 'error', 'Número de teléfono inválido');
  END IF;

  -- Buscar en auth.users por teléfono
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE phone = trim(p_phone)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  -- No permitir auto-búsqueda
  IF v_user_id = auth.uid() THEN
    RETURN jsonb_build_object('found', false, 'error', 'No puedes transferirte a ti mismo');
  END IF;

  -- Obtener datos públicos del perfil
  SELECT p.id, p.username, p.avatar_url, p.level
  INTO v_profile
  FROM public.profiles p
  WHERE p.id = v_user_id;

  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'user_id', v_profile.id,
    'username', v_profile.username,
    'avatar_url', v_profile.avatar_url,
    'level', v_profile.level
  );
END;
$$;

-- Solo usuarios autenticados pueden llamar esta función
REVOKE ALL ON FUNCTION public.lookup_user_by_phone(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_user_by_phone(TEXT) TO authenticated;


-- ─────────────────────────────────────────
-- 3. RPC: Transferencia atómica entre jugadores
-- ─────────────────────────────────────────
-- Ejecuta dos llamadas a process_ledger_entry dentro de una misma transacción.
-- Si cualquiera falla, se hace ROLLBACK completo.
CREATE OR REPLACE FUNCTION public.transfer_between_players(
  p_recipient_id   UUID,
  p_amount_cents   INT,
  p_description    TEXT DEFAULT NULL
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
  -- El sender siempre es el usuario autenticado
  v_sender_id := auth.uid();

  IF v_sender_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No autenticado');
  END IF;

  -- No permitir auto-transferencia
  IF v_sender_id = p_recipient_id THEN
    RETURN jsonb_build_object('error', 'No puedes transferirte a ti mismo');
  END IF;

  -- Validar monto mínimo ($100 COP = 10,000 centavos)
  IF p_amount_cents < 10000 THEN
    RETURN jsonb_build_object('error', 'El monto mínimo de transferencia es $100');
  END IF;

  -- Validar que el destinatario existe
  SELECT username INTO v_recipient_name
  FROM public.profiles
  WHERE id = p_recipient_id;

  IF v_recipient_name IS NULL THEN
    RETURN jsonb_build_object('error', 'Destinatario no encontrado');
  END IF;

  -- Obtener nombre del sender para la descripción
  SELECT username INTO v_sender_name
  FROM public.profiles
  WHERE id = v_sender_id;

  -- Generar reference_id compartido para vincular ambas entradas del ledger
  v_reference_id := 'transfer-' || gen_random_uuid()::text;

  -- 1. Débito al sender
  v_debit_result := public.process_ledger_entry(
    p_user_id       := v_sender_id,
    p_amount_cents   := p_amount_cents,
    p_type           := 'transfer',
    p_direction      := 'debit',
    p_counterpart_id := p_recipient_id,
    p_description    := COALESCE(p_description, 'Transferencia enviada a ' || v_recipient_name),
    p_reference_id   := v_reference_id,
    p_metadata       := jsonb_build_object(
      'transfer_type', 'sent',
      'counterpart_name', v_recipient_name
    )
  );

  -- Si el débito falla (ej: saldo insuficiente), abortar
  IF v_debit_result ? 'error' THEN
    RETURN v_debit_result;
  END IF;

  -- 2. Crédito al destinatario
  v_credit_result := public.process_ledger_entry(
    p_user_id       := p_recipient_id,
    p_amount_cents   := p_amount_cents,
    p_type           := 'transfer',
    p_direction      := 'credit',
    p_counterpart_id := v_sender_id,
    p_description    := 'Transferencia recibida de ' || v_sender_name,
    p_reference_id   := v_reference_id,
    p_metadata       := jsonb_build_object(
      'transfer_type', 'received',
      'counterpart_name', v_sender_name
    )
  );

  -- Si el crédito falla (no debería, pero por seguridad), abortar
  IF v_credit_result ? 'error' THEN
    -- RAISE EXCEPTION forzará ROLLBACK de ambas operaciones
    RAISE EXCEPTION 'Error al acreditar al destinatario: %', v_credit_result->>'error';
  END IF;

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

-- Solo usuarios autenticados pueden llamar esta función
REVOKE ALL ON FUNCTION public.transfer_between_players(UUID, INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_between_players(UUID, INT, TEXT) TO authenticated;


-- ─────────────────────────────────────────
-- 4. Actualizar RLS del ledger: jugadores ven sus transferencias
-- ─────────────────────────────────────────
DROP POLICY IF EXISTS "Players see only vault transactions" ON public.ledger;

CREATE POLICY "Players see only vault transactions"
  ON public.ledger FOR SELECT
  TO authenticated
  USING (
    CASE
      -- Admins ven todo
      WHEN EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      THEN true
      -- Jugadores ven sus propias transacciones de bóveda + transferencias
      ELSE user_id = auth.uid() AND type IN ('deposit', 'withdrawal', 'refund', 'adjustment', 'admin_adjustment', 'transfer')
    END
  );


-- ─────────────────────────────────────────
-- 5. Índice parcial para consultas de transferencias
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ledger_transfers
  ON public.ledger (user_id, created_at DESC)
  WHERE type = 'transfer';

CREATE INDEX IF NOT EXISTS idx_ledger_counterpart
  ON public.ledger (counterpart_id, created_at DESC)
  WHERE counterpart_id IS NOT NULL;
