-- =============================================================
-- Fix support_tickets RLS policies (missing from production)
-- Fix avatars bucket listing scope
-- =============================================================

-- 1. Add all support_tickets policies
CREATE POLICY "Users can view own tickets"
ON public.support_tickets FOR SELECT
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Admins can view all tickets"
ON public.support_tickets FOR SELECT
USING ((SELECT is_admin()));

CREATE POLICY "Users can create own tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Admins can update tickets"
ON public.support_tickets FOR UPDATE
USING ((SELECT is_admin()));

CREATE POLICY "Users can update own tickets"
ON public.support_tickets FOR UPDATE
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "No deletes on tickets"
ON public.support_tickets FOR DELETE
USING (false);

-- 2. Fix avatars bucket: restrict SELECT to user's own folder only
--    Public bucket URLs still work for anyone; this only prevents listing other users' files
DROP POLICY IF EXISTS "Authenticated users can view avatars" ON storage.objects;
CREATE POLICY "Users can view own avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
