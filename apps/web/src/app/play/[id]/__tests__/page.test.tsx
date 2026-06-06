import { act } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import GameRoomPage from '../page'
import { client } from '@/lib/colyseus'
import { createClient } from '@/utils/supabase/client'

const push = jest.fn()
const routerMock = { push }

jest.mock('next/navigation', () => ({
  useParams: jest.fn(() => ({ id: 'room-123' })),
  useRouter: jest.fn(() => routerMock),
}))

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => function DynamicMock(props: Record<string, unknown>) {
    if ('phase' in props) {
      return (
        <div data-testid="board">
          Board {String(props.phase)} cards={String(props.myCards)} disabled={JSON.stringify(props.disabledChips)} juego={JSON.stringify(props.validJuegoOption)} reopen={String(props.piqueReopenActive)} paso={JSON.stringify(props.pasoJuegoChoice)}
          <button onClick={() => (props.onPasoJuegoResolved as () => void)()}>Resolver paso</button>
        </div>
      )
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
let _leaveHandler: ((code: number) => void) | undefined
let errorHandler: ((code: number, message?: string) => void) | undefined
const messageHandlers = new Map<string, (data: any) => void>()

function makeRoom(overrides: Partial<{ sessionId: string; state: Record<string, unknown>; reconnectionToken: string }> = {}) {
  return {
    sessionId: overrides.sessionId ?? 'player-1',
    reconnectionToken: overrides.reconnectionToken ?? 'fresh-token',
    state: { isFirstGame: true, minPlayers: 3, ...(overrides.state ?? {}) },
    send,
    leave,
    onLeave: jest.fn((handler) => { _leaveHandler = handler }),
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

function makeAnonymousSupabase() {
  return {
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null } })),
    },
    from: jest.fn(),
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
    _leaveHandler = undefined
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
    jest.restoreAllMocks()
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
      messageHandlers.get('paso-juego-choice')?.({ hasJuego: true, handType: 'Primera' })
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

  it('auto-cancela listo en portrait y desbloquea orientacion al desmontar', async () => {
    const unlock = jest.fn()
    const exitFullscreen = jest.fn(() => Promise.resolve())
    window.matchMedia = jest.fn(() => ({
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })) as unknown as typeof window.matchMedia
    Object.defineProperty(window.screen, 'orientation', { configurable: true, value: { unlock } })
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: document.body })
    Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exitFullscreen })

    const { unmount } = render(<GameRoomPage />)
    await flushJoinDelay()
    emitState({ players: new Map([['player-1', { id: 'player-1', nickname: 'Ana', connected: true, chips: 6_000_000, isReady: true, cardCount: 0 }]]) })

    expect(await screen.findByText('Gira tu Dispositivo')).toBeInTheDocument()
    await waitFor(() => expect(send).toHaveBeenCalledWith('toggleReady', { isReady: false }))
    await screen.findByTestId('voice-chat')

    act(() => {
      unmount()
    })
    expect(unlock).toHaveBeenCalled()
    expect(exitFullscreen).toHaveBeenCalled()
  })

  it('muestra cuenta regresiva y permite anular listo cuando la mesa alcanza minimo', async () => {
    render(<GameRoomPage />)
    await flushJoinDelay()
    emitState({
      countdown: 4,
      players: new Map([
        ['player-1', { id: 'player-1', nickname: 'Ana', connected: true, chips: 6_000_000, isReady: true, cardCount: 0 }],
        ['player-2', { id: 'player-2', nickname: 'Beto', connected: true, chips: 5_500_000, isReady: true, cardCount: 0 }],
        ['player-3', { id: 'player-3', nickname: 'Caro', connected: true, chips: 5_500_000, isReady: true, cardCount: 0 }],
      ]),
    })

    expect(await screen.findByText('Iniciando partida')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /anular listo/i }))
    expect(send).toHaveBeenCalledWith('toggleReady', { isReady: false })
  })

  it('muestra espera de listos cuando la mesa tiene minimo pero falta un jugador', async () => {
    mockJoinById.mockResolvedValue(makeRoom({ state: { isFirstGame: false, minPlayers: 2 } }) as never)

    render(<GameRoomPage />)
    await flushJoinDelay()
    emitState({
      players: new Map([
        ['player-1', { id: 'player-1', nickname: 'Ana', connected: true, chips: 6_000_000, isReady: true, cardCount: 0 }],
        ['player-2', { id: 'player-2', nickname: 'Beto', connected: true, chips: 5_500_000, isReady: false, cardCount: 0 }],
      ]),
    })

    expect(await screen.findByText(/esperando listos \(1\/2\)/i)).toBeInTheDocument()
  })

  it('no muestra espera de listos cuando todos estan listos y no hay countdown', async () => {
    mockJoinById.mockResolvedValue(makeRoom({ state: { isFirstGame: false, minPlayers: 2 } }) as never)

    render(<GameRoomPage />)
    await flushJoinDelay()
    emitState({
      players: new Map([
        ['player-1', { id: 'player-1', nickname: 'Ana', connected: true, chips: 6_000_000, isReady: true, cardCount: 0 }],
        ['player-2', { id: 'player-2', nickname: 'Beto', connected: true, chips: 5_500_000, isReady: true, cardCount: 0 }],
      ]),
    })

    expect(await screen.findByText('Sala de Espera')).toBeInTheDocument()
    expect(screen.queryByText(/esperando listos/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/iniciando partida/i)).not.toBeInTheDocument()
  })

  it('reproduce un tick por cada segundo nuevo del countdown', async () => {
    const resume = jest.fn(() => Promise.resolve())
    const setFrequency = jest.fn()
    const setGain = jest.fn()
    const rampGain = jest.fn()
    const oscillator = {
      type: 'square',
      frequency: { setValueAtTime: setFrequency },
      connect: jest.fn(),
      disconnect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      onended: null as null | (() => void),
    }
    const gain = {
      gain: {
        setValueAtTime: setGain,
        exponentialRampToValueAtTime: rampGain,
      },
      connect: jest.fn(),
      disconnect: jest.fn(),
    }
    const createOscillator = jest.fn(() => oscillator)
    const createGain = jest.fn(() => gain)
    const audioContextMock = jest.fn(() => ({
      state: 'running',
      currentTime: 0,
      destination: {},
      createOscillator,
      createGain,
      resume,
      close: jest.fn(() => Promise.resolve()),
    }))

    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: audioContextMock,
    })

    render(<GameRoomPage />)
    await flushJoinDelay()

    emitState({ countdown: 4 })
    emitState({ countdown: 3 })
    emitState({ countdown: 3 })
    emitState({ countdown: 2 })

    expect(audioContextMock).toHaveBeenCalledTimes(1)
    expect(createOscillator).toHaveBeenCalledTimes(3)
    expect(createGain).toHaveBeenCalledTimes(3)
    expect(oscillator.start).toHaveBeenCalledTimes(3)
    expect(oscillator.stop).toHaveBeenCalledTimes(3)
    expect(resume).not.toHaveBeenCalled()
    act(() => {
      oscillator.onended?.()
    })
    expect(oscillator.disconnect).toHaveBeenCalled()
    expect(gain.disconnect).toHaveBeenCalled()
  })

  it('reanuda audio suspendido durante el countdown', async () => {
    const resume = jest.fn(() => Promise.resolve())
    const oscillator = {
      type: 'square',
      frequency: { setValueAtTime: jest.fn() },
      connect: jest.fn(),
      disconnect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      onended: null as null | (() => void),
    }
    const gain = {
      gain: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() },
      connect: jest.fn(),
      disconnect: jest.fn(),
    }
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: jest.fn(() => ({
        state: 'suspended',
        currentTime: 0,
        destination: {},
        createOscillator: jest.fn(() => oscillator),
        createGain: jest.fn(() => gain),
        resume,
        close: jest.fn(() => Promise.resolve()),
      })),
    })

    render(<GameRoomPage />)
    await flushJoinDelay()
    emitState({ countdown: 5 })

    expect(resume).toHaveBeenCalled()
  })

  it('marca propuesta propia de pique sin mostrar botones de voto', async () => {
    render(<GameRoomPage />)
    await flushJoinDelay()
    emitState({ proposedPique: 2_000_000, proposedPiqueBy: 'player-1', piqueVotesFor: 0, piqueVotesAgainst: 0, piqueVotersTotal: 3 })

    expect(await screen.findByText('Tu propuesta')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /aceptar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /rechazar/i })).not.toBeInTheDocument()
  })

  it('pasa prompts de juego al tablero y limpia paso resuelto', async () => {
    render(<GameRoomPage />)
    await flushJoinDelay()
    act(() => {
      messageHandlers.get('declarar-juego-option')?.({ hasJuego: true, handType: 'Primera' })
    })
    emitState({ phase: 'DECLARAR_JUEGO', players: new Map([['player-1', { id: 'player-1', nickname: 'Ana', connected: true, chips: 6_000_000, isReady: true, cardCount: 4 }]]) })

    expect(screen.getByTestId('board')).toHaveTextContent('juego={"hasJuego":true,"handType":"Primera"}')

    act(() => {
      messageHandlers.get('paso-juego-choice')?.({ hasJuego: true, handType: 'Primera' })
    })
    emitState({ phase: 'APUESTA_4_CARTAS', turnPlayerId: 'player-1', players: new Map([['player-1', { id: 'player-1', nickname: 'Ana', connected: true, chips: 6_000_000, isReady: true, cardCount: 4 }]]) })
    expect(screen.getByTestId('board')).toHaveTextContent('paso={"hasJuego":true,"handType":"Primera"}')

    fireEvent.click(screen.getByRole('button', { name: /resolver paso/i }))
    expect(screen.getByTestId('board')).toHaveTextContent('paso=null')
  })

  it('limpia paso-juego-choice cuando deja de ser el turno local', async () => {
    render(<GameRoomPage />)
    await flushJoinDelay()

    act(() => {
      messageHandlers.get('paso-juego-choice')?.({ hasJuego: true, handType: 'Primera' })
    })

    emitState({
      phase: 'APUESTA_4_CARTAS',
      turnPlayerId: 'player-1',
      players: new Map([['player-1', { id: 'player-1', nickname: 'Ana', connected: true, chips: 6_000_000, isReady: true, cardCount: 4 }]])
    })
    expect(screen.getByTestId('board')).toHaveTextContent('paso={"hasJuego":true,"handType":"Primera"}')

    emitState({
      phase: 'APUESTA_4_CARTAS',
      turnPlayerId: 'player-2',
      players: new Map([
        ['player-1', { id: 'player-1', nickname: 'Ana', connected: true, chips: 6_000_000, isReady: true, cardCount: 4 }],
        ['player-2', { id: 'player-2', nickname: 'Beto', connected: true, chips: 6_000_000, isReady: true, cardCount: 4 }],
      ])
    })

    expect(screen.getByTestId('board')).toHaveTextContent('paso=null')
  })

  it('pasa reapertura de pique al tablero solo durante la fase de pique', async () => {
    render(<GameRoomPage />)
    await flushJoinDelay()
    act(() => {
      messageHandlers.get('pique-reopen')?.({})
    })
    emitState({ phase: 'PIQUE', players: new Map([['player-1', { id: 'player-1', nickname: 'Ana', connected: true, chips: 6_000_000, isReady: true, cardCount: 4 }]]) })

    expect(screen.getByTestId('board')).toHaveTextContent('reopen=true')

    emitState({ phase: 'APUESTA_4_CARTAS', players: new Map([['player-1', { id: 'player-1', nickname: 'Ana', connected: true, chips: 6_000_000, isReady: true, cardCount: 4 }]]) })
    expect(screen.getByTestId('board')).toHaveTextContent('reopen=false')
  })

  it('permite proponer y cancelar cambios de pique cuando no hay propuesta activa', async () => {
    render(<GameRoomPage />)
    await flushJoinDelay()
    emitState()

    fireEvent.click(await screen.findByRole('button', { name: /cambiar pique/i }))
    fireEvent.click(screen.getByRole('button', { name: '$10.000' }))
    expect(send).toHaveBeenCalledWith('propose_pique', { amount: 1_000_000 })

    fireEvent.click(screen.getByRole('button', { name: /cambiar pique/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(screen.getByRole('button', { name: /cambiar pique/i })).toBeInTheDocument()
  })

  it('maneja error de Colyseus y vuelve al lobby limpiando token', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    render(<GameRoomPage />)
    await flushJoinDelay()
    sessionStorage.setItem('reconnectionToken_room-123', 'bad-token')

    act(() => {
      errorHandler?.(4000, 'Mesa no disponible')
    })

    expect(await screen.findByText('Mesa no disponible')).toBeInTheDocument()
    expect(consoleError).toHaveBeenCalledWith('Colyseus Error [%s]: %s', 4000, 'Mesa no disponible')
    fireEvent.click(screen.getByRole('button', { name: /vuelve al lobby/i }))
    expect(sessionStorage.getItem('reconnectionToken_room-123')).toBeNull()
    expect(push).toHaveBeenCalledWith('/')
  })

  it('dispara animacion de descarte y limpia mensajes de pique aprobados o rechazados', async () => {
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent')
    jest.spyOn(Date, 'now').mockReturnValue(12345)
    render(<GameRoomPage />)
    await flushJoinDelay()
    emitState({ proposedPique: 1_000_000, proposedPiqueBy: 'player-2', piqueVotesFor: 1, piqueVotesAgainst: 0, piqueVotersTotal: 2 })

    fireEvent.click(await screen.findByRole('button', { name: /rechazar/i }))
    expect(screen.getByText('Voto registrado')).toBeInTheDocument()

    act(() => {
      messageHandlers.get('pique_approved')?.({})
      messageHandlers.get('pique_rejected')?.({})
      messageHandlers.get('fold-return-cards')?.({ playerId: 'player-2', cardCount: 2 })
    })

    expect(screen.queryByText('Voto registrado')).not.toBeInTheDocument()
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'animate-discard',
      detail: expect.objectContaining({
        fromPlayerId: 'player-2',
        cards: ['fold-back-12345-0', 'fold-back-12345-1'],
        isFaceUp: false,
      }),
    }))
  })

  it('cae a join normal si falla reconexion expirada y muestra error si join falla', async () => {
    sessionStorage.setItem('reconnectionToken_room-123', 'expired-token')
    mockReconnect.mockRejectedValue(new Error('expired'))
    render(<GameRoomPage />)
    await flushJoinDelay()

    expect(sessionStorage.getItem('reconnectionToken_room-123')).toBe('fresh-token')
    expect(mockJoinById).toHaveBeenCalled()
  })

  it('avisa reconexion no expirada fallida y continua con join normal', async () => {
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    sessionStorage.setItem('reconnectionToken_room-123', 'stale-token')
    mockReconnect.mockRejectedValue(new Error('network down'))

    render(<GameRoomPage />)
    await flushJoinDelay()

    expect(consoleWarn).toHaveBeenCalledWith('Fallo al reconectar:', 'network down')
    expect(sessionStorage.getItem('reconnectionToken_room-123')).toBe('fresh-token')
    expect(mockJoinById).toHaveBeenCalled()
  })

  it('usa fallback anonimo de nickname y deviceId cuando no hay usuario ni storage', async () => {
    const randomSpy = jest.spyOn(Math, 'random')
    randomSpy.mockReturnValueOnce(0.123).mockReturnValueOnce(0.456789)
    mockCreateClient.mockReturnValue(makeAnonymousSupabase() as unknown as ReturnType<typeof createClient>)

    render(<GameRoomPage />)
    await flushJoinDelay()

    expect(sessionStorage.getItem('nickname_room-123')).toBe('Jugador 123')
    expect(localStorage.getItem('deviceId')).toBe('dev_gfzy42h8x2m')
    expect(mockJoinById).toHaveBeenCalledWith('room-123', expect.objectContaining({
      nickname: 'Jugador 123',
      deviceId: 'dev_gfzy42h8x2m',
      userId: null,
      chips: 1000,
    }))
  })

  it('mantiene token y cierra room como no intencional al desmontar', async () => {
    const { unmount } = render(<GameRoomPage />)
    await flushJoinDelay()
    await waitFor(() => expect(sessionStorage.getItem('reconnectionToken_room-123')).toBe('fresh-token'))

    act(() => {
      unmount()
    })

    expect(leave).toHaveBeenCalledWith(false)
    expect(sessionStorage.getItem('reconnectionToken_room-123')).toBe('fresh-token')
  })

  it('muestra overlay de reconexion y recarga si la sala se cierra inesperadamente', async () => {
    render(<GameRoomPage />)
    await flushJoinDelay()

    act(() => {
      _leaveHandler?.(4000)
    })

    expect(await screen.findByText('Sincronizando tu mesa...')).toBeInTheDocument()
    expect(jest.getTimerCount()).toBeGreaterThan(0)
    jest.clearAllTimers()
  })

  it('muestra error si no puede unirse a Colyseus', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    const joinError = new Error('servidor caido')
    mockJoinById.mockRejectedValue(joinError)

    render(<GameRoomPage />)
    await flushJoinDelay()

    expect(await screen.findByText('servidor caido')).toBeInTheDocument()
    expect(consoleError).toHaveBeenCalledWith('Join Error:', joinError)
  })
})
