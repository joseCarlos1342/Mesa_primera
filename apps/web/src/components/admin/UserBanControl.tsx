"use client";

import { useState } from "react";
import { Lock, Unlock } from "lucide-react";
import { toggleBanStatus } from "@/app/actions/admin-users";
import { useRouter } from "next/navigation";

export function UserBanControl({ userId, isBanned, userName }: { userId: string, isBanned: boolean, userName: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    const actionDesc = isBanned ? "desbanear" : "banear";
    if (!confirm(`¿Estás seguro de ${actionDesc} a ${userName}?`)) return;
    
    let reason = undefined;
    if (!isBanned) {
        reason = prompt("Motivo del ban (opcional):", "Violación de reglamento") || undefined;
    }

    setLoading(true);
    try {
      await toggleBanStatus(userId, !isBanned, reason);
      router.refresh();
    } catch (e: any) {
      alert(`Error al ${actionDesc}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (isBanned) {
    return (
      <button 
        onClick={handleToggle}
        disabled={loading}
        className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
      >
        <Unlock className="w-3 h-3" />
        DESBANEAR
      </button>
    );
  }

  return (
    <button 
      onClick={handleToggle}
      disabled={loading}
      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
    >
      <Lock className="w-3 h-3" />
      BANEAR
    </button>
  );
}
