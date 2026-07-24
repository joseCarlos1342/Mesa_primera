CREATE OR REPLACE FUNCTION public.notify_admins(
    p_type TEXT,
    p_title TEXT,
    p_body TEXT,
    p_data JSONB DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    inserted_count INTEGER;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Admin authorization required';
    END IF;

    INSERT INTO public.notifications (user_id, type, title, body, data)
    SELECT id, p_type, p_title, p_body, p_data
    FROM public.profiles
    WHERE role = 'admin';

    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RETURN inserted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_user(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_body TEXT,
    p_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    notification_id UUID;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Admin authorization required';
    END IF;

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (p_user_id, p_type, p_title, p_body, p_data)
    RETURNING id INTO notification_id;

    RETURN notification_id;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_admins(TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_admins(TEXT, TEXT, TEXT, JSONB) TO authenticated;
REVOKE ALL ON FUNCTION public.notify_user(UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_user(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_financial_request_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    request_label TEXT := CASE WHEN TG_TABLE_NAME = 'deposit_requests' THEN 'recarga' ELSE 'retiro' END;
    request_type TEXT := CASE WHEN TG_TABLE_NAME = 'deposit_requests' THEN 'deposit' ELSE 'withdrawal' END;
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.notifications (user_id, type, title, body, data)
        SELECT id,
               request_type || '_request',
               'Nueva solicitud de ' || request_label,
               'Un jugador ha enviado una solicitud para revisión.',
               jsonb_build_object('url', '/admin/' || CASE WHEN request_type = 'deposit' THEN 'deposits' ELSE 'withdrawals' END, 'requestId', NEW.id)
        FROM public.profiles
        WHERE role = 'admin';
    ELSIF TG_OP = 'UPDATE'
      AND NEW.status IS DISTINCT FROM OLD.status
      AND NEW.status IN ('approved', 'rejected') THEN
        INSERT INTO public.notifications (user_id, type, title, body, data)
        VALUES (
            NEW.user_id,
            request_type || '_' || CASE WHEN NEW.status = 'approved' THEN 'success' ELSE 'failed' END,
            CASE WHEN NEW.status = 'approved' THEN 'Solicitud aprobada' ELSE 'Solicitud rechazada' END,
            CASE WHEN NEW.status = 'approved'
                 THEN 'Tu solicitud financiera fue aprobada.'
                 ELSE 'Tu solicitud financiera fue rechazada. Revisa el detalle en tu billetera.'
            END,
            jsonb_build_object('url', '/wallet', 'requestId', NEW.id)
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deposit_requests_notification_event ON public.deposit_requests;
CREATE TRIGGER deposit_requests_notification_event
AFTER INSERT OR UPDATE OF status ON public.deposit_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_financial_request_event();

DROP TRIGGER IF EXISTS withdrawal_requests_notification_event ON public.withdrawal_requests;
CREATE TRIGGER withdrawal_requests_notification_event
AFTER INSERT OR UPDATE OF status ON public.withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_financial_request_event();

DROP FUNCTION IF EXISTS public.notify_social_user(UUID, TEXT, TEXT, TEXT, JSONB);
CREATE OR REPLACE FUNCTION public.notify_social_user(p_user_id UUID, p_type TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    notification_id UUID;
    allowed BOOLEAN := FALSE;
BEGIN
    IF auth.uid() IS NULL OR p_type NOT IN ('friend_request', 'friend_accepted', 'direct_message', 'game_invite') THEN
        RAISE EXCEPTION 'Invalid social notification';
    END IF;

    IF p_type = 'friend_request' THEN
        allowed := EXISTS (
            SELECT 1 FROM public.friendships
            WHERE user_id = auth.uid() AND friend_id = p_user_id AND status = 'pending'
        );
    ELSIF p_type = 'friend_accepted' THEN
        allowed := EXISTS (
            SELECT 1 FROM public.friendships
            WHERE user_id = p_user_id AND friend_id = auth.uid() AND status = 'accepted'
        );
    ELSIF p_type = 'game_invite' THEN
        allowed := EXISTS (
            SELECT 1 FROM public.friendships
            WHERE status = 'accepted'
              AND ((user_id = auth.uid() AND friend_id = p_user_id)
                OR (friend_id = auth.uid() AND user_id = p_user_id))
        );
    ELSE
        allowed := EXISTS (
            SELECT 1 FROM public.direct_messages
            WHERE sender_id = auth.uid() AND receiver_id = p_user_id
        );
    END IF;

    IF NOT allowed THEN
        RAISE EXCEPTION 'Social notification is not authorized';
    END IF;

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
        p_user_id,
        p_type,
        CASE p_type
            WHEN 'friend_request' THEN 'Solicitud de amistad'
            WHEN 'friend_accepted' THEN 'Solicitud aceptada'
            WHEN 'direct_message' THEN 'Mensaje nuevo'
            ELSE 'Invitación a jugar'
        END,
        CASE p_type
            WHEN 'friend_request' THEN 'Tienes una nueva solicitud de amistad.'
            WHEN 'friend_accepted' THEN 'Tu solicitud de amistad fue aceptada.'
            WHEN 'direct_message' THEN 'Tienes un mensaje nuevo.'
            ELSE 'Un amigo te invitó a jugar.'
        END,
        jsonb_build_object('senderId', auth.uid())
    )
    RETURNING id INTO notification_id;
    RETURN notification_id;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_social_user(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_social_user(UUID, TEXT) TO authenticated;
