-- =============================================================
-- Migration: Server Alerts Table
-- =============================================================
-- Stores critical alerts emitted by the game server so admins
-- can review them in the dashboard instead of ssh-ing into Docker logs.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.server_alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity    TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  category    TEXT NOT NULL,    -- e.g. 'identity', 'settlement', 'discrepancy', 'collusion', 'refund'
  title       TEXT NOT NULL,
  message     TEXT,
  metadata    JSONB DEFAULT '{}'::jsonb,
  room_id     TEXT,
  game_id     UUID,
  player_id   UUID,             -- optional: supabase user who triggered it
  resolved    BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for filtering
CREATE INDEX idx_server_alerts_created_at ON public.server_alerts(created_at DESC);
CREATE INDEX idx_server_alerts_severity ON public.server_alerts(severity);
CREATE INDEX idx_server_alerts_category ON public.server_alerts(category);
CREATE INDEX idx_server_alerts_resolved ON public.server_alerts(resolved) WHERE NOT resolved;

-- RLS: admins only via service_role (game server inserts with service key)
ALTER TABLE public.server_alerts ENABLE ROW LEVEL SECURITY;

-- Service role (game server) can insert
DROP POLICY IF EXISTS "server_alerts_service_insert" ON public.server_alerts;
CREATE POLICY "server_alerts_service_insert" ON public.server_alerts
  FOR INSERT TO service_role WITH CHECK (true);

-- Admins can read all alerts
DROP POLICY IF EXISTS "server_alerts_admin_read" ON public.server_alerts;
CREATE POLICY "server_alerts_admin_read" ON public.server_alerts
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'admin'));

-- Admins can update (resolve)
DROP POLICY IF EXISTS "server_alerts_admin_update" ON public.server_alerts;
CREATE POLICY "server_alerts_admin_update" ON public.server_alerts
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'admin'));

-- Enable realtime for this table
ALTER publication supabase_realtime ADD TABLE public.server_alerts;
