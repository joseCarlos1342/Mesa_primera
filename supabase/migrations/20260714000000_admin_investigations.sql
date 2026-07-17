-- Reconverts the legacy dispute tracker into an admin-only investigation
-- workflow. Evidence remains reference-only and immutable; no active game
-- state is copied into the case.

-- The legacy schema accepted arbitrary JSON. Normalize malformed historical
-- values before validating the stronger array contract.
UPDATE public.admin_dispute_cases
SET evidence_snapshot = '[]'::JSONB
WHERE jsonb_typeof(evidence_snapshot) <> 'array';

ALTER TABLE public.admin_dispute_cases
  ADD COLUMN investigation_type TEXT NOT NULL DEFAULT 'game_integrity'
    CHECK (investigation_type IN ('game_integrity', 'collusion', 'fraud', 'bonus_abuse', 'conduct')),
  ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'global_search', 'server_alert', 'replay')),
  ADD COLUMN subject_user_ids UUID[] NOT NULL DEFAULT '{}'::UUID[],
  ADD COLUMN game_id UUID REFERENCES public.games(id) ON DELETE RESTRICT,
  ADD COLUMN room_id TEXT,
  ADD COLUMN resolution_outcome TEXT
    CHECK (resolution_outcome IN ('no_action', 'warning', 'sanction', 'compensation')),
  ADD COLUMN compensation_user_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD COLUMN compensation_amount_cents INTEGER,
  ADD COLUMN compensation_reason TEXT,
  ADD COLUMN compensation_status TEXT CHECK (compensation_status IN ('proposed', 'approved')),
  ADD COLUMN compensation_operation_id UUID UNIQUE,
  ADD COLUMN compensation_ledger_id UUID UNIQUE REFERENCES public.ledger(id) ON DELETE RESTRICT,
  ADD COLUMN compensation_proposed_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD COLUMN compensation_proposed_at TIMESTAMPTZ,
  ADD COLUMN compensation_approved_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD COLUMN compensation_approved_at TIMESTAMPTZ,
  ADD CONSTRAINT admin_dispute_evidence_is_array CHECK (jsonb_typeof(evidence_snapshot) = 'array'),
  ADD CONSTRAINT admin_dispute_subject_limit CHECK (cardinality(subject_user_ids) <= 20),
  ADD CONSTRAINT admin_dispute_compensation_amount CHECK (
    compensation_amount_cents IS NULL OR
    (compensation_amount_cents > 0 AND compensation_amount_cents % 100000 = 0)
  ),
  ADD CONSTRAINT admin_dispute_compensation_consistency CHECK (
    (compensation_status IS NULL AND compensation_user_id IS NULL AND compensation_amount_cents IS NULL
      AND compensation_reason IS NULL AND compensation_operation_id IS NULL AND compensation_ledger_id IS NULL
      AND compensation_proposed_by IS NULL AND compensation_proposed_at IS NULL
      AND compensation_approved_by IS NULL AND compensation_approved_at IS NULL)
    OR
    (compensation_status = 'proposed' AND compensation_user_id IS NOT NULL AND compensation_amount_cents IS NOT NULL
      AND compensation_reason IS NOT NULL AND compensation_operation_id IS NOT NULL
      AND compensation_proposed_by IS NOT NULL AND compensation_proposed_at IS NOT NULL
      AND compensation_ledger_id IS NULL AND compensation_approved_by IS NULL AND compensation_approved_at IS NULL)
    OR
    (compensation_status = 'approved' AND compensation_user_id IS NOT NULL AND compensation_amount_cents IS NOT NULL
      AND compensation_reason IS NOT NULL AND compensation_operation_id IS NOT NULL
      AND compensation_proposed_by IS NOT NULL AND compensation_proposed_at IS NOT NULL
      AND compensation_ledger_id IS NOT NULL AND compensation_approved_by IS NOT NULL AND compensation_approved_at IS NOT NULL)
  );

CREATE INDEX idx_admin_dispute_type_status
  ON public.admin_dispute_cases (investigation_type, status, created_at DESC);
CREATE INDEX idx_admin_dispute_subjects
  ON public.admin_dispute_cases USING GIN (subject_user_ids);
