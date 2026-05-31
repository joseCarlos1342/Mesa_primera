-- =============================================================
-- Security hardening: revoke anon/default EXECUTE on RPC surface
-- =============================================================
-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default. Revoke it
-- globally for future functions and explicitly for existing SECURITY DEFINER
-- RPCs that must not be callable without a valid authenticated session.

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

DO $$
DECLARE
  fn regprocedure;
  auth_allowed_names CONSTANT TEXT[] := ARRAY[
    'admin_adjust_user_balance',
    'append_support_message',
    'bump_passkey_sign_count',
    'check_account_eligibility',
    'check_table_access',
    'claim_bonus',
    'close_support_ticket',
    'custom_is_admin',
    'get_active_sanctions',
    'get_admin_ledger_summary',
    'get_admin_replays',
    'get_bonus_status',
    'get_leaderboard',
    'get_lobby_tables',
    'get_own_profile_role',
    'get_player_replays',
    'get_player_replays_by_mesa',
    'get_player_replays_for_room',
    'get_replay_ledger',
    'get_total_users_balance',
    'get_user_balance',
    'get_user_game_ids',
    'get_vault_status',
    'is_admin',
    'lookup_user_by_phone',
    'process_admin_transaction',
    'register_trusted_device',
    'transfer_between_players'
  ];
  service_only_names CONSTANT TEXT[] := ARRAY[
    'award_pot',
    'detect_potential_collusion',
    'process_ledger_entry',
    'record_ledger_entry',
    'transfer_pique_banda'
  ];
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(auth_allowed_names || service_only_names)
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role', fn);
  END LOOP;

  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(auth_allowed_names)
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;

  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(service_only_names)
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END;
$$;

-- Pre-authentication helpers intentionally remain callable by anon. They must
-- not return sensitive data beyond account existence/trust booleans.
GRANT EXECUTE ON FUNCTION public.check_phone_exists(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_pin(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_device_trusted(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_passkey_device(TEXT, TEXT) TO anon, authenticated;
