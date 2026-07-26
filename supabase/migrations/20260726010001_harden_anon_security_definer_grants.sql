-- SECURITY DEFINER solo debe estar disponible para sesiones autenticadas o
-- para el worker interno. Las funciones de login que requieren anon quedan
-- fuera de este revoke explícito.

REVOKE ALL ON FUNCTION public.append_issue_ticket_message(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.close_issue_ticket(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_support_issue(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.enqueue_notification_outbox() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_financial_request_event() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.get_admin_replay_detail(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_player_replay_detail(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_player_replays(UUID, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_player_replays_by_mesa(UUID, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_player_replays_for_room(UUID, TEXT, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.search_admin_replays(TEXT) FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.mark_game_recovery_incident_manual_review(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resolve_support_issue_adjustment(UUID, INTEGER, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_game_recovery_checkpoint(UUID, TEXT, BIGINT, TEXT, JSONB, UUID[]) FROM PUBLIC, anon, authenticated;
