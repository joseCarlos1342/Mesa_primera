-- =============================================================================
-- Migration: Consolidate admin_audit_log — add context, before/after, actor
-- =============================================================================
-- 1. Extend admin_audit_log with new columns for full auditability
-- 2. Backfill rows from legacy audit_logs into admin_audit_log
-- 3. Drop legacy audit_logs table
-- =============================================================================

-- ─── 1. ADD NEW COLUMNS ─────────────────────────────────────

-- Context: module where the action happened (e.g. 'wallet', 'settings', 'game-room-moderation')
ALTER TABLE admin_audit_log ADD COLUMN IF NOT EXISTS context TEXT;

-- Before/after state snapshots (JSONB, nullable — not all actions have state diffs)
ALTER TABLE admin_audit_log ADD COLUMN IF NOT EXISTS before_state JSONB;
ALTER TABLE admin_audit_log ADD COLUMN IF NOT EXISTS after_state JSONB;

-- Actor classification: 'admin' (human) or 'system' (cron, game server)
ALTER TABLE admin_audit_log ADD COLUMN IF NOT EXISTS actor_kind TEXT NOT NULL DEFAULT 'admin';
ALTER TABLE admin_audit_log ADD COLUMN IF NOT EXISTS actor_label TEXT;

-- Make admin_id nullable for system events (actor_kind = 'system')
ALTER TABLE admin_audit_log ALTER COLUMN admin_id DROP NOT NULL;

-- ─── 2. CONSTRAINTS ─────────────────────────────────────────

-- actor_kind must be one of the allowed values
ALTER TABLE admin_audit_log ADD CONSTRAINT chk_actor_kind
  CHECK (actor_kind IN ('admin', 'system'));

-- If actor_kind is 'admin', admin_id MUST be set; if 'system', actor_label MUST be set
ALTER TABLE admin_audit_log ADD CONSTRAINT chk_actor_identity
  CHECK (
    (actor_kind = 'admin' AND admin_id IS NOT NULL)
    OR
    (actor_kind = 'system' AND actor_label IS NOT NULL)
  );

-- ─── 3. NEW INDEXES ─────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_context ON admin_audit_log(context);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor_kind ON admin_audit_log(actor_kind);

-- ─── 4. BACKFILL FROM LEGACY audit_logs ─────────────────────

-- Map legacy rows into the canonical table with metadata.legacy_source marker
INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details, context, actor_kind, actor_label, created_at)
SELECT
  CASE
    WHEN al.admin_id = '00000000-0000-0000-0000-000000000000' THEN NULL
    ELSE al.admin_id
  END,
  LOWER(REPLACE(al.action, '_', '_')),
  CASE
    WHEN al.action = 'UPDATE_RULEBOOK' THEN 'setting'
    WHEN al.action LIKE 'SYSTEM_%' THEN 'system'
    ELSE 'unknown'
  END,
  al.target_id,
  jsonb_build_object('legacy_source', 'audit_logs', 'original_details', al.details),
  CASE
    WHEN al.action = 'UPDATE_RULEBOOK' THEN 'settings'
    WHEN al.action LIKE 'SYSTEM_%' THEN 'integrity'
    ELSE 'legacy'
  END,
  CASE
    WHEN al.admin_id = '00000000-0000-0000-0000-000000000000' THEN 'system'
    ELSE 'admin'
  END,
  CASE
    WHEN al.admin_id = '00000000-0000-0000-0000-000000000000' THEN 'integrity-cron'
    ELSE NULL
  END,
  al.created_at
FROM audit_logs al
WHERE NOT EXISTS (
  -- Avoid duplicates if migration runs twice
  SELECT 1 FROM admin_audit_log aal
  WHERE aal.created_at = al.created_at
    AND aal.action = LOWER(REPLACE(al.action, '_', '_'))
    AND COALESCE(aal.admin_id::text, '') = COALESCE(
      CASE WHEN al.admin_id = '00000000-0000-0000-0000-000000000000' THEN NULL ELSE al.admin_id END::text, ''
    )
);

-- ─── 5. DROP LEGACY TABLE ───────────────────────────────────

DROP TABLE IF EXISTS audit_logs;

-- ─── 6. UPDATE RLS ──────────────────────────────────────────

-- Refresh admin read policy to include new columns (already covered by SELECT *)
-- Refresh admin insert policy to allow system inserts via service_role
-- The existing policies use EXISTS(profiles WHERE role='admin'), which is fine for admin.
-- For system events inserted via service_role key, RLS is bypassed, so no policy change needed.

-- Ensure NO UPDATE/DELETE policies exist (immutability preserved)
-- (Already enforced — no UPDATE/DELETE policies were ever created)
