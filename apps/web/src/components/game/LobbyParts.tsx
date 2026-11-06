'use client'

import type { LobbyTable } from '@/app/actions/admin-tables'
import { formatAmount } from '@/utils/format'
import landing from '@/components/landing/landing.module.css'

/* Piezas de presentación del lobby (sin lógica de matchmaking). */

export type ServerStatus = 'connecting' | 'online' | 'offline'

const STATUS_LOOK: Record<ServerStatus, { dot: string; label: string; text: string }> = {
  connecting: { dot: 'bg-brand-gold motion-safe:animate-pulse', label: 'Conectando con las mesas…', text: 'text-brand-gold-light' },
  online: { dot: 'bg-[#2ecc71]', label: 'Mesas en línea', text: 'text-[#7fe0a6]' },
  offline: { dot: 'bg-[#e74c3c]', label: 'Sin conexión con las mesas', text: 'text-[#f08a7e]' },
}

interface ServerStatusBarProps {
  readonly status: ServerStatus
  readonly openTables: number
  readonly playingTables: number
  readonly players: number
  readonly onRetry: () => void
}

/** Estado real de la conexión con el servidor de juego y contadores en vivo. */
export function ServerStatusBar({ status, openTables, playingTables, players, onRetry }: ServerStatusBarProps) {
  const look = STATUS_LOOK[status]
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="server-status"
      data-status={status}
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-y border-[#8b6b2e]/45 py-3"
    >
      <p className={`flex items-center gap-2.5 text-lg font-semibold ${look.text}`}>
        <span aria-hidden="true" className={`h-3 w-3 shrink-0 rounded-full shadow-[0_0_0_3px_rgba(10,10,10,0.9)] ${look.dot}`} />
        {look.label}
      </p>
      {status === 'online' ? (
        <dl className="flex items-baseline gap-5 text-base text-[#bdb7a6]">
          <Counter label="mesas" value={openTables} />
          <Counter label="en juego" value={playingTables} />
          <Counter label={players === 1 ? 'jugador' : 'jugadores'} value={players} />
        </dl>
      ) : status === 'offline' ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-11 items-center rounded-lg border border-[#8b6b2e]/80 px-4 text-base font-semibold text-text-premium transition-colors hover:border-brand-gold hover:text-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light"
        >
          Reintentar
        </button>
      ) : null}
    </div>
  )
}

function Counter({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dd className="font-mono text-xl font-medium tabular-nums text-text-premium">{value}</dd>
      <dt>{label}</dt>
    </div>
  )
}

export type TableState = 'free' | 'waiting' | 'full'

export interface LobbyTableView {
  readonly key: string
  readonly name: string
  readonly isPlaceholder: boolean
  readonly isCustom: boolean
  readonly occupied: number
  readonly capacity: number
  readonly minEntryCents: number
  readonly minPiqueCents: number
  readonly enabledChips?: number
  readonly state: TableState
}

const STATE_LOOK: Record<TableState, { label: string; className: string }> = {
  free: { label: 'Libre', className: 'border-[#8b6b2e]/70 text-[#d9d3bf]' },
  waiting: { label: 'Con jugadores', className: 'border-[#2ecc71]/50 text-[#7fe0a6]' },
  full: { label: 'Llena', className: 'border-[#e74c3c]/55 text-[#f08a7e]' },
}

interface LobbyTableCardProps {
  readonly table: LobbyTableView
  readonly busy: boolean
  readonly disabled: boolean
  readonly onPlay: () => void
  /** Solo admin: cerrar una mesa abierta. */
  readonly onClose?: () => void
}

