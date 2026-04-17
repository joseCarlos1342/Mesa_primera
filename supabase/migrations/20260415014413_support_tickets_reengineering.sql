-- =============================================================
-- Migration: Help Desk Reengineering
-- =============================================================
-- Creates support_tickets as canonical source of truth,
-- support_attachments for file metadata, storage bucket,
-- and backfills tickets from existing support_messages data.
-- =============================================================

-- ─── 1. SUPPORT TICKETS ──────────────────────────────────────

CREATE TABLE public.support_tickets (
    id              UUID PRIMARY KEY,  -- matches existing ticket_id UUIDs
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'attended', 'finalized')),
    closed_at       TIMESTAMPTZ,
    closed_by       UUID REFERENCES public.profiles(id),
    closed_by_role  TEXT CHECK (closed_by_role IN ('player', 'admin')),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_from TEXT NOT NULL DEFAULT 'player'
                      CHECK (last_message_from IN ('player', 'admin')),
    last_message_preview TEXT,
    message_count   INTEGER NOT NULL DEFAULT 0,
    attachment_count INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_support_tickets_user_id   ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_status    ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_created   ON public.support_tickets(created_at DESC);
CREATE INDEX idx_support_tickets_updated   ON public.support_tickets(updated_at DESC);

-- ─── 2. SUPPORT ATTACHMENTS ─────────────────────────────────

CREATE TABLE public.support_attachments (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id     UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    message_id    UUID REFERENCES public.support_messages(id),
    uploaded_by   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    storage_path  TEXT NOT NULL,
    file_name     TEXT NOT NULL,
    mime_type     TEXT NOT NULL,
    size_bytes    INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760), -- max 10MB
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_support_attachments_ticket ON public.support_attachments(ticket_id);

-- ─── 3. STORAGE BUCKET ──────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support-attachments',
  'support-attachments',
  false,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- ─── 4. RLS: SUPPORT TICKETS ────────────────────────────────

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Players see own tickets
CREATE POLICY "Users can view own tickets"
ON public.support_tickets FOR SELECT
USING (user_id = (SELECT auth.uid()));

-- Admins see all tickets
CREATE POLICY "Admins can view all tickets"
ON public.support_tickets FOR SELECT
USING ((SELECT is_admin()));

-- Players can create their own tickets
CREATE POLICY "Users can create own tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

-- Admins can update any ticket (status transitions)
CREATE POLICY "Admins can update tickets"
ON public.support_tickets FOR UPDATE
USING ((SELECT is_admin()));

-- Players can update own tickets (only to finalize)
CREATE POLICY "Users can update own tickets"
ON public.support_tickets FOR UPDATE
USING (user_id = (SELECT auth.uid()));

-- No deletes (audit trail)
CREATE POLICY "No deletes on tickets"
ON public.support_tickets FOR DELETE
USING (false);

-- ─── 5. RLS: SUPPORT ATTACHMENTS ────────────────────────────

ALTER TABLE public.support_attachments ENABLE ROW LEVEL SECURITY;

-- Players see attachments of own tickets
CREATE POLICY "Users can view own ticket attachments"
ON public.support_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_id AND t.user_id = (SELECT auth.uid())
  )
);

-- Admins see all attachments
CREATE POLICY "Admins can view all attachments"
ON public.support_attachments FOR SELECT
USING ((SELECT is_admin()));

-- Players can insert attachments to their own open tickets
CREATE POLICY "Users can add attachments to own open tickets"
ON public.support_attachments FOR INSERT
WITH CHECK (
  uploaded_by = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_id
      AND t.user_id = (SELECT auth.uid())
      AND t.status != 'finalized'
  )
);

-- Admins can insert attachments to any open ticket
CREATE POLICY "Admins can add attachments to open tickets"
ON public.support_attachments FOR INSERT
WITH CHECK (
  (SELECT is_admin())
  AND EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_id AND t.status != 'finalized'
  )
);

-- No deletes (immutable history)
CREATE POLICY "No deletes on attachments"
ON public.support_attachments FOR DELETE
USING (false);

-- No updates on attachments
CREATE POLICY "No updates on attachments"
ON public.support_attachments FOR UPDATE
USING (false);

-- ─── 6. RLS: STORAGE OBJECTS (support-attachments bucket) ───

CREATE POLICY "Users can upload support attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'support-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view own support attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'support-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins can view all support attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'support-attachments'
  AND (SELECT public.is_admin())
);

-- ─── 7. HARDEN SUPPORT MESSAGES (append-only) ──────────────

-- Block updates on support_messages (state lives in tickets now)
DROP POLICY IF EXISTS "No updates on support messages" ON public.support_messages;
CREATE POLICY "No updates on support messages"
ON public.support_messages FOR UPDATE
USING (false);

