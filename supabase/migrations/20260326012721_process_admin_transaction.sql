CREATE OR REPLACE FUNCTION public.process_admin_transaction(
    p_request_id UUID,
    p_status TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_request RECORD;
    v_wallet RECORD;
    v_new_balance BIGINT;
    v_type TEXT;
BEGIN
    -- 1. Validar que el usuario sea administrador
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RETURN jsonb_build_object('error', 'No autorizado');
    END IF;

    -- 2. Buscar y bloquear la solicitud (primero intentamos en deposit_requests)
    SELECT * INTO v_request 
    FROM deposit_requests 
    WHERE id = p_request_id 
    FOR UPDATE;

    IF FOUND THEN
        v_type := 'deposit';
    ELSE
        -- Si no está, intentamos en withdrawal_requests
        SELECT * INTO v_request 
        FROM withdrawal_requests 
        WHERE id = p_request_id 
        FOR UPDATE;

        IF FOUND THEN
            v_type := 'withdrawal';
        ELSE
            RETURN jsonb_build_object('error', 'Solicitud no encontrada');
        END IF;
    END IF;

    -- 3. Validar estado de la solicitud
    IF v_request.status != 'pending' THEN
        RETURN jsonb_build_object('error', 'La solicitud ya fue procesada');
    END IF;

    IF p_status != 'completed' AND p_status != 'failed' THEN
        RETURN jsonb_build_object('error', 'Estado inválido');
    END IF;

    -- 4. Si es completada, actualizar la billetera y el historial (ledger)
    IF p_status = 'completed' THEN
        SELECT * INTO v_wallet 
        FROM wallets 
        WHERE user_id = v_request.user_id 
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('error', 'Wallet no encontrada');
        END IF;

        v_new_balance := v_wallet.balance_cents;

        IF v_type = 'deposit' THEN
            v_new_balance := v_new_balance + v_request.amount_cents;
        ELSE
            IF v_new_balance < v_request.amount_cents THEN
                RETURN jsonb_build_object('error', 'Saldo insuficiente');
            END IF;
            v_new_balance := v_new_balance - v_request.amount_cents;
        END IF;

        -- Actualizar balance
        UPDATE wallets 
        SET balance_cents = v_new_balance,
            updated_at = NOW()
        WHERE id = v_wallet.id;

        -- Crear registro en el historial (ledger)
        INSERT INTO ledger (user_id, amount_cents, type, direction, balance_after_cents, reference_id)
        VALUES (
            v_request.user_id, 
            v_request.amount_cents, 
            v_type, 
            CASE WHEN v_type = 'deposit' THEN 'credit' ELSE 'debit' END, 
            v_new_balance, 
            p_request_id
        );
    END IF;

    -- 5. Actualizar el estado de la solicitud
    IF v_type = 'deposit' THEN
        UPDATE deposit_requests 
        SET status = p_status, 
            updated_at = NOW() 
        WHERE id = p_request_id;
    ELSE
        UPDATE withdrawal_requests 
        SET status = p_status, 
            updated_at = NOW() 
        WHERE id = p_request_id;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;
