'use client'

import type { Room } from '@colyseus/sdk'
import { AlertCircle, Check, Loader2 } from 'lucide-react'
import { formatAmount, formatCurrency } from '@/utils/format'
import { PlayerAvatar } from '@/components/player/PlayerAvatar'
import { TableSurface } from './TableSurface'

export interface WaitingPlayer {
  readonly id: string
  readonly nickname: string
  readonly chips: number
  readonly isReady?: boolean
  readonly avatarUrl?: string | null
}

interface WaitingRoomProps {
  readonly room: Room | null
  readonly players: readonly WaitingPlayer[]
  readonly maxPlayers?: number
  readonly requiredPlayers: number
  readonly countdown: number
  readonly minPique: number
  readonly proposedPique: number
  readonly proposedPiqueBy: string
  readonly piqueVotesFor: number
  readonly piqueVotesAgainst: number
  readonly piqueVotersTotal: number
  readonly hasVotedPique: boolean
  readonly onVoted: () => void
  readonly showPiqueOptions: boolean
  readonly onTogglePiqueOptions: (open: boolean) => void
  readonly insufficientBalance: { message: string } | null
  readonly onRecharge: () => void
}

const PIQUE_OPTIONS = [500_000, 1_000_000, 2_000_000, 5_000_000] as const

const smallButton =
  'inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light disabled:cursor-not-allowed disabled:opacity-40'

/**
 * Sala de espera sobre la misma superficie de la mesa: pique y votación,
 * jugadores con su estado escrito y un único botón dorado "Estoy listo".
 * Pensada para caber en un teléfono en horizontal (844×390) sin desplazarse.
 */
