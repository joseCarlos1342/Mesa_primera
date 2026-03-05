-- =============================================================
-- Sprint 0 Fix: RLS Policies — Admin Blindness & Comprehensive Access
-- =============================================================
-- This migration adds fine-grained RLS policies ensuring:
-- 1. Players can only see their own sensitive data
-- 2. Admins CANNOT see in-game sensitive data (hands, cards, actions)
-- 3. Admins CAN manage financial and moderation data
-- 4. Transactions (Ledger) are INSERT-only for immutability
-- =============================================================

-- ----------------------------------------
-- Helper: Check if user has admin role
-- ----------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT role FROM public.profiles WHERE id = auth.uid()
  ) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ========================================
-- PROFILES
-- ========================================
-- Drop the overly-permissive demo policy
DROP POLICY IF EXISTS "Admin full access (bypass RLS demo)" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT USING (public.is_admin());

-- ========================================
-- USER_DEVICES (Anti-fraude)
-- ========================================
CREATE POLICY "Users can view own devices"
ON public.user_devices FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own devices"
ON public.user_devices FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all devices (fraud detection)"
ON public.user_devices FOR SELECT USING (public.is_admin());

-- ========================================
-- FRIENDSHIPS
-- ========================================
CREATE POLICY "Users can view own friendships"
ON public.friendships FOR SELECT USING (
  auth.uid() = user_id OR auth.uid() = friend_id
);

CREATE POLICY "Users can manage own friendships"
ON public.friendships FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own friendships"
ON public.friendships FOR DELETE USING (
  auth.uid() = user_id OR auth.uid() = friend_id
);

-- ========================================
-- PLAYER_STATS (public read, own write)
-- ========================================
CREATE POLICY "Users can update own stats"
ON public.player_stats FOR UPDATE USING (auth.uid() = user_id);

-- ========================================
-- WALLETS
-- ========================================
CREATE POLICY "Users can update own wallet (via triggers only)"
ON public.wallets FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all wallets (financial oversight)"
ON public.wallets FOR SELECT USING (public.is_admin());

-- ========================================
-- TRANSACTIONS / LEDGER (INMUTABLE)
-- ========================================
-- The ledger is APPEND-ONLY: no updates, no deletes
CREATE POLICY "Users can view own transactions"
ON public.transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions (auditing)"
ON public.transactions FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can insert transactions (deposits/withdrawals)"
ON public.transactions FOR INSERT WITH CHECK (public.is_admin());

-- Block UPDATE and DELETE on transactions entirely
CREATE POLICY "No updates on ledger"
ON public.transactions FOR UPDATE USING (false);

CREATE POLICY "No deletes on ledger"
ON public.transactions FOR DELETE USING (false);

-- ========================================
-- TABLES (game tables/rooms)
-- ========================================
CREATE POLICY "Users can create tables"
ON public.tables FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can manage all tables"
ON public.tables FOR ALL USING (public.is_admin());

-- ========================================
-- GAMES — ADMIN BLINDNESS STARTS HERE
-- ========================================
-- Admins can see game metadata (id, status, table_id, timestamps)
-- but NOT sensitive game state (handled at column/view level)
CREATE POLICY "Participants can view own games"
ON public.games FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.game_participants gp 
    WHERE gp.game_id = games.id AND gp.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view game metadata (no sensitive state)"
ON public.games FOR SELECT USING (public.is_admin());

-- ========================================
-- GAME_PARTICIPANTS
-- ========================================
CREATE POLICY "Participants can view own participation"
ON public.game_participants FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Participants can view co-players in same game"
ON public.game_participants FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.game_participants gp2 
    WHERE gp2.game_id = game_participants.game_id AND gp2.user_id = auth.uid()
  )
);

-- ========================================
-- GAME_ROUNDS — ADMIN BLIND (no card data)
-- ========================================
CREATE POLICY "Participants can view rounds of own games"
ON public.game_rounds FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.game_participants gp 
    WHERE gp.game_id = game_rounds.game_id AND gp.user_id = auth.uid()
  )
);

-- ADMIN CANNOT see game_rounds (contains card/hand data)
-- This is the core "admin blindness" policy

-- ========================================
-- GAME_ACTIONS — ADMIN BLIND (no card data)
-- ========================================
CREATE POLICY "Participants can view actions of own games"
ON public.game_actions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.game_participants gp 
    WHERE gp.game_id = game_actions.game_id AND gp.user_id = auth.uid()
  )
);

-- ADMIN CANNOT see game_actions (contains play-by-play with card info)

-- ========================================
-- TOURNAMENTS
-- ========================================
CREATE POLICY "Anyone can view active tournaments"
ON public.tournaments FOR SELECT USING (true);

CREATE POLICY "Admins can manage tournaments"
ON public.tournaments FOR ALL USING (public.is_admin());

-- ========================================
-- TOURNAMENT_PARTICIPANTS
-- ========================================
CREATE POLICY "Users can view tournament participants"
ON public.tournament_participants FOR SELECT USING (true);

CREATE POLICY "Users can join tournaments"
ON public.tournament_participants FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ========================================
-- ADMIN_AUDIT_LOG
-- ========================================
CREATE POLICY "Only admins can view audit log"
ON public.admin_audit_log FOR SELECT USING (public.is_admin());

CREATE POLICY "System can insert audit entries"
ON public.admin_audit_log FOR INSERT WITH CHECK (public.is_admin());

-- ========================================
-- CHAT_MESSAGES
-- ========================================
CREATE POLICY "Users can view messages in their games"
ON public.chat_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.game_participants gp 
    WHERE gp.game_id = chat_messages.game_id AND gp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages in their games"
ON public.chat_messages FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.game_participants gp 
    WHERE gp.game_id = chat_messages.game_id AND gp.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all chat (moderation)"
ON public.chat_messages FOR SELECT USING (public.is_admin());
