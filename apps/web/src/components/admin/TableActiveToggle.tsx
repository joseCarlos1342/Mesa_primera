"use client";

import { useState } from "react";
import { Power } from "lucide-react";
import { toggleTableActive } from "@/app/actions/admin-tables";
import { useRouter } from "next/navigation";

export function TableActiveToggle({ tableId, isActive }: { tableId: string; isActive: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    const action = isActive ? "desactivar" : "activar";
    if (!confirm(`¿${isActive ? "Desactivar" : "Activar"} esta mesa?`)) return;

    setLoading(true);
    try {
      await toggleTableActive(tableId, !isActive);
      router.refresh();
    } catch (e: any) {
      alert(`Error al ${action}: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`p-3 rounded-xl transition-all disabled:opacity-50 ${
        isActive
          ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
          : "bg-slate-800 text-slate-500 hover:bg-slate-700 border border-white/5"
      }`}
      title={isActive ? "Desactivar mesa" : "Activar mesa"}
    >
      <Power className="w-5 h-5" />
    </button>
  );
}
