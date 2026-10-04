-- Support RPC hardening: derive sender/closer role from auth.uid().

CREATE OR REPLACE FUNCTION public.close_support_ticket(
  p_ticket_id UUID,
  p_role TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket public.support_tickets%ROWTYPE;
  v_caller_id UUID := auth.uid();
  v_is_admin BOOLEAN := COALESCE(public.is_admin(), false);
  v_role TEXT;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  v_role := CASE WHEN v_is_admin THEN 'admin' ELSE 'player' END;

  SELECT * INTO v_ticket
  FROM public.support_tickets
  WHERE id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ticket not found');
  END IF;

  IF v_ticket.user_id IS DISTINCT FROM v_caller_id AND NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF v_ticket.status = 'finalized' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already finalized');
  END IF;

  UPDATE public.support_tickets
  SET status = 'finalized',
      closed_at = NOW(),
      closed_by = v_caller_id,
      closed_by_role = v_role,
      updated_at = NOW()
  WHERE id = p_ticket_id;

  RETURN jsonb_build_object(
    'success', true,
    'ticket_id', p_ticket_id,
    'closed_by_role', v_role
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.append_support_message(
  p_ticket_id UUID,
  p_message TEXT,
  p_from_admin BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket public.support_tickets%ROWTYPE;
  v_caller_id UUID := auth.uid();
  v_is_admin BOOLEAN := COALESCE(public.is_admin(), false);
  v_msg_id UUID;
  v_from TEXT;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_message IS NULL OR length(trim(p_message)) = 0 OR length(trim(p_message)) > 5000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid message');
  END IF;

  SELECT * INTO v_ticket
  FROM public.support_tickets
  WHERE id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ticket not found');
  END IF;

  IF v_ticket.user_id IS DISTINCT FROM v_caller_id AND NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF v_ticket.status = 'finalized' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ticket is finalized');
  END IF;

  v_from := CASE WHEN v_is_admin THEN 'admin' ELSE 'player' END;

  INSERT INTO public.support_messages (user_id, message, from_admin, ticket_id, is_resolved)
  VALUES (v_ticket.user_id, trim(p_message), v_is_admin, p_ticket_id, false)
  RETURNING id INTO v_msg_id;

  UPDATE public.support_tickets
  SET message_count = message_count + 1,
      last_message_at = NOW(),
      last_message_from = v_from,
      last_message_preview = left(trim(p_message), 100),
      updated_at = NOW(),
      status = CASE
        WHEN v_from = 'admin' AND status = 'pending' THEN 'attended'
        ELSE status
      END
  WHERE id = p_ticket_id;

  RETURN jsonb_build_object(
    'success', true,
    'message_id', v_msg_id,
    'ticket_id', p_ticket_id,
    'from', v_from
  );
END;
$$;

REVOKE ALL ON FUNCTION public.close_support_ticket(UUID, TEXT) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.close_support_ticket(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.append_support_message(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.append_support_message(UUID, TEXT, BOOLEAN) TO authenticated;
