-- Notification delivery outbox.
-- The in-app notification remains the source of truth; this table only tracks
-- best-effort external delivery and is never exposed to clients.

CREATE TABLE notification_outbox (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL UNIQUE REFERENCES public.notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'accepted', 'failed')),
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    claim_token UUID,
    available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    claimed_at TIMESTAMPTZ,
    provider_message_id TEXT,
    last_error TEXT,
    accepted_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notification_outbox_pending_idx
    ON notification_outbox (available_at, created_at)
    WHERE status = 'pending';

ALTER TABLE notification_outbox ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.enqueue_notification_outbox()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.user_id IS NULL THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.notification_outbox (notification_id, user_id)
    VALUES (NEW.id, NEW.user_id)
    ON CONFLICT (notification_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_enqueue_outbox ON public.notifications;
CREATE TRIGGER notifications_enqueue_outbox
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_notification_outbox();

CREATE OR REPLACE FUNCTION public.claim_notification_outbox(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    id UUID,
    notification_id UUID,
    user_id UUID,
    title TEXT,
    body TEXT,
    data JSONB,
    attempts INTEGER,
    claim_token UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH candidates AS (
        SELECT o.id
        FROM public.notification_outbox o
        WHERE (
            (o.status = 'pending' AND o.available_at <= NOW())
            OR (o.status = 'processing' AND o.claimed_at < NOW() - INTERVAL '5 minutes')
        )
        ORDER BY o.created_at
        FOR UPDATE SKIP LOCKED
        LIMIT LEAST(GREATEST(p_limit, 1), 200)
    ), claimed AS (
        UPDATE public.notification_outbox o
        SET status = 'processing',
            claimed_at = NOW(),
            claim_token = gen_random_uuid(),
            attempts = o.attempts + 1,
            updated_at = NOW()
        FROM candidates c
        WHERE o.id = c.id
        RETURNING o.*
    )
    SELECT c.id, c.notification_id, c.user_id, n.title, n.body, n.data, c.attempts, c.claim_token
    FROM claimed c
    JOIN public.notifications n ON n.id = c.notification_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_notification_outbox(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_outbox(INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION public.touch_notification_outbox_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER notification_outbox_updated_at
BEFORE UPDATE ON public.notification_outbox
FOR EACH ROW
EXECUTE FUNCTION public.touch_notification_outbox_updated_at();

REVOKE ALL ON public.notification_outbox FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notification_outbox TO service_role;
