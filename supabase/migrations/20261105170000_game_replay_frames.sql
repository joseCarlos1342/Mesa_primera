-- Cuadros de repetición (v2) persistidos en Supabase.
--
-- Hasta ahora los frames solo vivían en el disco del VPS (ReplayFileService,
-- retención de 7 días) y la web los pedía al game server con un secreto
-- interno. Si el secreto faltaba en Vercel o el archivo ya se había limpiado,
-- la repetición quedaba sin tablero.
--
-- Los frames contienen las cartas privadas de todos los jugadores, así que la
-- tabla queda cerrada: RLS sin políticas y sin permisos para anon/authenticated.
-- Solo la service_role escribe (game server) y lee (server actions de la web,
-- que verifican la participación con get_player_replay_detail y sanitizan las
-- cartas de los demás antes de devolverlas).

CREATE TABLE IF NOT EXISTS public.game_replay_frames (
  game_id    UUID PRIMARY KEY,
  version    INTEGER NOT NULL DEFAULT 2,
  frames     JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.game_replay_frames ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.game_replay_frames FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.game_replay_frames TO service_role;

COMMENT ON TABLE public.game_replay_frames IS
  'Frames v2 de cada repetición. Solo service_role; la web sanitiza antes de mostrar.';
