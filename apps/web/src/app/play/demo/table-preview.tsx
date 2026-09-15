'use client'

import type { Room } from '@colyseus/sdk'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Board } from '@/components/game/Board'

type DemoPhase = 'PIQUE' | 'DESCARTE' | 'GUERRA' | 'SHOWDOWN'
type ScenarioId = DemoPhase | 'STRESS'

interface DemoPlayer {
  id: string
  nickname: string
  avatarUrl: string
  connected: boolean
  isFolded: boolean
  hasActed: boolean
  isReady: boolean
  isWaiting: boolean
  isAllIn: boolean
  passedWithJuego: boolean
  chips: number
  roundBet: number
  turnOrder: number
  cardCount: number
  revealedCards: string
}

interface DemoScenario {
  id: ScenarioId
  label: string
  phase: DemoPhase
  myCards: string
  pot: number
  piquePot: number
  currentMaxBet: number
  lastAction: string
}

interface DemoRoomState {
  phase: string
  dealerId: string
  turnPlayerId: string
  bottomCard: string
  lastAction: string
}

interface DemoRoom {
  roomId: string
  sessionId: string
  state: DemoRoomState
  send: () => void
  onMessage: () => void
}

const DEMO_PLAYER_ID = 'demo-player'

const SCENARIOS: readonly DemoScenario[] = [
  {
    id: 'PIQUE',
    label: 'Pique',
    phase: 'PIQUE',
    myCards: '01-O,03-C,05-E,07-B',
    pot: 2_400_000,
    piquePot: 700_000,
    currentMaxBet: 500_000,
    lastAction: 'Ana va $5.000 para Pique',
  },
  {
    id: 'DESCARTE',
    label: 'Descarte',
    phase: 'DESCARTE',
    myCards: '01-O,03-C,05-E,07-B',
    pot: 4_800_000,
    piquePot: 1_200_000,
    currentMaxBet: 0,
    lastAction: 'Es tu turno de descartar',
  },
  {
    id: 'GUERRA',
    label: 'Guerra',
    phase: 'GUERRA',
    myCards: '01-O,03-C,05-E,07-B',
    pot: 8_600_000,
    piquePot: 2_400_000,
    currentMaxBet: 1_000_000,
    lastAction: 'Carlos apuesta $10.000',
  },
  {
    id: 'SHOWDOWN',
    label: 'Showdown',
    phase: 'SHOWDOWN',
    myCards: '01-O,03-C,05-E,07-B',
    pot: 12_500_000,
    piquePot: 3_500_000,
    currentMaxBet: 0,
    lastAction: 'Las cartas están sobre la mesa',
  },
  {
    id: 'STRESS',
    label: 'Cifras',
    phase: 'GUERRA',
    myCards: '01-O,03-C,05-E,07-B',
    pot: 4_000_000_000,
    piquePot: 999_999_900,
    currentMaxBet: 0,
    lastAction: 'Prueba de cantidades grandes',
  },
]

const PLAYER_NAMES = ['Tú', 'Ana', 'Carlos', 'Diana', 'Mateo', 'Sofía', 'Julián'] as const
const AVATARS = ['as-oros', 'as-copas', 'as-espadas', 'as-bastos', 'rey-oros', 'rey-copas', 'rey-espadas'] as const
const HANDS = [
  '01-O,03-C,05-E,07-B',
  '02-O,04-C,06-E,01-B',
  '07-O,05-C,03-E,02-B',
  '06-O,04-C,02-E,01-B',
  '05-O,03-C,07-E,04-B',
  '04-O,02-C,06-E,05-B',
  '03-O,07-C,05-E,06-B',
] as const

function createDemoPlayers(phase: DemoPhase): DemoPlayer[] {
  return PLAYER_NAMES.map((nickname, index) => ({
    id: index === 0 ? DEMO_PLAYER_ID : `demo-player-${index + 1}`,
    nickname,
    avatarUrl: AVATARS[index],
    connected: true,
    isFolded: phase === 'SHOWDOWN' && index === 5,
    hasActed: phase !== 'PIQUE',
    isReady: true,
    isWaiting: false,
    isAllIn: phase === 'GUERRA' && index === 4,
    passedWithJuego: false,
    chips: 12_000_000 - index * 1_250_000,
    roundBet: phase === 'GUERRA' ? 1_000_000 + index * 250_000 : 0,
    turnOrder: index + 1,
    cardCount: 4,
    revealedCards: phase === 'SHOWDOWN' ? HANDS[index] : '',
  }))
}

function createDemoRoom(scenario: DemoScenario): Room {
  const room: DemoRoom = {
    roomId: 'visual-preview',
    sessionId: DEMO_PLAYER_ID,
    state: {
      phase: scenario.phase,
      dealerId: DEMO_PLAYER_ID,
      turnPlayerId: DEMO_PLAYER_ID,
      bottomCard: '07-O',
      lastAction: scenario.lastAction,
    },
    send: () => undefined,
    onMessage: () => undefined,
  }

  return room as unknown as Room
}

export function DemoTablePreview() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>('PIQUE')
  const scenario = SCENARIOS.find(({ id }) => id === scenarioId) ?? SCENARIOS[0]
  const players = useMemo(() => createDemoPlayers(scenario.phase), [scenario.phase])
  const room = useMemo(() => createDemoRoom(scenario), [scenario])

  return (
    <div className="relative flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-[#073926]">
      <div className="pointer-events-none fixed right-3 top-3 z-[300] md:right-5 md:top-5">
        <div className="pointer-events-auto flex max-w-[calc(100vw-1.5rem)] flex-col gap-2 rounded-2xl border border-[#d4af37]/30 bg-[#0a180e]/95 p-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl md:flex-row md:items-center md:gap-3 md:rounded-full md:px-4 md:py-2">
          <span className="hidden text-[11px] font-bold uppercase tracking-[0.1em] text-[#fdf0a6]/80 md:inline">
            Vista previa · sin conexión
          </span>
          <div className="flex max-w-full flex-wrap items-center justify-end gap-1" role="group" aria-label="Escenario de la vista previa">
            {SCENARIOS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setScenarioId(id)}
                aria-pressed={scenarioId === id}
                className={`rounded-full px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] transition-colors ${
                  scenarioId === id
                    ? 'bg-[#d4af37] text-[#1a0a00]'
                    : 'text-[#f3edd7]/70 hover:bg-[#d4af37]/10 hover:text-[#fdf0a6]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <Link
            href="/lobby"
            className="rounded-full border border-[#d4af37]/25 px-2.5 py-1.5 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#c5a059] transition-colors hover:border-[#d4af37]/60 hover:text-[#fdf0a6]"
          >
            Salir
          </Link>
        </div>
      </div>

      <main className="min-h-0 flex-1">
        <Board
          room={room}
          phase={scenario.phase}
          players={players}
          pot={scenario.pot}
          piquePot={scenario.piquePot}
          myCards={scenario.myCards}
          minPique={500_000}
          currentMaxBet={scenario.currentMaxBet}
          onPasoJuegoResolved={() => undefined}
        />
      </main>
    </div>
  )
}
