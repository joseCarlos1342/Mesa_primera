"use client";

import { useState } from "react";
import { Ban } from "lucide-react";
import { kickPlayer } from "@/app/actions/admin-tables";
import { useRouter } from "next/navigation";

export function PlayerControls({ gameId, playerId }: { gameId: string, playerId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleKick = async () => {
    if (!confirm("¿Estás seguro de expulsar a este jugador de la partida en curso? Perderá su progreso actual.")) return;
    
    setLoading(true);
    try {
      await kickPlayer(gameId, playerId);
      router.refresh();
    } catch (e: any) {
      alert("Error al expulsar: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleKick}
      disabled={loading}
      className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50"
      title="Expulsar jugador"
    >
        <Ban className="w-4 h-4" />
    </button>
  );
}
