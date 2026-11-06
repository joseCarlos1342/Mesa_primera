"use client"

import { useState } from "react"
import { AuthButton, AuthField } from "@/components/auth/AuthForm"
import { PlayerSheet } from "@/components/player/PlayerSheet"

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
  { value: 5_000_000, label: "$50.000" },
  { value: 10_000_000, label: "$100.000" },
  { value: 20_000_000, label: "$200.000" },
  { value: 50_000_000, label: "$500.000" },
]

const MIN_PIQUE_PRESETS = [
  { value: 500_000, label: "$5.000" },
  { value: 1_000_000, label: "$10.000" },
  { value: 2_000_000, label: "$20.000" },
  { value: 5_000_000, label: "$50.000" },
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

  const close = () => {
    resetForm()
    onClose()
  }

  const option = (active: boolean) =>
    `inline-flex min-h-12 items-center justify-center rounded-lg border px-2 font-mono text-lg font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light ${
      active ? 'border-brand-gold bg-[#0a2c20] text-brand-gold-light' : 'border-[#8b6b2e]/60 text-[#d9d3bf] hover:border-brand-gold'
    }`

  return (
    <PlayerSheet
      open={isOpen}
      onClose={close}
      title="Mesa personalizada"
      description="Configura entrada, pique y fichas permitidas."
      closeLabel="Cerrar"
      footer={
        <AuthButton onClick={handleSubmit} disabled={!tableName.trim() || enabledCount < 1} pending={creating}>
          {creating ? 'Creando…' : 'Crear mesa'}
        </AuthButton>
      }
    >
      <div className="space-y-7 pt-2">
        <AuthField
          label="Nombre de la mesa"
          required
          placeholder="Ej.: VIP Diamante, Mesa alta…"
          maxLength={30}
          value={tableName}
          onChange={(e) => setTableName(e.target.value)}
        />

        <fieldset>
          <legend className="mb-2 text-base font-semibold text-text-premium">Máximo de jugadores</legend>
          <div className="grid grid-cols-5 gap-2">
            {[3, 4, 5, 6, 7].map(n => (
              <button key={n} type="button" aria-pressed={maxPlayers === n} onClick={() => setMaxPlayers(n)} className={option(maxPlayers === n)}>
                {n}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-base font-semibold text-text-premium">Entrada mínima (saldo requerido)</legend>
          <div className="grid grid-cols-2 gap-2">
            {MIN_ENTRY_PRESETS.map(p => (
              <button key={p.value} type="button" aria-pressed={minEntry === p.value} onClick={() => setMinEntry(p.value)} className={option(minEntry === p.value)}>
                {p.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-base font-semibold text-text-premium">Pique mínimo</legend>
          <div className="grid grid-cols-2 gap-2">
            {MIN_PIQUE_PRESETS.map(p => (
              <button key={p.value} type="button" aria-pressed={minPique === p.value} onClick={() => setMinPique(p.value)} className={option(minPique === p.value)}>
                {p.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-base font-semibold text-text-premium">
            Fichas habilitadas <span className="font-mono tabular-nums text-[#bdb7a6]">({enabledCount}/{CHIP_DENOMS.length})</span>
          </legend>
          <div className="flex flex-wrap justify-center gap-3 py-2">
            {CHIP_DENOMS.map(denom => {
              const isEnabled = !disabledChips.includes(denom)
              const chip = CHIP_COLORS[denom]
              return (
                <button
                  key={denom}
                  type="button"
                  onClick={() => toggleChip(denom)}
                  aria-pressed={isEnabled}
                  aria-label={`Ficha de ${chip.label}${isEnabled ? ', habilitada' : ', deshabilitada'}`}
                  className={`relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed text-sm font-bold transition-[opacity,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light focus-visible:ring-offset-2 focus-visible:ring-offset-[#120806] ${chip.bg} ${
                    isEnabled ? 'shadow-[0_0_0_2px_#e2b044]' : 'scale-90 opacity-30 grayscale'
                  }`}
                >
                  {chip.label}
                </button>
              )
            })}
          </div>
          {enabledCount < 1 && (
            <p role="alert" className="text-center text-base font-semibold text-[#f08a7e]">Debe haber al menos 1 ficha habilitada</p>
          )}
        </fieldset>
      </div>
    </PlayerSheet>
  )
}