/** Mesa del lobby sobre paño con canto de nogal: nombre, reglas, ocupación y una acción. */
export function LobbyTableCard({ table, busy, disabled, onPlay, onClose }: LobbyTableCardProps) {
  const look = STATE_LOOK[table.state]
  const full = table.state === 'full'
  const action = full ? 'Mesa llena' : table.isPlaceholder ? 'Abrir mesa' : 'Entrar'
  const headingId = `mesa-${table.key}`
  return (
    <article
      aria-labelledby={headingId}
      data-testid="lobby-table"
      data-state={table.state}
      className={`${landing.felt} ${landing.rim} flex flex-col rounded-xl px-6 pb-6 pt-6 sm:px-7`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 id={headingId} className="font-display text-[1.875rem] font-bold leading-tight text-text-premium">
          {table.name}
        </h3>
        <span className={`mt-1.5 shrink-0 rounded-full border bg-[#0a0a0a]/40 px-2.5 py-0.5 text-sm font-semibold ${look.className}`}>
          {look.label}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 text-[#d9d3bf]">
        <Fact label="Entrada" value={`$${formatAmount(table.minEntryCents)}`} />
        <Fact label="Pique" value={`$${formatAmount(table.minPiqueCents)}`} />
        <Fact label="Jugadores" value={`${table.occupied}/${table.capacity}`} />
      </dl>

      <div
        aria-hidden="true"
        className="mt-4 flex gap-1"
        title={`${table.occupied} de ${table.capacity} puestos ocupados`}
      >
        {Array.from({ length: table.capacity }, (_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i < table.occupied ? 'bg-brand-gold' : 'bg-[#0a0a0a]/45'}`} />
        ))}
      </div>

      {table.isCustom && typeof table.enabledChips === 'number' && (
        <p className="mt-3 text-base text-[#d9d3bf]">Mesa personalizada · {table.enabledChips} fichas habilitadas</p>
      )}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onPlay}
          disabled={disabled || full}
          aria-busy={busy || undefined}
          className={`inline-flex min-h-14 flex-1 items-center justify-center rounded-lg px-6 text-lg font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a2c20] disabled:cursor-not-allowed ${
            full
              ? 'border border-[#8b6b2e]/50 bg-transparent text-[#bdb7a6]'
              : 'bg-brand-gold text-[#0a0a0a] shadow-[0_8px_22px_-8px_rgba(0,0,0,0.7)] hover:bg-brand-gold-light active:bg-brand-gold-dark disabled:opacity-60'
          }`}
        >
          {busy ? 'Preparando mesa…' : action}
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={`Cerrar ${table.name}`}
            title="Cerrar mesa"
            className="inline-flex min-h-14 items-center justify-center rounded-lg border border-[#e74c3c]/60 px-4 text-base font-semibold text-[#f08a7e] transition-colors hover:bg-[#2a0f0c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light"
          >
            Cerrar
          </button>
        )}
      </div>
    </article>
  )
}

function Fact({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-[#bdb7a6]">{label}</dt>
      <dd className="mt-0.5 truncate font-mono text-lg font-medium tabular-nums text-text-premium">{value}</dd>
    </div>
  )
}

/** Construye la vista de una mesa a partir del room de Colyseus y su configuración en BD. */
export function toTableView(room: {
  roomId: string
  clients?: number
  maxClients?: number
  metadata?: Record<string, unknown> | null
  _dbConfig?: LobbyTable
}): LobbyTableView {
  const meta = (room.metadata ?? {}) as Record<string, unknown>
  const db = room._dbConfig
  const isPlaceholder = meta.isPlaceholder === true
  const capacity = Number(room.maxClients || db?.max_players || 7)
  const occupied = isPlaceholder ? 0 : Number((meta.activePlayers as number | undefined) ?? room.clients ?? 0)
  const reserved = Number((meta.totalReservedSeats as number | undefined) ?? occupied)
  const disabledChips = Array.isArray(meta.disabledChips) ? meta.disabledChips.length : (db?.disabled_chips?.length ?? 0)
  const isCustom = meta.isCustom === true || db?.table_category === 'custom'
  return {
    key: room.roomId,
    name: String(meta.tableName || db?.name || 'Mesa'),
    isPlaceholder,
    isCustom,
    occupied,
    capacity,
    minEntryCents: Number(db?.min_entry_cents || meta.minEntry || 5_000_000),
    minPiqueCents: Number(db?.min_pique_cents || meta.minPique || 500_000),
    enabledChips: isCustom ? 6 - disabledChips : undefined,
    state: !isPlaceholder && reserved >= capacity ? 'full' : occupied > 0 ? 'waiting' : 'free',
  }
}
