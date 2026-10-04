-- Reassert admin policies with public.profiles.role as the authority.

DROP POLICY IF EXISTS "Admins can update settings" ON public.site_settings;
CREATE POLICY "Admins can update settings" ON public.site_settings
  FOR ALL USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "Players can view replays of games they participated in" ON public.game_replays;
CREATE POLICY "Players can view replays of games they participated in" ON public.game_replays
  FOR SELECT USING (
    players @> ANY (ARRAY[(SELECT ('[{"userId": "' || (auth.uid())::text || '"}]')::jsonb)])
    OR (SELECT public.is_admin())
  );

DROP POLICY IF EXISTS "Users can view their own support messages" ON public.support_messages;
CREATE POLICY "Users can view their own support messages" ON public.support_messages
  FOR SELECT USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

DO $$
BEGIN
  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can see audit logs" ON public.audit_logs';
    EXECUTE 'CREATE POLICY "Admins can see audit logs" ON public.audit_logs FOR SELECT USING ((SELECT public.is_admin()))';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs';
    EXECUTE 'CREATE POLICY "Admins can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK ((SELECT public.is_admin()))';
  END IF;
END;
$$;
