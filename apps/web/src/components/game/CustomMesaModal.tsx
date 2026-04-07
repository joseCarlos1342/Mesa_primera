"use client"

import { useState } from "react"
import { X, Crown, Coins, Layers, Users } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const CHIP_DENOMS = [100000, 200000, 500000, 1000000, 2000000, 5000000] as const

const CHIP_COLORS: Record<number, { bg: string; label: string }> = {
  100000:  { bg: "bg-[#fbc02d] border-yellow-700", label: "$1k" },
  200000:  { bg: "bg-[#1e88e5] border-blue-800",   label: "$2k" },
  500000:  { bg: "bg-[#e53935] border-red-800",     label: "$5k" },
  1000000: { bg: "bg-[#212121] border-gray-800",    label: "$10k" },
  2000000: { bg: "bg-[#43a047] border-green-800",   label: "$20k" },
  5000000: { bg: "bg-white border-gray-300",         label: "$50k" },
}

const MIN_ENTRY_PRESETS = [
  { value: 5_000_000, label: "$50,000" },
  { value: 10_000_000, label: "$100,000" },
  { value: 20_000_000, label: "$200,000" },
  { value: 50_000_000, label: "$500,000" },
]

const MIN_PIQUE_PRESETS = [
  { value: 500_000, label: "$5,000" },
  { value: 1_000_000, label: "$10,000" },
  { value: 2_000_000, label: "$20,000" },
  { value: 5_000_000, label: "$50,000" },
]

interface CustomMesaModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateMesa: (options: {
    tableName: string
    maxPlayers: number
    minEntry: number
    minPique: number
    disabledChips: number[]
    isCustom: boolean
  }) => void
  creating: boolean
}

export function CustomMesaModal({ isOpen, onClose, onCreateMesa, creating }: CustomMesaModalProps) {
  const [tableName, setTableName] = useState("")
  const [maxPlayers, setMaxPlayers] = useState(7)
  const [minEntry, setMinEntry] = useState(5_000_000)
  const [minPique, setMinPique] = useState(500_000)
  const [disabledChips, setDisabledChips] = useState<number[]>([])

  const toggleChip = (denom: number) => {
    setDisabledChips(prev =>
      prev.includes(denom)
        ? prev.filter(d => d !== denom)
        : [...prev, denom]
    )
  }

  const enabledCount = CHIP_DENOMS.length - disabledChips.length

  const handleSubmit = () => {
    if (!tableName.trim()) return
    if (enabledCount < 1) return
    onCreateMesa({
      tableName: tableName.trim(),
      maxPlayers,
      minEntry,
      minPique,
      disabledChips,
      isCustom: true,
    })
  }

  const resetForm = () => {
    setTableName("")
    setMaxPlayers(7)
    setMinEntry(5_000_000)
    setMinPique(500_000)
    setDisabledChips([])
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative bg-gradient-to-b from-[#0d1117] to-[#080c10] border-2 border-[#d4af37]/20 rounded-[2rem] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-[0_50px_100px_rgba(0,0,0,0.8),0_0_60px_rgba(212,175,55,0.08)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-gradient-to-b from-[#0d1117] to-[#0d1117]/95 backdrop-blur-xl px-6 pt-6 pb-4 border-b border-[#d4af37]/10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-[#d4af37]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black italic uppercase tracking-wider text-white">Mesa Personalizada</h2>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 mt-0.5">Configuración del admin</p>
                  </div>
                </div>
                <button
                  onClick={() => { resetForm(); onClose(); }}
                  className="p-2 hover:bg-white/5 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* Nombre de la Mesa */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d4af37]/70 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5" />
                  Nombre de la Mesa
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: VIP Diamante, Mesa Alta..."
                  maxLength={30}
                  className="w-full bg-black/60 border border-white/5 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#d4af37]/40 transition-colors text-sm font-bold"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                />
              </div>

              {/* Máx Jugadores */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d4af37]/70 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" />
                  Máx. Jugadores
                </label>
                <div className="flex gap-2">
                  {[3, 4, 5, 6, 7].map(n => (
                    <button
                      key={n}
                      onClick={() => setMaxPlayers(n)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all border ${
                        maxPlayers === n
                          ? "bg-[#d4af37]/15 border-[#d4af37]/40 text-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.1)]"
                          : "bg-black/40 border-white/5 text-slate-500 hover:text-slate-300 hover:border-white/10"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Entrada Mínima */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d4af37]/70 flex items-center gap-2">
                  <Coins className="w-3.5 h-3.5" />
                  Entrada Mínima (Saldo requerido)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {MIN_ENTRY_PRESETS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setMinEntry(p.value)}
                      className={`py-2.5 rounded-xl text-sm font-black transition-all border ${
                        minEntry === p.value
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                          : "bg-black/40 border-white/5 text-slate-500 hover:text-slate-300 hover:border-white/10"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pique Mínimo */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d4af37]/70 flex items-center gap-2">
                  <Coins className="w-3.5 h-3.5" />
                  Pique Mínimo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {MIN_PIQUE_PRESETS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setMinPique(p.value)}
                      className={`py-2.5 rounded-xl text-sm font-black transition-all border ${
                        minPique === p.value
                          ? "bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                          : "bg-black/40 border-white/5 text-slate-500 hover:text-slate-300 hover:border-white/10"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fichas Habilitadas */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d4af37]/70">
                  Fichas Habilitadas ({enabledCount}/{CHIP_DENOMS.length})
                </label>
                <div className="flex flex-wrap gap-2.5 justify-center py-2">
                  {CHIP_DENOMS.map(denom => {
                    const isEnabled = !disabledChips.includes(denom)
                    const chip = CHIP_COLORS[denom]
                    return (
                      <button
                        key={denom}
                        onClick={() => toggleChip(denom)}
                        className={`relative w-14 h-14 rounded-full flex items-center justify-center font-black text-[10px] border-2 border-dashed transition-all ${chip.bg} ${
                          isEnabled
                            ? "ring-2 ring-emerald-400 scale-105 shadow-lg"
                            : "opacity-25 scale-90 grayscale"
                        }`}
                      >
                        {chip.label}
                        {isEnabled && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-[8px] font-black">✓</span>
                          </span>
                        )}
                        {!isEnabled && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="w-10 h-0.5 bg-red-500 rotate-45 absolute" />
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
                {enabledCount < 1 && (
                  <p className="text-red-400 text-xs text-center font-bold">Debe haber al menos 1 ficha habilitada</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 px-6 py-4 border-t border-[#d4af37]/10 bg-gradient-to-t from-[#080c10] to-[#080c10]/95 backdrop-blur-xl">
              <button
                onClick={handleSubmit}
                disabled={creating || !tableName.trim() || enabledCount < 1}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#d4af37] to-[#b8941f] text-slate-950 font-black uppercase tracking-[0.2em] text-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_10px_30px_rgba(212,175,55,0.2)]"
              >
                {creating ? "CREANDO..." : "CREAR MESA PERSONALIZADA"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