CREATE UNIQUE INDEX idx_ledger_admin_investigation_operation
  ON public.ledger ((metadata->>'operation_id'))
  WHERE type = 'adjustment' AND metadata->>'operation_kind' = 'admin_investigation_compensation';

CREATE TABLE public.admin_dispute_case_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.admin_dispute_cases(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (event_type IN ('opened', 'started', 'resolved', 'dismissed', 'compensation_proposed', 'compensation_cancelled')),
  from_status TEXT,
  to_status TEXT NOT NULL CHECK (to_status IN ('open', 'investigating', 'resolved', 'dismissed')),
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_dispute_events_case
  ON public.admin_dispute_case_events (case_id, created_at, id);

-- Give pre-existing cases a deterministic historical baseline.
INSERT INTO public.admin_dispute_case_events (
  case_id, event_type, from_status, to_status, actor_id, notes, metadata, created_at
)
SELECT case_row.id, 'opened', NULL, 'open', actor.id, NULL,
  jsonb_build_object('migrated', true, 'legacy_actor_id', case_row.opened_by), case_row.created_at
FROM public.admin_dispute_cases case_row
JOIN LATERAL (
  SELECT profile.id FROM public.profiles profile
  WHERE profile.role = 'admin'
  ORDER BY (profile.id = case_row.opened_by) DESC, profile.id
  LIMIT 1
) actor ON true;

INSERT INTO public.admin_dispute_case_events (
  case_id, event_type, from_status, to_status, actor_id, notes, metadata, created_at
)
SELECT
  case_row.id,
  CASE case_row.status WHEN 'investigating' THEN 'started' WHEN 'resolved' THEN 'resolved' ELSE 'dismissed' END,
  CASE case_row.status WHEN 'investigating' THEN 'open' ELSE 'investigating' END,
  case_row.status,
  actor.id,
  case_row.resolution_notes,
  jsonb_build_object('migrated', true, 'legacy_actor_id', COALESCE(case_row.resolved_by, case_row.assigned_to, case_row.opened_by)),
  COALESCE(case_row.resolved_at, case_row.updated_at)
FROM public.admin_dispute_cases case_row
JOIN LATERAL (
  SELECT profile.id FROM public.profiles profile
  WHERE profile.role = 'admin'
  ORDER BY (profile.id = COALESCE(case_row.resolved_by, case_row.assigned_to, case_row.opened_by)) DESC, profile.id
  LIMIT 1
) actor ON true
WHERE case_row.status <> 'open';

ALTER TABLE public.admin_dispute_case_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_read_investigation_events"
  ON public.admin_dispute_case_events FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

CREATE OR REPLACE FUNCTION public.reject_admin_dispute_event_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'El historial de la investigación es inmutable' USING ERRCODE = '42501';
END;
$$;

CREATE TRIGGER trg_admin_dispute_events_immutable
  BEFORE UPDATE OR DELETE ON public.admin_dispute_case_events
  FOR EACH ROW EXECUTE FUNCTION public.reject_admin_dispute_event_mutation();

CREATE OR REPLACE FUNCTION public.guard_admin_investigation_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.id IS DISTINCT FROM NEW.id
    OR OLD.title IS DISTINCT FROM NEW.title
    OR OLD.description IS DISTINCT FROM NEW.description
    OR OLD.priority IS DISTINCT FROM NEW.priority
    OR OLD.opened_by IS DISTINCT FROM NEW.opened_by
    OR OLD.evidence_snapshot IS DISTINCT FROM NEW.evidence_snapshot
    OR OLD.investigation_type IS DISTINCT FROM NEW.investigation_type
    OR OLD.source IS DISTINCT FROM NEW.source
    OR OLD.subject_user_ids IS DISTINCT FROM NEW.subject_user_ids
    OR OLD.game_id IS DISTINCT FROM NEW.game_id
    OR OLD.room_id IS DISTINCT FROM NEW.room_id
    OR OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Los datos y la evidencia de la investigación son inmutables' USING ERRCODE = '42501';
  END IF;

  IF OLD.status IN ('resolved', 'dismissed') THEN
    RAISE EXCEPTION 'La investigación ya está cerrada' USING ERRCODE = '23514';
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status AND NOT (
    (OLD.status = 'open' AND NEW.status = 'investigating') OR
    (OLD.status = 'investigating' AND NEW.status IN ('resolved', 'dismissed'))
  ) THEN
    RAISE EXCEPTION 'Transición de investigación inválida' USING ERRCODE = '23514';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispute_updated_at ON public.admin_dispute_cases;
CREATE TRIGGER trg_admin_investigation_guard
  BEFORE UPDATE ON public.admin_dispute_cases
  FOR EACH ROW EXECUTE FUNCTION public.guard_admin_investigation_update();

DROP POLICY IF EXISTS "dispute_cases_admin_insert" ON public.admin_dispute_cases;
DROP POLICY IF EXISTS "dispute_cases_admin_update" ON public.admin_dispute_cases;

REVOKE ALL ON FUNCTION public.reject_admin_dispute_event_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_admin_investigation_update() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_admin_investigation(
  p_investigation_type TEXT,
  p_title TEXT,
  p_description TEXT,
  p_priority TEXT,
  p_source TEXT,
  p_subject_user_ids UUID[] DEFAULT '{}'::UUID[],
  p_game_id UUID DEFAULT NULL,
  p_room_id TEXT DEFAULT NULL,
  p_evidence JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_case_id UUID;
  v_evidence JSONB := '[]'::JSONB;
  v_item JSONB;
  v_normalized_item JSONB;
  v_entity TEXT;
  v_source_id UUID;
  v_source_game_id UUID;
  v_source_room_id TEXT;
  v_exists BOOLEAN;
  v_room_id TEXT;
BEGIN
  IF v_admin IS NULL OR NOT COALESCE((SELECT public.is_admin()), false) THEN
    RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501';
  END IF;
  IF p_investigation_type NOT IN ('game_integrity', 'collusion', 'fraud', 'bonus_abuse', 'conduct')
    OR p_priority NOT IN ('low', 'medium', 'high', 'critical')
    OR p_source NOT IN ('manual', 'global_search', 'server_alert', 'replay') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Clasificación de investigación inválida');
  END IF;
  IF length(trim(COALESCE(p_title, ''))) NOT BETWEEN 1 AND 120
    OR length(trim(COALESCE(p_description, ''))) > 5000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contenido de investigación inválido');
  END IF;
  IF cardinality(COALESCE(p_subject_user_ids, '{}'::UUID[])) > 20
    OR EXISTS (
      SELECT 1 FROM unnest(COALESCE(p_subject_user_ids, '{}'::UUID[])) subject_id
      WHERE NOT EXISTS (SELECT 1 FROM public.profiles profile WHERE profile.id = subject_id)
    ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Hay jugadores relacionados inválidos');
  END IF;
  IF p_game_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.games game WHERE game.id = p_game_id AND game.status = 'finished'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'La partida debe haber terminado');
  END IF;
  IF jsonb_typeof(COALESCE(p_evidence, '[]'::JSONB)) <> 'array'
    OR jsonb_array_length(COALESCE(p_evidence, '[]'::JSONB)) > 50
    OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(COALESCE(p_evidence, '[]'::JSONB)) item
      WHERE jsonb_typeof(item) <> 'object'
        OR COALESCE(item->>'entity', '') NOT IN ('ledger', 'deposit', 'withdrawal', 'replay', 'user', 'ticket', 'alert', 'dispute')
        OR COALESCE(item->>'entity_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        OR length(COALESCE(item->>'label', '')) NOT BETWEEN 1 AND 240
    ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'La evidencia vinculada es inválida');
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_evidence, '[]'::JSONB)) LOOP
    v_entity := v_item->>'entity';
    v_source_id := (v_item->>'entity_id')::UUID;
    v_source_game_id := NULL;
    v_source_room_id := NULL;
    v_exists := false;

    CASE v_entity
      WHEN 'ledger' THEN
        SELECT true, ledger.game_id INTO v_exists, v_source_game_id FROM public.ledger ledger WHERE ledger.id = v_source_id;
      WHEN 'deposit' THEN
        SELECT true INTO v_exists FROM public.deposit_requests request WHERE request.id = v_source_id;
      WHEN 'withdrawal' THEN
        SELECT true INTO v_exists FROM public.withdrawal_requests request WHERE request.id = v_source_id;
      WHEN 'replay' THEN
        SELECT true, replay.game_id INTO v_exists, v_source_game_id FROM public.game_replays replay WHERE replay.id = v_source_id;
      WHEN 'user' THEN
        SELECT true INTO v_exists FROM public.profiles profile WHERE profile.id = v_source_id;
      WHEN 'ticket' THEN
        SELECT true INTO v_exists FROM public.support_tickets ticket WHERE ticket.id = v_source_id;
      WHEN 'alert' THEN
        SELECT true, alert.game_id, alert.room_id INTO v_exists, v_source_game_id, v_source_room_id FROM public.server_alerts alert WHERE alert.id = v_source_id;
      WHEN 'dispute' THEN
        SELECT true INTO v_exists FROM public.admin_dispute_cases existing_case WHERE existing_case.id = v_source_id;
    END CASE;

    IF NOT COALESCE(v_exists, false) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Una referencia de evidencia no existe');
    END IF;
    IF v_entity = 'alert' AND v_source_game_id IS NULL AND v_source_room_id IS NOT NULL THEN
      -- A room can contain both old finished games and a current active game.
      -- Without the alert's exact game_id there is no safe historical proof.
      RETURN jsonb_build_object('success', false, 'error', 'No se puede demostrar que la alerta sea histórica');
    END IF;
    IF v_source_game_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.games game WHERE game.id = v_source_game_id AND game.status = 'finished'
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'La evidencia pertenece a una partida activa');
    END IF;

    v_normalized_item := jsonb_build_object(
      'entity', v_entity,
      'entity_id', v_source_id,
      'label', CASE v_entity
        WHEN 'ledger' THEN 'Movimiento de ledger verificado'
        WHEN 'deposit' THEN 'Depósito verificado'
        WHEN 'withdrawal' THEN 'Retiro verificado'
        WHEN 'replay' THEN 'Replay histórico verificado'
        WHEN 'user' THEN 'Jugador vinculado'
        WHEN 'ticket' THEN 'Ticket de soporte histórico'
        WHEN 'alert' THEN 'Alerta histórica verificada'
        ELSE 'Investigación relacionada'
      END
    );
    IF v_entity = 'replay' AND v_source_game_id IS NOT NULL THEN
      v_normalized_item := v_normalized_item || jsonb_build_object('target_id', v_source_game_id);
    END IF;
    v_evidence := v_evidence || jsonb_build_array(v_normalized_item);
  END LOOP;

  IF p_game_id IS NOT NULL THEN
    SELECT replay.room_id INTO v_room_id
    FROM public.game_replays replay
    WHERE replay.game_id = p_game_id
    ORDER BY replay.created_at DESC
    LIMIT 1;
    IF v_room_id IS NOT NULL AND NULLIF(trim(COALESCE(p_room_id, '')), '') IS NOT NULL
      AND v_room_id <> trim(p_room_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'La sala no corresponde a la partida terminada');
    END IF;
    v_room_id := COALESCE(v_room_id, NULLIF(trim(COALESCE(p_room_id, '')), ''));
  ELSIF NULLIF(trim(COALESCE(p_room_id, '')), '') IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'La sala requiere una partida terminada');
  END IF;

  INSERT INTO public.admin_dispute_cases (
    investigation_type, title, description, priority, source, subject_user_ids,
    game_id, room_id, evidence_snapshot, opened_by
  ) VALUES (
    p_investigation_type, trim(p_title), trim(COALESCE(p_description, '')), p_priority, p_source,
    ARRAY(SELECT DISTINCT unnest(COALESCE(p_subject_user_ids, '{}'::UUID[]))),
    p_game_id, v_room_id, v_evidence, v_admin
  ) RETURNING id INTO v_case_id;

  INSERT INTO public.admin_dispute_case_events (case_id, event_type, to_status, actor_id)
  VALUES (v_case_id, 'opened', 'open', v_admin);

  RETURN jsonb_build_object('success', true, 'id', v_case_id, 'status', 'open');
