import { act } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import GameRoomPage from '../page'
import { client } from '@/lib/colyseus'
import { createClient } from '@/utils/supabase/client'

const push = jest.fn()

jest.mock('next/navigation', () => ({
  useParams: jest.fn(() => ({ id: 'room-123' })),
  useRouter: jest.fn(() => ({ push })),
}))

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => function DynamicMock(props: Record<string, unknown>) {
    if ('phase' in props) {
      return <div data-testid="board">Board {String(props.phase)} cards={String(props.myCards)} disabled={JSON.stringify(props.disabledChips)}</div>
    }
    return <div data-testid="voice-chat">Voice {String(props.roomName)} {String(props.username)}</div>
  },
}))

jest.mock('@/hooks/useWakeLock', () => ({
  useWakeLock: jest.fn(),
}))

jest.mock('@/components/game/game-header', () => ({
  GameHeader: ({ onMenuClick }: { onMenuClick: () => void }) => <button onClick={onMenuClick}>Abrir menu</button>,
}))

jest.mock('@/components/game/RulesModal', () => ({
  RulesModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => isOpen ? <button onClick={onClose}>Reglas abiertas</button> : null,
}))

jest.mock('@/components/game/ReconnectOverlay', () => ({
  ReconnectOverlay: ({ isVisible, message }: { isVisible: boolean; message: string }) => isVisible ? <p>{message}</p> : null,
}))

jest.mock('@/components/game/DepositModal', () => ({
  DepositModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => isOpen ? <button onClick={onClose}>Deposito abierto</button> : null,
}))

jest.mock('@/components/game/TransferModal', () => ({
  GameTransferModal: ({ isOpen, myChips, onClose }: { isOpen: boolean; myChips: number; onClose: () => void }) => isOpen ? <button onClick={onClose}>Transferir {myChips}</button> : null,
}))

jest.mock('@/components/game/TableHelpModal', () => ({
  TableHelpModal: ({ isOpen, roomId, userId, onClose }: { isOpen: boolean; roomId: string; userId: string; onClose: () => void }) => isOpen ? <button onClick={onClose}>Ayuda {roomId} {userId}</button> : null,
}))

jest.mock('@/components/game/PermissionsGate', () => ({
  PermissionsGate: ({ children }: { children: React.ReactNode }) => <div data-testid="permissions-gate">{children}</div>,
}))

jest.mock('@/lib/colyseus', () => ({
  client: {
    joinById: jest.fn(),
    reconnect: jest.fn(),
  },
}))

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}))

const mockJoinById = client.joinById as jest.MockedFunction<typeof client.joinById>
const mockReconnect = client.reconnect as jest.MockedFunction<typeof client.reconnect>
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

const send = jest.fn()
const leave = jest.fn()
let stateHandler: ((state: any) => void) | undefined
let leaveHandler: ((code: number) => void) | undefined
let errorHandler: ((code: number, message?: string) => void) | undefined
const messageHandlers = new Map<string, (data: any) => void>()

function makeRoom(overrides: Partial<{ sessionId: string; state: Record<string, unknown>; reconnectionToken: string }> = {}) {
  return {
    sessionId: overrides.sessionId ?? 'player-1',
    reconnectionToken: overrides.reconnectionToken ?? 'fresh-token',
    state: { isFirstGame: true, minPlayers: 3, ...(overrides.state ?? {}) },
    send,
    leave,
    onLeave: jest.fn((handler) => { leaveHandler = handler }),
    onError: jest.fn((handler) => { errorHandler = handler }),
    onStateChange: jest.fn((handler) => { stateHandler = handler }),
    onMessage: jest.fn((type, handler) => { messageHandlers.set(type, handler) }),
  }
}

function makeSupabase(balance = 6_000_000) {
  return {
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'user-1', user_metadata: { username: 'Ana' } } } })),
    },
    from: jest.fn((table: string) => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: table === 'wallets' ? { balance_cents: balance } : { last_device_id: 'device-db' },
          })),
        })),
      })),
    })),
  }
}

