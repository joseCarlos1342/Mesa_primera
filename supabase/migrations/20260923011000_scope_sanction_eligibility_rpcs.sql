-- Bind player-facing sanction checks to the authenticated subject.

CREATE OR REPLACE FUNCTION public.check_account_eligibility(p_user_id UUID)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('blocked', true, 'sanction_id', s.id, 'sanction_type', s.sanction_type::text, 'reason', s.reason, 'expires_at', s.expires_at)
  FROM public.user_sanctions s
  WHERE s.user_id = p_user_id
    AND (auth.role() = 'service_role' OR auth.uid() = p_user_id OR COALESCE((SELECT public.is_admin()), false))
    AND s.revoked_at IS NULL
    AND s.sanction_type IN ('full_suspension', 'permanent_ban')
    AND (s.expires_at IS NULL OR s.expires_at > NOW())
  ORDER BY s.created_at DESC LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.check_table_access(p_user_id UUID)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('blocked', true, 'sanction_id', s.id, 'sanction_type', s.sanction_type::text, 'reason', s.reason, 'expires_at', s.expires_at)
  FROM public.user_sanctions s
  WHERE s.user_id = p_user_id
    AND (auth.role() = 'service_role' OR auth.uid() = p_user_id OR COALESCE((SELECT public.is_admin()), false))
    AND s.revoked_at IS NULL
    AND s.sanction_type IN ('full_suspension', 'game_suspension', 'permanent_ban')
    AND (s.expires_at IS NULL OR s.expires_at > NOW())
  ORDER BY s.created_at DESC LIMIT 1;
$$;
