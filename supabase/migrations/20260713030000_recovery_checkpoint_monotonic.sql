-- El motor puede reintentar escrituras; nunca debe reemplazar un checkpoint
-- más nuevo ni cambiar el roster de una mano ya iniciada.
CREATE OR REPLACE FUNCTION public.save_game_recovery_checkpoint(
  p_game_id UUID,
  p_room_id TEXT,
  p_checkpoint_version BIGINT,
  p_state_hash TEXT,
  p_private_state JSONB,
  p_roster_user_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows_affected BIGINT;
BEGIN
  IF p_checkpoint_version < 1 OR cardinality(p_roster_user_ids) = 0 THEN
    RETURN jsonb_build_object('error', 'Checkpoint inválido');
  END IF;

  INSERT INTO public.game_recovery_checkpoints AS checkpoint (
    game_id, room_id, checkpoint_version, captured_at, state_hash, private_state, roster_user_ids
  ) VALUES (
    p_game_id, p_room_id, p_checkpoint_version, now(), p_state_hash, p_private_state, p_roster_user_ids
  )
  ON CONFLICT (game_id) DO UPDATE
    SET room_id = EXCLUDED.room_id,
        checkpoint_version = EXCLUDED.checkpoint_version,
        captured_at = EXCLUDED.captured_at,
        state_hash = EXCLUDED.state_hash,
        private_state = EXCLUDED.private_state
    WHERE checkpoint.checkpoint_version < EXCLUDED.checkpoint_version
      AND checkpoint.roster_user_ids = EXCLUDED.roster_user_ids;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'saved', v_rows_affected > 0);
END;
$$;

REVOKE ALL ON FUNCTION public.save_game_recovery_checkpoint(UUID, TEXT, BIGINT, TEXT, JSONB, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_game_recovery_checkpoint(UUID, TEXT, BIGINT, TEXT, JSONB, UUID[]) TO service_role;
