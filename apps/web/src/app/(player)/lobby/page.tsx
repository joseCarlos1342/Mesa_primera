import { Lobby } from "@/components/game/Lobby";
import { getLobbyTables } from "@/app/actions/admin-tables";
import type { LobbyTable } from "@/app/actions/admin-tables";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LobbyPage() {
  let lobbyTables: { common: LobbyTable[]; custom: LobbyTable[] } = { common: [], custom: [] };

  try {
    lobbyTables = await getLobbyTables();
  } catch (err) {
    console.error("[LobbyPage] Error fetching lobby tables:", err);
  }

  return <Lobby lobbyTables={lobbyTables} />;
}
