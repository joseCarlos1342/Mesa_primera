-- Recuperación de partidas interrumpidas. Los checkpoints contienen estado
-- sensible: nunca se exponen a clientes ni a administradores.

CREATE TABLE public.game_recovery_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL UNIQUE REFERENCES public.games(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recovery_deadline_at TIMESTAMPTZ NOT NULL,
  cause_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'recovery_pending'
    CHECK (status IN ('recovery_pending', 'resumed', 'cancelled_crash', 'manual_review')),
  resolution_reason TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (recovery_deadline_at > detected_at)
);

CREATE INDEX idx_game_recovery_incidents_pending
  ON public.game_recovery_incidents (recovery_deadline_at)
  WHERE status = 'recovery_pending';

CREATE TABLE public.game_recovery_checkpoints (
  game_id UUID PRIMARY KEY REFERENCES public.games(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL,
  checkpoint_version BIGINT NOT NULL CHECK (checkpoint_version > 0),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  state_hash TEXT NOT NULL,
  private_state JSONB NOT NULL,
  roster_user_ids UUID[] NOT NULL CHECK (cardinality(roster_user_ids) > 0),
  reconnecting_user_ids UUID[] NOT NULL DEFAULT '{}'
);

CREATE TABLE public.game_recovery_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.game_recovery_incidents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  operation_id UUID NOT NULL UNIQUE,
  ledger_id UUID REFERENCES public.ledger(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (incident_id, user_id, operation_id)
);

ALTER TABLE public.game_recovery_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_recovery_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_recovery_refunds ENABLE ROW LEVEL SECURITY;

-- El motor usa service_role. El admin solo ve incidentes finalizados y nunca
-- checkpoints, roster de una mano activa ni operaciones financieras en vuelo.
CREATE POLICY "game_recovery_incidents_service_all"
  ON public.game_recovery_incidents FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "game_recovery_checkpoints_service_all"
  ON public.game_recovery_checkpoints FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "game_recovery_refunds_service_all"
  ON public.game_recovery_refunds FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "admins_read_resolved_game_recovery_incidents"
  ON public.game_recovery_incidents FOR SELECT TO authenticated
  USING (
    status <> 'recovery_pending'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE OR REPLACE FUNCTION public.touch_game_recovery_incident()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER game_recovery_incident_updated_at
  BEFORE UPDATE ON public.game_recovery_incidents
  FOR EACH ROW EXECUTE FUNCTION public.touch_game_recovery_incident();