END;
$$;

CREATE OR REPLACE FUNCTION public.start_admin_investigation(p_case_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_case public.admin_dispute_cases%ROWTYPE;
BEGIN
  IF v_admin IS NULL OR NOT COALESCE((SELECT public.is_admin()), false) THEN RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_case FROM public.admin_dispute_cases WHERE id = p_case_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Investigación no encontrada'); END IF;
  IF v_case.status <> 'open' THEN RETURN jsonb_build_object('success', false, 'error', 'La investigación ya fue iniciada'); END IF;
  UPDATE public.admin_dispute_cases SET status = 'investigating', assigned_to = v_admin WHERE id = p_case_id;
  INSERT INTO public.admin_dispute_case_events (case_id, event_type, from_status, to_status, actor_id)
  VALUES (p_case_id, 'started', 'open', 'investigating', v_admin);
  RETURN jsonb_build_object('success', true, 'id', p_case_id, 'status', 'investigating', 'assigned_to', v_admin);
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_admin_investigation(p_case_id UUID, p_outcome TEXT, p_notes TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_admin UUID := auth.uid(); v_case public.admin_dispute_cases%ROWTYPE;
BEGIN
  IF v_admin IS NULL OR NOT COALESCE((SELECT public.is_admin()), false) THEN RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501'; END IF;
  IF p_outcome NOT IN ('no_action', 'warning', 'sanction') OR length(trim(COALESCE(p_notes, ''))) NOT BETWEEN 10 AND 5000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Resolución inválida');
  END IF;
  SELECT * INTO v_case FROM public.admin_dispute_cases WHERE id = p_case_id FOR UPDATE;
  IF NOT FOUND OR v_case.status <> 'investigating' OR v_case.compensation_status IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'La investigación no puede resolverse en su estado actual');
  END IF;
  UPDATE public.admin_dispute_cases SET status = 'resolved', resolution_outcome = p_outcome,
    resolution_notes = trim(p_notes), resolved_by = v_admin, resolved_at = now() WHERE id = p_case_id;
  INSERT INTO public.admin_dispute_case_events (case_id, event_type, from_status, to_status, actor_id, notes, metadata)
  VALUES (p_case_id, 'resolved', 'investigating', 'resolved', v_admin, trim(p_notes), jsonb_build_object('outcome', p_outcome));
  RETURN jsonb_build_object('success', true, 'id', p_case_id, 'status', 'resolved', 'resolution_outcome', p_outcome);
END;
$$;

CREATE OR REPLACE FUNCTION public.dismiss_admin_investigation(p_case_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_admin UUID := auth.uid(); v_case public.admin_dispute_cases%ROWTYPE;
BEGIN
  IF v_admin IS NULL OR NOT COALESCE((SELECT public.is_admin()), false) THEN RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501'; END IF;
  IF length(trim(COALESCE(p_reason, ''))) NOT BETWEEN 10 AND 5000 THEN RETURN jsonb_build_object('success', false, 'error', 'La razón debe tener al menos 10 caracteres'); END IF;
  SELECT * INTO v_case FROM public.admin_dispute_cases WHERE id = p_case_id FOR UPDATE;
  IF NOT FOUND OR v_case.status <> 'investigating' OR v_case.compensation_status IS NOT NULL THEN RETURN jsonb_build_object('success', false, 'error', 'La investigación no puede descartarse en su estado actual'); END IF;
  UPDATE public.admin_dispute_cases SET status = 'dismissed', resolution_outcome = 'no_action', resolution_notes = trim(p_reason), resolved_by = v_admin, resolved_at = now() WHERE id = p_case_id;
  INSERT INTO public.admin_dispute_case_events (case_id, event_type, from_status, to_status, actor_id, notes)
  VALUES (p_case_id, 'dismissed', 'investigating', 'dismissed', v_admin, trim(p_reason));
  RETURN jsonb_build_object('success', true, 'id', p_case_id, 'status', 'dismissed');
END;
$$;

CREATE OR REPLACE FUNCTION public.propose_admin_investigation_compensation(p_case_id UUID, p_user_id UUID, p_amount_cents INTEGER, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_admin UUID := auth.uid(); v_case public.admin_dispute_cases%ROWTYPE; v_operation UUID;
BEGIN
  IF v_admin IS NULL OR NOT COALESCE((SELECT public.is_admin()), false) THEN RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501'; END IF;
  IF p_user_id IS NULL OR p_amount_cents IS NULL OR p_amount_cents <= 0 OR p_amount_cents % 100000 <> 0 THEN RETURN jsonb_build_object('success', false, 'error', 'El monto y el beneficiario son obligatorios y el monto debe ser múltiplo de $1.000 COP'); END IF;
  IF length(trim(COALESCE(p_reason, ''))) NOT BETWEEN 10 AND 500 THEN RETURN jsonb_build_object('success', false, 'error', 'El motivo es inválido'); END IF;
  SELECT * INTO v_case FROM public.admin_dispute_cases WHERE id = p_case_id FOR UPDATE;
  IF NOT FOUND OR v_case.status <> 'investigating' THEN RETURN jsonb_build_object('success', false, 'error', 'La investigación no está activa'); END IF;
  IF NOT (p_user_id = ANY(v_case.subject_user_ids)) THEN RETURN jsonb_build_object('success', false, 'error', 'El beneficiario debe estar vinculado a la investigación'); END IF;
  IF v_case.compensation_status IS NOT NULL THEN
    IF v_case.compensation_status = 'proposed'
      AND v_case.compensation_user_id = p_user_id
      AND v_case.compensation_amount_cents = p_amount_cents
      AND v_case.compensation_reason = trim(p_reason) THEN
      RETURN jsonb_build_object('success', true, 'id', p_case_id, 'compensation_status', 'proposed');
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'Ya existe una propuesta diferente para esta investigación');
  END IF;
  v_operation := gen_random_uuid();
  UPDATE public.admin_dispute_cases SET compensation_user_id = p_user_id, compensation_amount_cents = p_amount_cents,
    compensation_reason = trim(p_reason), compensation_status = 'proposed', compensation_operation_id = v_operation,
    compensation_proposed_by = v_admin, compensation_proposed_at = now() WHERE id = p_case_id;
  INSERT INTO public.admin_dispute_case_events (case_id, event_type, from_status, to_status, actor_id, notes, metadata)
  VALUES (p_case_id, 'compensation_proposed', 'investigating', 'investigating', v_admin, trim(p_reason), jsonb_build_object('amount_cents', p_amount_cents, 'user_id', p_user_id, 'operation_id', v_operation));
  RETURN jsonb_build_object('success', true, 'id', p_case_id, 'compensation_status', 'proposed');
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_admin_investigation_compensation(p_case_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_admin UUID := auth.uid(); v_case public.admin_dispute_cases%ROWTYPE;
BEGIN
  IF v_admin IS NULL OR NOT COALESCE((SELECT public.is_admin()), false) THEN RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501'; END IF;
  IF length(trim(COALESCE(p_reason, ''))) NOT BETWEEN 10 AND 500 THEN RETURN jsonb_build_object('success', false, 'error', 'El motivo de cancelación es inválido'); END IF;
  SELECT * INTO v_case FROM public.admin_dispute_cases WHERE id = p_case_id FOR UPDATE;
  IF NOT FOUND OR v_case.status <> 'investigating' OR v_case.compensation_status <> 'proposed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'No existe una propuesta pendiente');
  END IF;
  UPDATE public.admin_dispute_cases SET
    compensation_user_id = NULL, compensation_amount_cents = NULL, compensation_reason = NULL,
    compensation_status = NULL, compensation_operation_id = NULL, compensation_ledger_id = NULL,
    compensation_proposed_by = NULL, compensation_proposed_at = NULL,
    compensation_approved_by = NULL, compensation_approved_at = NULL
  WHERE id = p_case_id;
  INSERT INTO public.admin_dispute_case_events (case_id, event_type, from_status, to_status, actor_id, notes, metadata)
  VALUES (p_case_id, 'compensation_cancelled', 'investigating', 'investigating', v_admin, trim(p_reason),
    jsonb_build_object('cancelled_operation_id', v_case.compensation_operation_id));
  RETURN jsonb_build_object('success', true, 'id', p_case_id, 'status', 'investigating', 'compensation_status', NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_admin_investigation_compensation(p_case_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_case public.admin_dispute_cases%ROWTYPE;
  v_ledger_result JSONB;
  v_ledger_id UUID;
  v_existing_ledger public.ledger%ROWTYPE;
BEGIN
  IF v_admin IS NULL OR NOT COALESCE((SELECT public.is_admin()), false) THEN RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_case FROM public.admin_dispute_cases WHERE id = p_case_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Investigación no encontrada'); END IF;
  IF v_case.compensation_status = 'approved' THEN
    RETURN jsonb_build_object('success', true, 'id', p_case_id, 'status', v_case.status, 'ledger_id', v_case.compensation_ledger_id);
  END IF;
  IF v_case.status <> 'investigating' OR v_case.compensation_status <> 'proposed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'No existe una compensación pendiente');
  END IF;

  SELECT * INTO v_existing_ledger FROM public.ledger
  WHERE type = 'adjustment' AND metadata->>'operation_kind' = 'admin_investigation_compensation'
    AND metadata->>'operation_id' = v_case.compensation_operation_id::TEXT;

  IF FOUND THEN
    IF v_existing_ledger.user_id IS DISTINCT FROM v_case.compensation_user_id
      OR v_existing_ledger.amount_cents IS DISTINCT FROM v_case.compensation_amount_cents
      OR v_existing_ledger.direction IS DISTINCT FROM 'credit'
      OR v_existing_ledger.type IS DISTINCT FROM 'adjustment'
      OR v_existing_ledger.reference_id IS DISTINCT FROM 'investigation:' || p_case_id
      OR v_existing_ledger.game_id IS DISTINCT FROM v_case.game_id
      OR v_existing_ledger.status IS DISTINCT FROM 'completed'
      OR v_existing_ledger.metadata->>'operation_kind' IS DISTINCT FROM 'admin_investigation_compensation'
      OR v_existing_ledger.metadata->>'operation_id' IS DISTINCT FROM v_case.compensation_operation_id::TEXT
      OR v_existing_ledger.metadata->>'investigation_id' IS DISTINCT FROM p_case_id::TEXT THEN
      RAISE EXCEPTION 'La operación idempotente no coincide con la compensación' USING ERRCODE = '23505';
    END IF;
    v_ledger_id := v_existing_ledger.id;
  END IF;

  IF v_ledger_id IS NULL THEN
    v_ledger_result := public.process_ledger_entry(
      p_user_id := v_case.compensation_user_id,
      p_amount_cents := v_case.compensation_amount_cents,
      p_type := 'adjustment', p_direction := 'credit',
      p_game_id := v_case.game_id,
      p_description := 'Compensación por investigación ' || p_case_id || ': ' || v_case.compensation_reason,
      p_reference_id := 'investigation:' || p_case_id,
      p_approved_by := v_admin,
      p_metadata := jsonb_build_object(
        'operation_kind', 'admin_investigation_compensation',
        'operation_id', v_case.compensation_operation_id,
        'investigation_id', p_case_id,
        'proposed_by', v_case.compensation_proposed_by,
        'approved_by', v_admin
      )
    );
    IF v_ledger_result ? 'error' THEN RETURN v_ledger_result || jsonb_build_object('success', false); END IF;
    v_ledger_id := (v_ledger_result->>'ledger_id')::UUID;
  END IF;

  UPDATE public.admin_dispute_cases SET compensation_status = 'approved', compensation_ledger_id = v_ledger_id,
    compensation_approved_by = v_admin, compensation_approved_at = now(), status = 'resolved',
    resolution_outcome = 'compensation', resolution_notes = compensation_reason, resolved_by = v_admin, resolved_at = now()
  WHERE id = p_case_id;
  INSERT INTO public.admin_dispute_case_events (case_id, event_type, from_status, to_status, actor_id, notes, metadata)
  VALUES (p_case_id, 'resolved', 'investigating', 'resolved', v_admin, v_case.compensation_reason, jsonb_build_object('outcome', 'compensation', 'ledger_id', v_ledger_id));
  RETURN jsonb_build_object('success', true, 'id', p_case_id, 'status', 'resolved', 'ledger_id', v_ledger_id);
END;
$$;

REVOKE ALL ON FUNCTION public.create_admin_investigation(TEXT,TEXT,TEXT,TEXT,TEXT,UUID[],UUID,TEXT,JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.start_admin_investigation(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resolve_admin_investigation(UUID,TEXT,TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dismiss_admin_investigation(UUID,TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.propose_admin_investigation_compensation(UUID,UUID,INTEGER,TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_admin_investigation_compensation(UUID,TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_admin_investigation_compensation(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_admin_investigation(TEXT,TEXT,TEXT,TEXT,TEXT,UUID[],UUID,TEXT,JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_admin_investigation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_admin_investigation(UUID,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_admin_investigation(UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.propose_admin_investigation_compensation(UUID,UUID,INTEGER,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_admin_investigation_compensation(UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_admin_investigation_compensation(UUID) TO authenticated;
