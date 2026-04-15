-- =============================================================
-- Migration: Admin Dispute Cases & Search Indexes
-- =============================================================
-- Creates the admin_dispute_cases table for formal investigation
-- tracking, plus search-oriented indexes for the global query
-- module. Preserves admin blindness — no access to game_rounds
-- or game_actions.
-- =============================================================

-- ============================================================
-- 1. ADMIN_DISPUTE_CASES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_dispute_cases (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status            TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  priority          TEXT NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  title             TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  opened_by         UUID NOT NULL REFERENCES auth.users(id),
  assigned_to       UUID REFERENCES auth.users(id),
  support_ticket_id UUID REFERENCES public.support_tickets(id),
  evidence_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  resolution_notes  TEXT,
  resolved_at       TIMESTAMPTZ,
  resolved_by       UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common access patterns
CREATE INDEX idx_dispute_cases_status ON public.admin_dispute_cases(status);
CREATE INDEX idx_dispute_cases_priority ON public.admin_dispute_cases(priority);
CREATE INDEX idx_dispute_cases_assigned_to ON public.admin_dispute_cases(assigned_to)
  WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_dispute_cases_support_ticket ON public.admin_dispute_cases(support_ticket_id)
  WHERE support_ticket_id IS NOT NULL;
CREATE INDEX idx_dispute_cases_created_at ON public.admin_dispute_cases(created_at DESC);

-- RLS: admin-only
ALTER TABLE public.admin_dispute_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dispute_cases_admin_select" ON public.admin_dispute_cases
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'admin'));

CREATE POLICY "dispute_cases_admin_insert" ON public.admin_dispute_cases
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'admin'));

CREATE POLICY "dispute_cases_admin_update" ON public.admin_dispute_cases
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'admin'));

-- No DELETE — disputes are immutable records
CREATE POLICY "dispute_cases_no_delete" ON public.admin_dispute_cases
  FOR DELETE USING (false);

-- ============================================================
-- 2. AUTO-UPDATE updated_at TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_dispute_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dispute_updated_at
  BEFORE UPDATE ON public.admin_dispute_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_dispute_updated_at();

-- ============================================================
-- 3. SEARCH-ORIENTED INDEXES
--    These support the global admin search feature.
-- ============================================================

-- Ledger: search by reference_id (UUID text match for transactions)
CREATE INDEX IF NOT EXISTS idx_ledger_reference_id ON public.ledger(reference_id)
  WHERE reference_id IS NOT NULL;

-- Ledger: sequence column (for ordering — should already exist via BIGSERIAL)
-- game_replays: search by rng_seed
CREATE INDEX IF NOT EXISTS idx_game_replays_rng_seed ON public.game_replays(rng_seed);

-- game_replays: search by game_id (may already exist, IF NOT EXISTS is safe)
CREATE INDEX IF NOT EXISTS idx_game_replays_game_id ON public.game_replays(game_id);

-- deposit_requests: search by status + created_at for admin queries
CREATE INDEX IF NOT EXISTS idx_deposit_requests_status ON public.deposit_requests(status);

-- withdrawal_requests: search by status + created_at
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON public.withdrawal_requests(status);

-- support_tickets: search by user_id for user-scoped lookups
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);

-- server_alerts: search by game_id for game-related alert lookup
CREATE INDEX IF NOT EXISTS idx_server_alerts_game_id ON public.server_alerts(game_id)
  WHERE game_id IS NOT NULL;

-- server_alerts: search by player_id for user-related alert lookup
CREATE INDEX IF NOT EXISTS idx_server_alerts_player_id ON public.server_alerts(player_id)
  WHERE player_id IS NOT NULL;
