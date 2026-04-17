"use client";

import { useState, useEffect } from "react";
import { createPortal } from 'react-dom'
import { Lock, Shield, AlertTriangle, X } from "lucide-react";
import { createSanction, revokeSanction, getActiveSanctions, type SanctionRecord, type SanctionInput, type SanctionType } from "@/app/actions/admin-sanctions";
import { useRouter } from "next/navigation";

const SANCTION_LABELS: Record<string, string> = {
  full_suspension: 'Suspensión Total',
  game_suspension: 'Suspensión de Juego',
  permanent_ban: 'Veto Permanente',
};

const SANCTION_OPTIONS: Array<{ value: SanctionType; label: string; desc: string }> = [
  { value: 'game_suspension', label: 'Suspensión de Juego', desc: 'No puede unirse a mesas' },
  { value: 'full_suspension', label: 'Suspensión Total', desc: 'No puede iniciar sesión' },
  { value: 'permanent_ban', label: 'Veto Permanente', desc: 'Acceso bloqueado indefinidamente' },
]

type UserBanControlProps = {
  userId: string
  isBanned: boolean
  userName: string
  layout?: 'default' | 'mobile-split'
}

export function UserBanControl({ userId, isBanned, userName, layout = 'default' }: UserBanControlProps) {
  const [loading, setLoading] = useState(false);
  const [sanctions, setSanctions] = useState<SanctionRecord[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [isMounted, setIsMounted] = useState(false)
  const [panelMode, setPanelMode] = useState<'active' | 'create'>('active')
  const [sanctionType, setSanctionType] = useState<SanctionType>('game_suspension')
  const [sanctionReason, setSanctionReason] = useState('')
  const [sanctionDuration, setSanctionDuration] = useState('7')
  const [sanctionDurationUnit, setSanctionDurationUnit] = useState<'days' | 'months'>('days')
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const router = useRouter();

  const hasSanctions = sanctions.length > 0;

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (showPanel) {
      getActiveSanctions(userId).then(setSanctions).catch(() => setSanctions([]));
    }
  }, [showPanel, userId]);

  useEffect(() => {
    if (!isMounted || !showPanel) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isMounted, showPanel])

  function openPanel(mode: 'active' | 'create') {
    setPanelMode(mode)
    setShowPanel(true)
    setResult(null)
  }

  function handleClosePanel() {
    if (loading) return
    setShowPanel(false)
    setResult(null)
  }

  async function handleCreateSanction() {
    if (!sanctionReason.trim()) {
      setResult({ type: 'error', message: 'El motivo de la sanción es obligatorio' })
      return
    }

    setLoading(true);
    try {
      let expiresAt: string | undefined
      if (sanctionType !== 'permanent_ban') {
        const durationNum = parseInt(sanctionDuration, 10) || 7
        const ms = sanctionDurationUnit === 'months'
          ? durationNum * 30 * 24 * 60 * 60 * 1000
          : durationNum * 24 * 60 * 60 * 1000
        expiresAt = new Date(Date.now() + ms).toISOString()
      }

      const input: SanctionInput = {
        userId,
        sanctionType,
        reason: sanctionReason.trim(),
        expiresAt,
      }

      await createSanction(input);
      const refreshedSanctions = await getActiveSanctions(userId)
      setSanctions(refreshedSanctions)
      setPanelMode('active')
      setResult({ type: 'success', message: 'Sanción aplicada exitosamente' })
      router.refresh();
    } catch (e: any) {
      setResult({ type: 'error', message: `Error: ${e.message}` })
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
      setResult({ type: 'error', message: `Error: ${e.message}` })
    } finally {
      setLoading(false);
    }
  }

  const sanctionsButtonClassName = layout === 'mobile-split'
    ? 'flex w-full items-center justify-center gap-2 rounded-xl border border-slate-500/20 bg-slate-500/10 px-3 py-2.5 text-xs font-bold text-slate-300 transition-all hover:bg-slate-500/20 hover:text-white shadow-lg disabled:opacity-50'
    : 'px-3 py-1.5 bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 hover:text-white border border-slate-500/20 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-lg disabled:opacity-50'

  const applyButtonClassName = layout === 'mobile-split'
    ? 'flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs font-bold text-red-400 transition-all hover:bg-red-500/20 shadow-lg disabled:opacity-50'
    : 'px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-lg disabled:opacity-50'

  const triggerMarkup = (
    <>
      <button
        onClick={() => openPanel('active')}
        disabled={loading}
        className={sanctionsButtonClassName}
      >
        <Shield className="h-3.5 w-3.5" />
        <span>Sanciones</span>
        {hasSanctions ? <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-[9px] font-black text-red-400">{sanctions.length}</span> : null}
      </button>
      <button
        onClick={() => openPanel('create')}
        disabled={loading || isBanned}
        className={applyButtonClassName}
      >
        <Lock className="h-3.5 w-3.5" />
        Sancionar
      </button>
    </>
  )

  return (
    <>
      {layout === 'mobile-split' ? <div className="contents">{triggerMarkup}</div> : <div className="flex items-center gap-2">{triggerMarkup}</div>}

      {showPanel && isMounted ? createPortal(
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/88 p-4 pt-8 md:items-center">
          <div className="w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Moderación</p>
                <h3 className="text-xl font-black text-white">{userName}</h3>
              </div>
              <button
                onClick={handleClosePanel}
                disabled={loading}
                className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-white/5 bg-black/20 p-1">
              <button
                onClick={() => setPanelMode('active')}
                className={`rounded-xl px-3 py-2 text-xs font-black uppercase tracking-widest transition-all ${
                  panelMode === 'active' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Sanciones
              </button>
              <button
                onClick={() => setPanelMode('create')}
                className={`rounded-xl px-3 py-2 text-xs font-black uppercase tracking-widest transition-all ${
                  panelMode === 'create' ? 'bg-red-600/15 text-red-300' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Sancionar
              </button>
            </div>

            {result ? (
              <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-bold ${
                result.type === 'success'
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                  : 'border-red-500/20 bg-red-500/10 text-red-400'
              }`}>
                {result.message}
              </div>
            ) : null}

            {panelMode === 'active' ? (
              <div className="space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Sanciones activas</p>
                {sanctions.length === 0 ? (
                  <p className="rounded-2xl border border-white/5 bg-black/20 px-4 py-4 text-sm text-slate-500">Sin sanciones activas</p>
                ) : (
                  <div className="space-y-2 pr-1">
                    {sanctions.map((sanction) => (
                      <div key={sanction.id} className="rounded-2xl border border-white/5 bg-black/20 p-4">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-red-400">{SANCTION_LABELS[sanction.sanction_type] || sanction.sanction_type}</span>
                          <button
                            onClick={() => handleRevoke(sanction.id)}
                            disabled={loading}
                            className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-400 transition-all hover:bg-emerald-500/20 disabled:opacity-50"
                          >
                            Revocar
                          </button>
                        </div>
                        <p className="text-xs text-slate-400">{sanction.reason}</p>
                        {sanction.expires_at ? (
                          <p className="mt-1 text-[10px] text-slate-600">
                            Expira: {new Date(sanction.expires_at).toLocaleDateString('es-CO', { dateStyle: 'medium' })}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo de sanción</label>
                  <div className="space-y-2">
                    {SANCTION_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSanctionType(option.value)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                          sanctionType === option.value
                            ? 'border-red-500/30 bg-red-600/10 text-white'
                            : 'border-white/5 bg-black/20 text-slate-400 hover:border-white/10'
                        }`}
                      >
                        <p className="text-sm font-bold">{option.label}</p>
                        <p className="text-xs text-slate-500">{option.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {sanctionType !== 'permanent_ban' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">Duración</label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={sanctionDuration}
                        onChange={(event) => setSanctionDuration(event.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 font-bold text-white focus:border-indigo-500/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">Unidad</label>
                      <select
                        value={sanctionDurationUnit}
                        onChange={(event) => setSanctionDurationUnit(event.target.value as 'days' | 'months')}
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 font-bold text-white focus:border-indigo-500/50 focus:outline-none"
                      >
                        <option value="days">Días</option>
                        <option value="months">Meses</option>
                      </select>
                    </div>
                  </div>
                ) : null}

                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">Motivo</label>
                  <textarea
                    value={sanctionReason}
                    onChange={(event) => {
                      setSanctionReason(event.target.value)
                      setResult(null)
                    }}
                    placeholder="Describe el motivo de la sanción..."
                    rows={3}
                    className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleClosePanel}
                    className="flex-1 rounded-xl border border-white/5 bg-slate-800 px-4 py-3 text-sm font-bold uppercase tracking-widest text-slate-300 transition-all hover:bg-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateSanction}
                    disabled={loading || !sanctionReason.trim()}
                    className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold uppercase tracking-widest text-white transition-all hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}
