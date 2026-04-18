import { Lobby } from "@/components/game/Lobby";
import { getLobbyTables } from "@/app/actions/admin-tables";
import type { LobbyTable } from "@/app/actions/admin-tables";

export default async function LobbyPage() {
  let lobbyTables: { common: LobbyTable[]; custom: LobbyTable[] } = { common: [], custom: [] };

  try {
    lobbyTables = await getLobbyTables();
  } catch (err) {
    console.error("[LobbyPage] Error fetching lobby tables:", err);
  }

  return (
    <div className="min-h-full py-20 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="max-w-5xl mx-auto space-y-12">
        <Lobby lobbyTables={lobbyTables} />
      </div>
    </div>
  );
}
