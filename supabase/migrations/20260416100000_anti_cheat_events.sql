-- =============================================================
-- Migration: Anti-Cheat Events Table
-- =============================================================
-- Stores raw anti-cheat signals emitted by the game server for
-- forensic analysis and admin review. Separate from server_alerts
-- to avoid flooding the operational alert queue with high-volume
-- detection events.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.anti_cheat_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type   TEXT NOT NULL CHECK (signal_type IN (
    'rate_limit', 'burst', 'out_of_turn', 'invalid_payload',
    'server_override', 'resync_abuse'
  )),
  severity      TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  room_id       TEXT,
  game_id       UUID,
  player_id     TEXT,              -- supabaseUserId or sessionId fallback
  session_id    TEXT NOT NULL,     -- Colyseus sessionId
  message_type  TEXT NOT NULL,     -- WebSocket message name (e.g. 'action', 'declarar-juego')
  phase         TEXT,              -- Game phase when signal was emitted
  evidence      JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_ace_created_at ON public.anti_cheat_events(created_at DESC);
CREATE INDEX idx_ace_player_id ON public.anti_cheat_events(player_id);
CREATE INDEX idx_ace_signal_type ON public.anti_cheat_events(signal_type);
CREATE INDEX idx_ace_severity ON public.anti_cheat_events(severity);
CREATE INDEX idx_ace_room_id ON public.anti_cheat_events(room_id);

-- RLS: service_role inserts, admins read
ALTER TABLE public.anti_cheat_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ace_service_insert" ON public.anti_cheat_events;
CREATE POLICY "ace_service_insert" ON public.anti_cheat_events
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "ace_admin_read" ON public.anti_cheat_events;
CREATE POLICY "ace_admin_read" ON public.anti_cheat_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'admin'));