-- Block deletes on support_messages
DROP POLICY IF EXISTS "No deletes on support messages" ON public.support_messages;
CREATE POLICY "No deletes on support messages"
ON public.support_messages FOR DELETE
USING (false);

-- Admins can insert support messages (replies)
DROP POLICY IF EXISTS "Admins can insert support messages" ON public.support_messages;
CREATE POLICY "Admins can insert support messages"
ON public.support_messages FOR INSERT
WITH CHECK ((SELECT is_admin()));

-- ─── 8. ADD FK FROM MESSAGES TO TICKETS ─────────────────────

-- Add foreign key (deferred so backfill runs first)
-- We'll add it after backfill below

-- ─── 9. CLOSE TICKET RPC ────────────────────────────────────

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
  v_ticket support_tickets%ROWTYPE;
  v_caller_id UUID := auth.uid();
  v_is_admin BOOLEAN := is_admin();
  v_role TEXT;
BEGIN
  -- Determine role
  IF p_role IS NOT NULL THEN
    v_role := p_role;
  ELSIF v_is_admin THEN
    v_role := 'admin';
  ELSE
    v_role := 'player';
  END IF;

  -- Lock and fetch
  SELECT * INTO v_ticket
  FROM support_tickets
  WHERE id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ticket not found');
  END IF;

  -- Authorization: owner or admin
  IF v_ticket.user_id != v_caller_id AND NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Already finalized
  IF v_ticket.status = 'finalized' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already finalized');
  END IF;

  -- Update ticket
  UPDATE support_tickets
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

-- ─── 10. APPEND MESSAGE RPC (validates ticket is open) ──────

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
  v_ticket support_tickets%ROWTYPE;
  v_caller_id UUID := auth.uid();
  v_is_admin BOOLEAN := is_admin();
  v_msg_id UUID;
  v_from TEXT;
BEGIN
  -- Validate input
  IF p_message IS NULL OR length(trim(p_message)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Empty message');
  END IF;

  -- Lock ticket
  SELECT * INTO v_ticket
  FROM support_tickets
  WHERE id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ticket not found');
  END IF;

  -- Authorization
  IF v_ticket.user_id != v_caller_id AND NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Block writes to finalized tickets
  IF v_ticket.status = 'finalized' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ticket is finalized');
  END IF;

  -- Determine sender
  v_from := CASE WHEN p_from_admin OR v_is_admin THEN 'admin' ELSE 'player' END;

  -- Insert message
  INSERT INTO support_messages (user_id, message, from_admin, ticket_id, is_resolved)
  VALUES (v_ticket.user_id, trim(p_message), (v_from = 'admin'), p_ticket_id, false)
  RETURNING id INTO v_msg_id;

  -- Update ticket counters and status
  UPDATE support_tickets
  SET message_count = message_count + 1,
      last_message_at = NOW(),
      last_message_from = v_from,
      last_message_preview = left(trim(p_message), 100),
      updated_at = NOW(),
      -- Auto-transition from pending to attended when admin replies
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

-- ─── 11. BACKFILL: Create tickets from existing data ────────

INSERT INTO public.support_tickets (id, user_id, status, last_message_at, last_message_from, last_message_preview, message_count, created_at, updated_at, closed_at)
SELECT
  sm.ticket_id,
  sm.user_id,
  CASE WHEN bool_or(sm.is_resolved) THEN 'finalized' ELSE 'pending' END AS status,
  MAX(sm.created_at) AS last_message_at,
  CASE WHEN (array_agg(sm.from_admin ORDER BY sm.created_at DESC))[1] THEN 'admin' ELSE 'player' END AS last_message_from,
  left((array_agg(sm.message ORDER BY sm.created_at DESC))[1], 100) AS last_message_preview,
  COUNT(*)::INTEGER AS message_count,
  MIN(sm.created_at) AS created_at,
  MAX(sm.created_at) AS updated_at,
  CASE WHEN bool_or(sm.is_resolved) THEN MAX(sm.created_at) ELSE NULL END AS closed_at
FROM public.support_messages sm
GROUP BY sm.ticket_id, sm.user_id
ON CONFLICT (id) DO NOTHING;

-- ─── 12. ADD FK (now that backfill is done) ─────────────────

ALTER TABLE public.support_messages
  ADD CONSTRAINT fk_support_messages_ticket
  FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id);

-- ─── 13. REALTIME ───────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;

-- ─── 14. GRANT EXECUTE ON RPCs ──────────────────────────────

GRANT EXECUTE ON FUNCTION public.close_support_ticket(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.append_support_message(UUID, TEXT, BOOLEAN) TO authenticated;
