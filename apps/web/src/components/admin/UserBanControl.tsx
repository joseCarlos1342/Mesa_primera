"use client";

import { useState, useEffect } from "react";
import { Lock, Unlock, Shield, AlertTriangle } from "lucide-react";
import { createSanction, revokeSanction, getActiveSanctions, type SanctionRecord, type SanctionInput } from "@/app/actions/admin-sanctions";
import { useRouter } from "next/navigation";

const SANCTION_LABELS: Record<string, string> = {
  full_suspension: 'Suspensión Total',
  game_suspension: 'Suspensión de Juego',
  permanent_ban: 'Veto Permanente',
};

export function UserBanControl({ userId, isBanned, userName }: { userId: string, isBanned: boolean, userName: string }) {
  const [loading, setLoading] = useState(false);
  const [sanctions, setSanctions] = useState<SanctionRecord[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const router = useRouter();

  const hasSanctions = sanctions.length > 0;

  useEffect(() => {
    if (showPanel) {
      getActiveSanctions(userId).then(setSanctions).catch(() => setSanctions([]));
    }
  }, [showPanel, userId]);

  async function handleQuickSanction() {
    const reason = prompt("Motivo de la sanción:", "Violación de reglamento");
    if (!reason) return;

    setLoading(true);
    try {
      await createSanction({
        userId,
        sanctionType: 'game_suspension',
        reason,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      router.refresh();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(sanctionId: string) {
    if (!confirm('¿Revocar esta sanción?')) return;
    setLoading(true);
    try {
      await revokeSanction(sanctionId);
      setSanctions(prev => prev.filter(s => s.id !== sanctionId));
      router.refresh();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {hasSanctions && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-[10px] font-bold text-red-400 uppercase">
            <AlertTriangle className="w-3 h-3" />
            Sancionado
          </span>
        )}
        <button
          onClick={() => setShowPanel(!showPanel)}
          disabled={loading}
          className="px-3 py-1.5 bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 hover:text-white border border-slate-500/20 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
        >
          <Shield className="w-3 h-3" />
          {showPanel ? 'Cerrar' : 'Sanciones'}
        </button>
        {!hasSanctions && (
          <button
            onClick={handleQuickSanction}
            disabled={loading}
            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
          >
            <Lock className="w-3 h-3" />
            Sancionar
          </button>
        )}
      </div>

      {showPanel && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-slate-900 border border-white/10 rounded-2xl p-4 shadow-2xl">
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
            Sanciones activas — {userName}
          </p>
          {sanctions.length === 0 ? (
            <p className="text-slate-600 text-xs py-2">Sin sanciones activas</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {sanctions.map(s => (
                <div key={s.id} className="bg-black/30 border border-white/5 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-red-400">{SANCTION_LABELS[s.sanction_type] || s.sanction_type}</span>
                    <button
                      onClick={() => handleRevoke(s.id)}
                      disabled={loading}
                      className="text-[10px] px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded font-bold disabled:opacity-50"
                    >
                      Revocar
                    </button>
                  </div>
                  <p className="text-slate-400 text-xs">{s.reason}</p>
                  {s.expires_at && (
                    <p className="text-slate-600 text-[10px] mt-1">
                      Expira: {new Date(s.expires_at).toLocaleDateString('es-CO', { dateStyle: 'medium' })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
