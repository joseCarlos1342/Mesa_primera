import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * Proxy seguro para descarga de MP4.
 * Valida autenticación y autorización (admin o participante) antes de
 * proxear la petición al game-server con el token secreto server-side.
 * El RENDER_SECRET_TOKEN nunca llega al navegador.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const { gameId } = await params;

  // 1. Autenticar usuario
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // 2. Verificar que es admin O participó en la partida
  const [{ data: profile }, { data: replay }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase
      .from("game_replays")
      .select("players, mp4_status")
      .eq("game_id", gameId)
      .single(),
  ]);

  if (!replay) {
    return NextResponse.json({ error: "Partida no encontrada" }, { status: 404 });
  }

  if (replay.mp4_status !== "ready") {
    return NextResponse.json({ error: "Video no disponible" }, { status: 404 });
  }

  const isAdmin = profile?.role === "admin";
  const players = (replay.players || []) as { userId: string }[];
  const participated = players.some((p) => p.userId === user.id);

  if (!isAdmin && !participated) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // 3. Proxear al game-server con token secreto (server-side only)
  const gameServerUrl =
    process.env.GAME_SERVER_URL || process.env.NEXT_PUBLIC_GAME_SERVER_URL;
  const renderToken = process.env.RENDER_SECRET_TOKEN;

  if (!gameServerUrl || !renderToken) {
    return NextResponse.json(
      { error: "Configuración de servidor incompleta" },
      { status: 500 },
    );
  }

  const upstreamUrl = `${gameServerUrl}/api/replays/${encodeURIComponent(gameId)}/mp4?token=${encodeURIComponent(renderToken)}`;

  const upstream = await fetch(upstreamUrl);
  if (!upstream.ok) {
    return NextResponse.json(
      { error: "No se pudo obtener el video" },
      { status: upstream.status },
    );
  }

  // 4. Stream de vuelta al cliente
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "video/mp4",
      "Content-Disposition": `attachment; filename="${gameId}.mp4"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
