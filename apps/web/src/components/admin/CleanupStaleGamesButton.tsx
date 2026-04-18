"use client";

import { Trash2 } from "lucide-react";
import { cleanupStaleGames } from "@/app/actions/admin-tables";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CleanupStaleGamesButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleCleanup = async () => {
    if (!confirm("¿Limpiar partidas huérfanas (más de 2h sin actividad)?")) return;
    setPending(true);
    try {
      const result = await cleanupStaleGames();
      alert(`Limpieza completada: ${result.cleaned} partidas cerradas.`);
      router.refresh();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleCleanup}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
    >
      <Trash2 className="w-4 h-4" />
      {pending ? "Limpiando..." : "Limpiar huérfanas"}
    </button>
  );
}
