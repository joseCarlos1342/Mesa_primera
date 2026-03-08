"use client";

import { useState } from "react";
import { Play, Pause, XCircle } from "lucide-react";
import { setGameStatus } from "@/app/actions/admin-tables";
import { useRouter } from "next/navigation";

export function TableControls({ gameId, currentStatus }: { gameId: string, currentStatus: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleStatusChange = async (newStatus: "playing" | "paused" | "closed_by_admin") => {
    if (newStatus === "closed_by_admin" && !confirm("¿Estás seguro de cerrar esta sala y devolver las fichas a todos?")) return;
    
    setLoading(true);
    try {
      await setGameStatus(gameId, newStatus, newStatus === "paused" ? "Pausado por administrador." : undefined);
      router.refresh(); // Refresh the page to reflect new data
    } catch (e: any) {
      alert("Error al cambiar estado: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      {currentStatus === 'playing' && (
        <button 
          onClick={() => handleStatusChange("paused")}
          disabled={loading}
          className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
        >
          <Pause className="w-3 h-3 fill-current" />
          PAUSAR
        </button>
      )}
      {currentStatus === 'paused' && (
        <button 
          onClick={() => handleStatusChange("playing")}
          disabled={loading}
          className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
        >
          <Play className="w-3 h-3 fill-current" />
          REANUDAR
        </button>
      )}
      <button 
        onClick={() => handleStatusChange("closed_by_admin")}
        disabled={loading}
        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
      >
        <XCircle className="w-3 h-3" />
        CERRAR SALA
      </button>
    </div>
  );
}
