-- Migration: Performance and Security Optimization
-- 1. Create Missing Indexes for Foreign Keys and RLS Columns
-- 2. Optimize RLS policies to use cached is_admin() calls

-- PLAYER STATS
CREATE INDEX IF NOT EXISTS idx_player_stats_user_id ON public.player_stats(user_id);

-- USER DEVICES
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON public.user_devices(user_id);

-- FRIENDSHIPS
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON public.friendships(friend_id);

-- WALLETS
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);

-- TRANSACTIONS
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);

-- TABLES
CREATE INDEX IF NOT EXISTS idx_tables_created_by ON public.tables(created_by);

-- GAMES
CREATE INDEX IF NOT EXISTS idx_games_table_id ON public.games(table_id);

-- GAME PARTICIPANTS
CREATE INDEX IF NOT EXISTS idx_game_participants_game_id ON public.game_participants(game_id);
CREATE INDEX IF NOT EXISTS idx_game_participants_user_id ON public.game_participants(user_id);

-- GAME ROUNDS / ACTIONS
CREATE INDEX IF NOT EXISTS idx_game_rounds_game_id ON public.game_rounds(game_id);
CREATE INDEX IF NOT EXISTS idx_game_actions_game_id ON public.game_actions(game_id);

-- CHAT MESSAGES
CREATE INDEX IF NOT EXISTS idx_chat_messages_game_id ON public.chat_messages(game_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
-- Note: chat_messages are linked to games, support_messages are linked to tickets.

-- SUPPORT MESSAGES
CREATE INDEX IF NOT EXISTS idx_support_messages_user_id ON public.support_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON public.support_messages(ticket_id);

-- NOTIFICATIONS
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- PUSH SUBSCRIPTIONS
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- GAME REPLAYS
CREATE INDEX IF NOT EXISTS idx_game_replays_game_id ON public.game_replays(game_id);

-- REFACTOR RLS FOR PERFORMANCE
-- Use (SELECT public.is_admin()) pattern for caching

-- PROFILES
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles 
  FOR SELECT USING ((SELECT is_admin()));

-- TABLES
DROP POLICY IF EXISTS "Admins can manage all tables" ON public.tables;
CREATE POLICY "Admins can manage all tables" ON public.tables 
  FOR ALL USING ((SELECT is_admin()));

-- USER DEVICES
DROP POLICY IF EXISTS "Admins can view all devices (fraud detection)" ON public.user_devices;
CREATE POLICY "Admins can view all devices (fraud detection)" ON public.user_devices 
  FOR SELECT USING ((SELECT is_admin()));

-- WALLETS
DROP POLICY IF EXISTS "Admins can view all wallets (financial oversight)" ON public.wallets;
CREATE POLICY "Admins can view all wallets (financial oversight)" ON public.wallets 
  FOR SELECT USING ((SELECT is_admin()));

-- TRANSACTIONS
DROP POLICY IF EXISTS "Admins can view all transactions (auditing)" ON public.transactions;
CREATE POLICY "Admins can view all transactions (auditing)" ON public.transactions 
  FOR SELECT USING ((SELECT is_admin()));

DROP POLICY IF EXISTS "Admins can insert transactions (deposits/withdrawals)" ON public.transactions;
CREATE POLICY "Admins can insert transactions (deposits/withdrawals)" ON public.transactions 
  FOR INSERT WITH CHECK ((SELECT is_admin()));

-- GAMES
DROP POLICY IF EXISTS "Admins can view game metadata (no sensitive state)" ON public.games;
CREATE POLICY "Admins can view game metadata (no sensitive state)" ON public.games 
  FOR SELECT USING ((SELECT is_admin()));

-- TOURNAMENTS
DROP POLICY IF EXISTS "Admins can manage tournaments" ON public.tournaments;
CREATE POLICY "Admins can manage tournaments" ON public.tournaments 
  FOR ALL USING ((SELECT is_admin()));

-- ADMIN AUDIT LOG
DROP POLICY IF EXISTS "Only admins can view audit log" ON public.admin_audit_log;
CREATE POLICY "Only admins can view audit log" ON public.admin_audit_log 
  FOR SELECT USING ((SELECT is_admin()));

DROP POLICY IF EXISTS "System can insert audit entries" ON public.admin_audit_log;
CREATE POLICY "System can insert audit entries" ON public.admin_audit_log 
  FOR INSERT WITH CHECK ((SELECT is_admin()));

-- CHAT MESSAGES
DROP POLICY IF EXISTS "Admins can view all chat (moderation)" ON public.chat_messages;
CREATE POLICY "Admins can view all chat (moderation)" ON public.chat_messages 
  FOR SELECT USING ((SELECT is_admin()));

-- SITE SETTINGS
DROP POLICY IF EXISTS "Admins can update settings" ON public.site_settings;
CREATE POLICY "Admins can update settings" ON public.site_settings 
  FOR UPDATE USING ((SELECT is_admin()));

-- AUDIT LOGS
DROP POLICY IF EXISTS "Admins can see audit logs" ON public.audit_logs;
CREATE POLICY "Admins can see audit logs" ON public.audit_logs 
  FOR SELECT USING ((SELECT is_admin()));

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins can insert audit logs" ON public.audit_logs 
  FOR INSERT WITH CHECK ((SELECT is_admin()));

-- GAME REPLAYS
DROP POLICY IF EXISTS "Players can view replays of games they participated in" ON public.game_replays;
CREATE POLICY "Players can view replays of games they participated in" ON public.game_replays
  FOR SELECT USING (
    ((players @> ANY (ARRAY[(SELECT ('[{"userId": "' || (auth.uid())::text || '"}]')::jsonb)]))) 
    OR 
    ((SELECT is_admin()))
  );

-- SUPPORT MESSAGES
DROP POLICY IF EXISTS "Users can view their own support messages" ON public.support_messages;
CREATE POLICY "Users can view their own support messages" ON public.support_messages
  FOR SELECT USING (
    (user_id = (SELECT auth.uid())) 
    OR 
    ((SELECT is_admin()))
  );