export function WaitingRoom({
  room,
  players,
  maxPlayers = 7,
  requiredPlayers,
  countdown,
  minPique,
  proposedPique,
  proposedPiqueBy,
  piqueVotesFor,
  piqueVotesAgainst,
  piqueVotersTotal,
  hasVotedPique,
  onVoted,
  showPiqueOptions,
  onTogglePiqueOptions,
  insufficientBalance,
  onRecharge,
}: WaitingRoomProps) {
  const me = players.find((p) => p.id === room?.sessionId)
  const readyCount = players.filter((p) => p.isReady).length
  const enoughPlayers = players.length >= requiredPlayers
  const counting = countdown > 0 && countdown <= 5
  const proposer = players.find((p) => p.id === proposedPiqueBy)?.nickname || 'Jugador'
  const banda = minPique >= 1_000_000 ? 500_000 : 200_000

  const statusLine = !enoughPlayers
    ? requiredPlayers - players.length === 1
      ? `Falta 1 jugador para empezar (mínimo ${requiredPlayers}).`
      : `Faltan ${requiredPlayers - players.length} jugadores para empezar (mínimo ${requiredPlayers}).`
    : counting
      ? null
      : readyCount < players.length
        ? `Listos ${readyCount} de ${players.length}. La partida empieza cuando todos estén listos.`
        : null

  return (
    <div data-testid="waiting-room" className="relative flex min-h-full w-full flex-1 items-center justify-center overflow-hidden" style={{ backgroundColor: '#120806' }}>
      <TableSurface />

      <section
        aria-labelledby="sala-espera-titulo"
        className="relative z-10 mx-3 my-16 grid w-full max-w-5xl gap-4 rounded-xl border border-[#8b6b2e] bg-[#120806]/95 p-4 [@media(max-height:480px)]:mb-2 [@media(max-height:480px)]:mt-[3.75rem] [@media(max-height:480px)]:gap-x-5 [@media(max-height:480px)]:gap-y-2 [@media(max-height:480px)]:p-3 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(240,170,105,0.28)] landscape:my-14 landscape:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] landscape:gap-6 landscape:p-4 md:p-7 lg:my-20 lg:landscape:p-8"
      >
        {/* Columna 1: título, pique y acción */}
        <div className="flex min-w-0 flex-col gap-4 [@media(max-height:480px)]:gap-2">
          <div>
            <h2 id="sala-espera-titulo" className="font-display text-[1.75rem] font-bold leading-tight text-text-premium md:text-[2.25rem] [@media(max-height:480px)]:text-[1.375rem]">
              Sala de espera
            </h2>
            <p className="text-base text-[#d9d3bf]">
              Jugadores <span className="font-mono tabular-nums text-text-premium">{players.length}</span>
              <span className="font-mono tabular-nums text-[#bdb7a6]">/{maxPlayers}</span>
            </p>
          </div>

          <div className="rounded-lg border border-[#8b6b2e]/60 bg-[#0a2c20]/70 px-4 py-3 [@media(max-height:480px)]:py-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="text-base text-[#d9d3bf]">
                Pique mínimo{' '}
                <span className="ml-1 font-mono text-2xl font-medium tabular-nums text-text-premium">${formatAmount(minPique)}</span>
              </p>
              <p className="text-sm text-[#bdb7a6]">
                Banda <span className="font-mono tabular-nums">${formatAmount(banda)}</span> por jugador
              </p>
            </div>

            {proposedPique > 0 ? (
              <div className="mt-3 border-t border-[#8b6b2e]/45 pt-3" role="status">
                <p className="text-base text-[#d9d3bf]">
                  {room?.sessionId === proposedPiqueBy ? 'Propusiste' : `${proposer} propone`}{' '}
                  <span className="font-mono font-semibold tabular-nums text-brand-gold-light">${formatAmount(proposedPique)}</span>
                </p>
                <p className="mt-1 text-sm text-[#bdb7a6]">
                  A favor <span className="font-mono tabular-nums text-[#7fe0a6]">{piqueVotesFor}</span> · En contra{' '}
                  <span className="font-mono tabular-nums text-[#f08a7e]">{piqueVotesAgainst}</span> · de{' '}
                  <span className="font-mono tabular-nums">{piqueVotersTotal}</span>
                </p>
                {room && room.sessionId !== proposedPiqueBy && !hasVotedPique && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { room.send('vote_pique', { approve: false }); onVoted() }}
                      className={`${smallButton} border-[#e74c3c]/60 text-[#f08a7e] hover:bg-[#2a0f0c]`}
                    >
                      Rechazar
                    </button>
                    <button
                      type="button"
                      onClick={() => { room.send('vote_pique', { approve: true }); onVoted() }}
                      className={`${smallButton} border-[#2ecc71]/60 text-[#7fe0a6] hover:bg-[#0a2c20]`}
                    >
                      Aceptar
                    </button>
                  </div>
                )}
                {hasVotedPique && room?.sessionId !== proposedPiqueBy && (
                  <p className="mt-1 text-sm font-semibold text-[#7fe0a6]">Voto registrado</p>
                )}
              </div>
            ) : room && !showPiqueOptions ? (
              <button
                type="button"
                onClick={() => onTogglePiqueOptions(true)}
                className={`${smallButton} mt-2 border-[#8b6b2e]/80 text-text-premium hover:border-brand-gold hover:text-brand-gold-light`}
              >
                Proponer otro pique
              </button>
            ) : room && showPiqueOptions ? (
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Nuevo pique">
                {PIQUE_OPTIONS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => { room.send('propose_pique', { amount }); onTogglePiqueOptions(false) }}
                    disabled={amount === minPique}
                    className={`${smallButton} border-[#8b6b2e]/80 font-mono tabular-nums text-text-premium hover:border-brand-gold`}
                  >
                    ${formatAmount(amount)}
                  </button>
                ))}
                <button type="button" onClick={() => onTogglePiqueOptions(false)} className={`${smallButton} border-transparent text-[#d9d3bf] hover:text-text-premium`}>
                  Cancelar
                </button>
              </div>
            ) : null}
          </div>

          {room && (
            <div className="mt-auto space-y-2">
              {insufficientBalance && (
                <div role="alert" className="flex items-start gap-3 rounded-lg border border-[#e74c3c]/70 bg-[#2a0f0c] px-4 py-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#e74c3c]" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-base text-[#f6d5d0]">{insufficientBalance.message}</p>
                    <button
                      type="button"
                      onClick={onRecharge}
                      className="mt-2 inline-flex min-h-11 items-center rounded-lg bg-brand-gold px-4 text-base font-bold text-[#0a0a0a] transition-colors hover:bg-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light"
                    >
                      Cargar saldo
                    </button>
                  </div>
                </div>
              )}

              {insufficientBalance ? (
                <button type="button" disabled className="inline-flex min-h-14 w-full cursor-not-allowed items-center justify-center rounded-lg border border-[#8b6b2e]/50 text-lg font-semibold text-[#bdb7a6]">
                  Saldo insuficiente
                </button>
              ) : me?.isReady ? (
                <button
                  type="button"
                  onClick={() => room.send('toggleReady', { isReady: false })}
                  className="inline-flex min-h-14 [@media(max-height:480px)]:min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-[#8b6b2e]/80 text-lg font-semibold text-text-premium transition-colors hover:border-brand-gold hover:text-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light"
                >
                  Ya no estoy listo
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => room.send('toggleReady', { isReady: true })}
                  className="inline-flex min-h-14 [@media(max-height:480px)]:min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-gold text-lg font-bold text-[#0a0a0a] shadow-[0_8px_22px_-8px_rgba(0,0,0,0.7)] transition-colors hover:bg-brand-gold-light active:bg-brand-gold-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light focus-visible:ring-offset-2 focus-visible:ring-offset-[#120806]"
                >
                  <Check className="h-5 w-5" aria-hidden="true" />
                  Estoy listo
                </button>
              )}

              <div className="min-h-7 [@media(max-height:480px)]:min-h-6" aria-live="polite">
                {counting ? (
                  <p data-testid="waiting-countdown" className="flex items-center justify-center gap-2 text-lg font-semibold text-brand-gold-light">
                    La partida empieza en
                    <span key={countdown} className="font-mono text-2xl tabular-nums text-text-premium">{countdown}</span>
                  </p>
                ) : statusLine ? (
                  <p className="flex items-center justify-center gap-2 text-center text-base text-[#d9d3bf]">
                    {enoughPlayers && <Loader2 className="h-4 w-4 shrink-0 motion-safe:animate-spin" aria-hidden="true" />}
                    {statusLine}
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Columna 2: jugadores */}
        <div className="min-w-0">
          <h3 className="sr-only">Jugadores en la mesa</h3>
          <ul className="divide-y divide-[#8b6b2e]/30 border-y border-[#8b6b2e]/30 landscape:max-h-[calc(100dvh-9rem)] [@media(max-height:480px)]:max-h-[calc(100dvh-5.5rem)] landscape:overflow-y-auto lg:landscape:max-h-none">
            {players.map((p) => {
              const isMe = room?.sessionId === p.id
              return (
                <li key={p.id} data-testid={`waiting-player-${p.id}`} data-ready={String(Boolean(p.isReady))} className="flex min-h-14 items-center gap-3 py-2 [@media(max-height:480px)]:min-h-12 [@media(max-height:480px)]:py-1">
                  <PlayerAvatar avatar={p.avatarUrl} name={p.nickname} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-lg font-semibold text-text-premium">
                      {p.nickname}
                      {isMe && <span className="ml-2 text-base font-normal text-brand-gold-light">(tú)</span>}
                    </span>
                    <span className="block font-mono text-sm tabular-nums text-[#bdb7a6]">{formatCurrency(p.chips)}</span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-sm font-semibold ${
                      p.isReady ? 'border-[#2ecc71]/50 text-[#7fe0a6]' : 'border-[#8b6b2e]/60 text-[#bdb7a6]'
                    }`}
                  >
                    {p.isReady ? 'Listo' : 'No listo'}
                  </span>
                </li>
              )
            })}
            {Array.from({ length: Math.max(0, Math.min(maxPlayers, requiredPlayers) - players.length) }, (_, i) => (
              <li key={`libre-${i}`} className="flex min-h-14 items-center gap-3 py-2 text-base text-[#8a8478] [@media(max-height:480px)]:min-h-12 [@media(max-height:480px)]:py-1">
                <span aria-hidden="true" className="h-10 w-10 shrink-0 rounded-full border border-dashed border-[#8b6b2e]/60" />
                Puesto libre
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
