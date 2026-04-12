import { redirect } from "next/navigation";
import { RenderClient } from "./RenderClient";

/**
 * Vista interna de render para el worker de MP4.
 * Accesible vía token secreto en query string (no sesión de usuario).
 *
 * Ruta: /admin/render/[gameId]?token=<RENDER_SECRET_TOKEN>
 *
 * Esta página:
 * 1. Valida el token contra RENDER_SECRET_TOKEN
 * 2. Carga el replay JSON completo desde el game server
 * 3. Renderiza el componente de reproducción automática
 * 4. Señaliza data-render-done="true" al finalizar
 */
export default async function RenderPage({
  params,
  searchParams,
}: {
  params: Promise<{ gameId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { gameId } = await params;
  const { token } = await searchParams;

  // Validar token secreto
  const secret = process.env.RENDER_SECRET_TOKEN;
  if (!secret || token !== secret) {
    redirect("/");
  }

  // Obtener el replay del game server
  const gameServerUrl = process.env.GAME_SERVER_URL || process.env.NEXT_PUBLIC_GAME_SERVER_URL || "http://localhost:2567";
  let replay: any = null;

  try {
    const res = await fetch(`${gameServerUrl}/api/replays/${gameId}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      replay = json.data;
    }
  } catch (e) {
    console.error("[RenderPage] Error fetching replay:", e);
  }

  if (!replay) {
    return (
      <div data-render-done="true" className="flex items-center justify-center h-screen bg-black text-red-500">
        Replay not found: {gameId}
      </div>
    );
  }

  return <RenderClient replay={replay} />;
}
