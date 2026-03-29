-- =============================================================
-- Migration: Table Help Requests ("Llamar al Admin")
-- =============================================================
-- Allows players at a game table to request admin assistance.
-- Admins receive real-time alerts via Supabase Realtime.
-- =============================================================

-- 1. Table
CREATE TABLE public.table_help_requests (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    room_id    TEXT NOT NULL,            -- Colyseus room ID
    reason     TEXT NOT NULL CHECK (reason IN ('dispute', 'unfair_play', 'technical', 'other')),
    message    TEXT,                     -- optional player description
    status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'attending', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.profiles(id),
    admin_notes TEXT
);

-- 2. Indexes
CREATE INDEX idx_table_help_requests_user    ON public.table_help_requests(user_id);
CREATE INDEX idx_table_help_requests_room    ON public.table_help_requests(room_id);
CREATE INDEX idx_table_help_requests_status  ON public.table_help_requests(status);
CREATE INDEX idx_table_help_requests_created ON public.table_help_requests(created_at DESC);

-- 3. RLS
ALTER TABLE public.table_help_requests ENABLE ROW LEVEL SECURITY;

-- Players can view their own requests
CREATE POLICY "Users can view own help requests"
ON public.table_help_requests FOR SELECT
USING (user_id = auth.uid());

-- Players can insert their own requests (max 1 pending per room enforced in app)
CREATE POLICY "Users can create help requests"
ON public.table_help_requests FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Admin can view all requests
CREATE POLICY "Admins can view all help requests"
ON public.table_help_requests FOR SELECT
USING ((SELECT is_admin()));

-- Admin can update requests (attend, resolve, dismiss)
CREATE POLICY "Admins can update help requests"
ON public.table_help_requests FOR UPDATE
USING ((SELECT is_admin()));

-- No one can delete help requests (audit trail)
CREATE POLICY "No deletes on help requests"
ON public.table_help_requests FOR DELETE
USING (false);

-- 4. Realtime — admin dashboard listens for new/updated requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.table_help_requests;