async function flushJoinDelay() {
  await act(async () => {
    jest.advanceTimersByTime(300)
    await Promise.resolve()
  })
}

function emitState(overrides: Record<string, unknown> = {}) {
  act(() => {
    stateHandler?.({
      phase: 'LOBBY',
      pot: 0,
      piquePot: 0,
      dealerId: 'player-1',
      countdown: -1,
      minPique: 500_000,
      proposedPique: 0,
      proposedPiqueBy: '',
      piqueVotesFor: 0,
      piqueVotesAgainst: 0,
      piqueVotersTotal: 0,
      currentMaxBet: 0,
      players: new Map([
        ['player-1', { id: 'player-1', nickname: 'Ana', connected: true, chips: 6_000_000, isReady: false, cardCount: 0 }],
        ['player-2', { id: 'player-2', nickname: 'Beto', connected: true, chips: 5_500_000, isReady: true, cardCount: 0 }],
        ['ghost', { id: 'ghost', nickname: 'Ghost', connected: false, chips: 0, isReady: false, cardCount: 0 }],
      ]),
      ...overrides,
    })
  })
}

describe('GameRoomPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    stateHandler = undefined
    leaveHandler = undefined
    errorHandler = undefined
    messageHandlers.clear()
    sessionStorage.clear()
    localStorage.clear()
    localStorage.setItem('avatarUrl', 'as-oros')
    window.matchMedia = jest.fn(() => ({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })) as unknown as typeof window.matchMedia
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null })
    Object.defineProperty(window.screen, 'orientation', { configurable: true, value: { unlock: jest.fn() } })
    window.alert = jest.fn()
    mockCreateClient.mockReturnValue(makeSupabase() as unknown as ReturnType<typeof createClient>)
    mockJoinById.mockResolvedValue(makeRoom() as never)
  })

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers()
    })
    jest.useRealTimers()
  })

  it('entra a la sala, guarda token y muestra lobby sin ghosts', async () => {
    render(<GameRoomPage />)
    expect(screen.getByText('Conectando a la mesa...')).toBeInTheDocument()

    await flushJoinDelay()
    await waitFor(() => expect(mockJoinById).toHaveBeenCalledWith('room-123', expect.objectContaining({
      nickname: 'Ana',
      deviceId: 'device-db',
      avatarUrl: 'as-oros',
      chips: 6_000_000,
      userId: 'user-1',
    })))
    expect(sessionStorage.getItem('reconnectionToken_room-123')).toBe('fresh-token')
    expect(send).toHaveBeenCalledWith('request-resync')

    emitState()

    expect(await screen.findByText('Sala de Espera')).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Beto')).toBeInTheDocument()
    expect(screen.queryByText('Ghost')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /estoy listo/i }))
    expect(send).toHaveBeenCalledWith('toggleReady', { isReady: true })
  })

  it('reconecta con token guardado, hidrata cartas privadas y renderiza Board fuera de lobby', async () => {
    sessionStorage.setItem('reconnectionToken_room-123', 'old-token')
    mockReconnect.mockResolvedValue(makeRoom({ reconnectionToken: 'new-token' }) as never)

    render(<GameRoomPage />)
    await flushJoinDelay()

    expect(mockReconnect).toHaveBeenCalledWith('old-token')
    expect(sessionStorage.getItem('reconnectionToken_room-123')).toBe('new-token')
    expect(await screen.findByText('Sincronizando tu mesa...')).toBeInTheDocument()

    act(() => {
      messageHandlers.get('private-cards')?.(['1O', '7C', '12E', '3B'])
    })
    emitState({ phase: 'APUESTA_4_CARTAS', players: new Map([['player-1', { id: 'player-1', nickname: 'Ana', connected: true, chips: 6_000_000, isReady: true, cardCount: 4 }]]) })

    expect(screen.getByTestId('board')).toHaveTextContent('Board APUESTA_4_CARTAS cards=1O,7C,12E,3B')
    expect(screen.queryByText('Sincronizando tu mesa...')).not.toBeInTheDocument()
  })

  it('abre modales por eventos globales y envia abandono intencional desde header', async () => {
    render(<GameRoomPage />)
    await flushJoinDelay()
    emitState()

    act(() => {
      window.dispatchEvent(new Event('open-rules-modal'))
      window.dispatchEvent(new Event('open-recharge-modal'))
      window.dispatchEvent(new Event('open-transfer-modal'))
      window.dispatchEvent(new Event('open-table-help'))
    })

    expect(screen.getByText('Reglas abiertas')).toBeInTheDocument()
    expect(screen.getByText('Deposito abierto')).toBeInTheDocument()
    expect(screen.getByText('Transferir 6000000')).toBeInTheDocument()
    expect(screen.getByText('Ayuda room-123 user-1')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /abrir menu/i }))
    expect(send).toHaveBeenCalledWith('abandon')
    expect(leave).toHaveBeenCalledWith(true)
    expect(push).toHaveBeenCalledWith('/')
    expect(sessionStorage.getItem('reconnectionToken_room-123')).toBeNull()
  })

  it('maneja mensajes de pique, banda, error inline y saldo insuficiente', async () => {
    render(<GameRoomPage />)
    await flushJoinDelay()
    emitState({ proposedPique: 1_000_000, proposedPiqueBy: 'player-2', piqueVotesFor: 1, piqueVotesAgainst: 0, piqueVotersTotal: 2 })

    fireEvent.click(await screen.findByRole('button', { name: /aceptar/i }))
    expect(send).toHaveBeenCalledWith('vote_pique', { approve: true })
    expect(screen.getByText('Voto registrado')).toBeInTheDocument()

    act(() => {
      messageHandlers.get('room-config')?.({ disabledChips: [500, 1000] })
      messageHandlers.get('pique-reopen')?.({})
      messageHandlers.get('declarar-juego-option')?.({ hasJuego: true, handType: 'Primera' })
      messageHandlers.get('paso-juego-choice')?.({ handType: 'Primera' })
      messageHandlers.get('banda')?.({ winnerNickname: 'Ana', totalBanda: 2000, bandaPerPlayer: 1000, details: [{ id: 1 }, { id: 2 }] })
    })
    expect(screen.getByText(/Ana \+\$/)).toBeInTheDocument()

    act(() => {
      messageHandlers.get('error')?.({ message: 'Pique mínimo no alcanzado' })
    })
    expect(screen.getByText('Pique mínimo no alcanzado')).toBeInTheDocument()

    act(() => {
      messageHandlers.get('insufficient-balance')?.({ required: 5000000, current: 1000, message: 'Recarga para seguir' })
    })
    expect(screen.getByText('Recarga para seguir')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /cargar fichas/i }))
    expect(screen.getByText('Deposito abierto')).toBeInTheDocument()
  })

  it('fuerza logout limpiando token y redirigiendo al login de jugador', async () => {
    render(<GameRoomPage />)
    await flushJoinDelay()
    sessionStorage.setItem('reconnectionToken_room-123', 'active-token')

    act(() => {
      messageHandlers.get('ForceLogout')?.({ message: 'Sesion reemplazada' })
    })

    expect(window.alert).toHaveBeenCalledWith('Sesion reemplazada')
    expect(sessionStorage.getItem('reconnectionToken_room-123')).toBeNull()
    expect(leave).toHaveBeenCalledWith(true)
    expect(push).toHaveBeenCalledWith('/login/player?kicked=true')
  })

  it('bloquea entrada si el saldo es insuficiente antes de abrir Colyseus', async () => {
    mockCreateClient.mockReturnValue(makeSupabase(1000) as unknown as ReturnType<typeof createClient>)

    render(<GameRoomPage />)
    await flushJoinDelay()

    expect(await screen.findByText(/Fondos insuficientes/)).toBeInTheDocument()
    expect(mockJoinById).not.toHaveBeenCalled()
  })
})
