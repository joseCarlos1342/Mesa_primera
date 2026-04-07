-- =============================================================================
-- Migration: admin_audit_log + RLS para filtrar wallet del jugador
-- =============================================================================
-- 1. Crear tabla admin_audit_log para registrar TODAS las acciones del admin
-- 2. Agregar RLS: jugadores solo ven deposit/withdrawal en ledger
-- =============================================================================

-- ─────────────────────────────────────────
-- 1. TABLA admin_audit_log
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID NOT NULL REFERENCES profiles(id),
  action      TEXT NOT NULL,
  -- Tipos de acción esperados:
  --   deposit_approved, deposit_rejected,
  --   withdrawal_approved, withdrawal_rejected,
  --   balance_adjusted, user_banned, user_unbanned,
  --   broadcast_sent, support_replied, settings_changed,
  --   etc.
  target_type TEXT,         -- 'user' | 'deposit_request' | 'withdrawal_request' | 'setting' | etc.
  target_id   TEXT,         -- ID del recurso afectado
  details     JSONB DEFAULT '{}'::jsonb,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para consulta eficiente
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id   ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action     ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target     ON admin_audit_log(target_type, target_id);

-- RLS: solo admins pueden leer/insertar
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit log"
  ON admin_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert audit log"
  ON admin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- No UPDATE ni DELETE → registro inmutable
-- No se crean policies de UPDATE/DELETE intencionalmente

-- ─────────────────────────────────────────
-- 2. RLS en ledger: jugadores solo ven deposit/withdrawal/refund/adjustment
-- ─────────────────────────────────────────
-- Primero eliminar la policy existente de SELECT para jugadores si existe
DO $$
BEGIN
  -- Intentar eliminar policies existentes de lectura para authenticated
  BEGIN
    DROP POLICY IF EXISTS "Users can view own ledger entries" ON ledger;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    DROP POLICY IF EXISTS "Users can read own ledger" ON ledger;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    DROP POLICY IF EXISTS "users_read_own_ledger" ON ledger;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Jugadores solo ven depósitos, retiros, reembolsos y ajustes
CREATE POLICY "Players see only vault transactions"
  ON ledger FOR SELECT
  TO authenticated
  USING (
    CASE
      -- Admins ven todo
      WHEN EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      THEN true
      -- Jugadores solo ven sus propias transacciones de bóveda
      ELSE user_id = auth.uid() AND type IN ('deposit', 'withdrawal', 'refund', 'adjustment', 'admin_adjustment')
    END
  );
