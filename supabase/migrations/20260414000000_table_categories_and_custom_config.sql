-- Migration: Table categories and custom configuration
-- ====================================================
-- Extends public.tables to support two categories:
--   1. 'common'  — standard tables always present in the lobby (fixed $50k entry)
--   2. 'custom'  — admin-configured tables with flexible entry, pique, and chip denominations
--
-- Design decisions:
--   - Configuration is READ at room creation time and frozen in Colyseus metadata.
--   - Changes to a table config only affect FUTURE rooms, not active ones.
--   - 'disabled_chips' stores an array of cent-denominated chip values that are blocked.
--   - 'lobby_slot' gives common tables a stable visual position (1-based).
--   - Existing tables are backfilled as 'common' with current defaults.

-- 1. Add new columns
-- ────────────────────────────────────────────────────
ALTER TABLE public.tables
  ADD COLUMN IF NOT EXISTS table_category TEXT NOT NULL DEFAULT 'common'
    CHECK (table_category IN ('common', 'custom')),
  ADD COLUMN IF NOT EXISTS lobby_slot INT,
  ADD COLUMN IF NOT EXISTS min_entry_cents BIGINT NOT NULL DEFAULT 5000000,
  ADD COLUMN IF NOT EXISTS min_pique_cents BIGINT NOT NULL DEFAULT 500000,
  ADD COLUMN IF NOT EXISTS disabled_chips BIGINT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

-- Constraint: lobby_slot is unique among active common tables
CREATE UNIQUE INDEX IF NOT EXISTS idx_tables_common_lobby_slot
  ON public.tables (lobby_slot)
  WHERE table_category = 'common' AND is_active = true AND lobby_slot IS NOT NULL;

-- Constraint: max_players must be between 3 and 7
ALTER TABLE public.tables
  ADD CONSTRAINT chk_max_players CHECK (max_players BETWEEN 3 AND 7);

-- Constraint: min_entry_cents must be positive
ALTER TABLE public.tables
  ADD CONSTRAINT chk_min_entry_positive CHECK (min_entry_cents > 0);

-- Constraint: min_pique_cents must be positive
ALTER TABLE public.tables
  ADD CONSTRAINT chk_min_pique_positive CHECK (min_pique_cents > 0);

-- Index for lobby queries (category + active)
CREATE INDEX IF NOT EXISTS idx_tables_category_active
  ON public.tables (table_category, is_active, sort_order);

-- 2. Backfill existing common tables
-- ────────────────────────────────────────────────────
-- Set all current tables as 'common' category with sequential lobby slots
UPDATE public.tables
SET table_category = 'common',
    min_entry_cents = 5000000,
    min_pique_cents = 500000,
    disabled_chips = '{}',
    sort_order = 0
WHERE table_category = 'common';

-- If there are no tables yet, seed the two default common tables
-- (Mesa #1 and Mesa #2 as shown in the lobby)
DO $$
DECLARE
  v_count INT;
  v_admin_id UUID;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.tables WHERE table_category = 'common' AND is_active = true;

  IF v_count < 2 THEN
    -- Find an admin to assign as creator
    SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'admin' LIMIT 1;

    IF v_admin_id IS NOT NULL THEN
      -- Seed Mesa #1 if not exists
      IF NOT EXISTS (SELECT 1 FROM public.tables WHERE name = 'Mesa #1' AND table_category = 'common') THEN
        INSERT INTO public.tables (name, game_type, min_bet, max_players, is_active, created_by, table_category, lobby_slot, min_entry_cents, min_pique_cents, disabled_chips, sort_order)
        VALUES ('Mesa #1', 'primera_28', 1, 7, true, v_admin_id, 'common', 1, 5000000, 500000, '{}', 1);
      END IF;

      -- Seed Mesa #2 if not exists
      IF NOT EXISTS (SELECT 1 FROM public.tables WHERE name = 'Mesa #2' AND table_category = 'common') THEN
        INSERT INTO public.tables (name, game_type, min_bet, max_players, is_active, created_by, table_category, lobby_slot, min_entry_cents, min_pique_cents, disabled_chips, sort_order)
        VALUES ('Mesa #2', 'primera_28', 1, 7, true, v_admin_id, 'common', 2, 5000000, 500000, '{}', 2);
      END IF;
    END IF;
  END IF;
END;
$$;

-- 3. RPC: get_lobby_tables() — Returns active tables for the player lobby
-- ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_lobby_tables()
RETURNS TABLE (
  id UUID,
  name TEXT,
  game_type TEXT,
  max_players INT,
  table_category TEXT,
  lobby_slot INT,
  min_entry_cents BIGINT,
  min_pique_cents BIGINT,
  disabled_chips BIGINT[],
  sort_order INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT t.id, t.name, t.game_type, t.max_players,
           t.table_category, t.lobby_slot,
           t.min_entry_cents, t.min_pique_cents,
           t.disabled_chips, t.sort_order
    FROM public.tables t
    WHERE t.is_active = true
    ORDER BY t.table_category ASC, t.sort_order ASC, t.created_at ASC;
END;
$$;
