-- =============================================================
-- Security hardening: fix all Supabase advisor warnings/errors
-- =============================================================

-- 1. CRITICAL: Enable RLS on support_tickets (advisor: rls_disabled_in_public)
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- 2. Fix search_path on all SECURITY DEFINER functions (advisor: function_search_path_mutable)
ALTER FUNCTION public.process_admin_transaction(uuid, text) SET search_path = public;
ALTER FUNCTION public.get_ledger_net_balance() SET search_path = public;
ALTER FUNCTION public.handle_friend_request_notification() SET search_path = public;
ALTER FUNCTION public.handle_deposit_request_notification() SET search_path = public;
ALTER FUNCTION public.handle_withdrawal_request_notification() SET search_path = public;
ALTER FUNCTION public.handle_friend_acceptance_notification() SET search_path = public;

-- 3. Restrict game_replays INSERT to service_role only (advisor: rls_policy_always_true)
--    The game server uses service_role key which bypasses RLS anyway,
--    but this closes the hole for authenticated/anon users.
DROP POLICY IF EXISTS "replay_server_insert" ON public.game_replays;
CREATE POLICY "replay_server_insert" ON public.game_replays
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 4. Fix avatars bucket SELECT policy to prevent file enumeration (advisor: public_bucket_allows_listing)
--    Public bucket URLs still work for anyone; this only prevents listing other users' files
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Authenticated users can view avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');
