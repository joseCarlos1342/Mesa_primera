import { render, screen, within } from '@testing-library/react'
import PlayerReplaysPage from '../page'
import MesaDetailPage from '../mesa/[roomId]/page'
import ReplayViewer from '../[gameId]/page'
import { getPlayerMesaReplays, getPlayerReplayDetail, getPlayerReplaysForRoom } from '@/app/actions/replays'

jest.mock('@/app/actions/replays', () => ({
  getPlayerMesaReplays: jest.fn(),
  getPlayerReplayDetail: jest.fn(),
  getPlayerReplaysForRoom: jest.fn(),
}))

jest.mock('@/components/replay/ReplayController', () => ({
  ReplayController: ({ frames }: { frames: unknown[] }) => <div data-testid="replay-controller">Frames: {frames.length}</div>,
}))

jest.mock('@/components/replay/LandscapeLockOverlay', () => ({
  LandscapeLockOverlay: () => <div data-testid="landscape-lock" />,
}))

// PlayingCard usa next/image; lo reducimos a un <img> simple para las aserciones.
jest.mock('@/components/landing/PlayingCard', () => ({
  PlayingCard: ({ card }: { card: { rank: number; suit: string } }) => (
    <img data-testid="playing-card" alt={`${card.rank}-${card.suit}`} />
  ),
}))

const mockGetPlayerMesaReplays = getPlayerMesaReplays as jest.MockedFunction<typeof getPlayerMesaReplays>
const mockGetPlayerReplayDetail = getPlayerReplayDetail as jest.MockedFunction<typeof getPlayerReplayDetail>
const mockGetPlayerReplaysForRoom = getPlayerReplaysForRoom as jest.MockedFunction<typeof getPlayerReplaysForRoom>

const mesaReplay = {
  room_id: 'room-alpha-123456',
  table_name: 'Mesa Dorada',
  first_played_at: '2026-05-28T10:00:00.000Z',
  last_played_at: '2026-05-28T10:45:00.000Z',
  players: [{ nickname: 'Ana' }, { nickname: 'Luis' }, { nickname: 'Ana' }],
  game_count: 3,
  total_net_result: 150000,
}

const roomGameReplay = {
  game_id: 'game-alpha',
  played_at: '2026-05-28T10:30:00.000Z',
  is_winner: true,
  players: [{ nickname: 'Luis' }, { nickname: 'Marta' }],
  total_pot: 450000,
  net_result: 120000,
}

const fullReplay = {
  game_id: 'game-alpha-123456',
  created_at: '2026-05-28T10:30:00.000Z',
  version: 2,
  players: [{ userId: 'user-1', nickname: 'Ana' }],
  frames: [{ players: [{ id: 'session-1', nickname: 'Ana' }] }],
  pot_breakdown: { totalPot: 500000, piquePot: 100000 },
  final_hands: {
    'user-1': { nickname: 'Ana', handType: 'PRIMERA', cards: '1-O,7-E' },
  },
  timeline: [{ event: 'action', action: 'apostar', player: 'session-1', amount: 50000, time: '2026-05-28T10:35:00.000Z' }],
}

describe('player replay pages', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as never
    mockGetPlayerReplayDetail.mockResolvedValue(null)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('muestra el estado vacío cuando el jugador no tiene mesas grabadas', async () => {
    mockGetPlayerMesaReplays.mockResolvedValue([] as never)

    render(await PlayerReplaysPage({ searchParams: Promise.resolve({}) }))

    expect(mockGetPlayerMesaReplays).toHaveBeenCalledWith({ period: '7d', from: undefined, to: undefined })
    expect(screen.getByRole('heading', { name: 'Repeticiones' })).toBeInTheDocument()
    expect(screen.getByText('No hay partidas en este periodo')).toBeInTheDocument()
    // Periodo 7d (distinto de "all") → enlace "Ver todas".
    expect(screen.getByRole('link', { name: /ver todas/i })).toHaveAttribute('href', '/replays?period=all')
  })

  it('ofrece "Ir a las mesas" en el estado vacío con el periodo total y sin rango', async () => {
    mockGetPlayerMesaReplays.mockResolvedValue([] as never)

    render(await PlayerReplaysPage({ searchParams: Promise.resolve({ period: 'all' }) }))

    expect(screen.getByRole('link', { name: /ir a las mesas/i })).toHaveAttribute('href', '/lobby')
  })

  it('ofrece "Ver todas" en el estado vacío cuando el periodo no es el total', async () => {
    mockGetPlayerMesaReplays.mockResolvedValue([] as never)

    render(await PlayerReplaysPage({ searchParams: Promise.resolve({ period: '30d' }) }))

    expect(screen.getByRole('link', { name: /ver todas/i })).toHaveAttribute('href', '/replays?period=all')
  })

  it('lista mesas jugadas con jugadores únicos, resultado y enlace al detalle', async () => {
    mockGetPlayerMesaReplays.mockResolvedValue([mesaReplay] as never)

    render(await PlayerReplaysPage({ searchParams: Promise.resolve({}) }))

    expect(screen.getByText('Mesa Dorada')).toBeInTheDocument()
    // Jugadores únicos unidos por coma.
    expect(screen.getByText('Ana, Luis')).toBeInTheDocument()
    // Resultado neto positivo → "+$1.500" (150000 centavos / 100).
    expect(screen.getByText('+$1.500')).toBeInTheDocument()
    expect(screen.getByText('3 partidas')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /mesa dorada/i })).toHaveAttribute(
      'href',
      '/replays/mesa/room-alpha-123456',
    )
  })

  it('usa el nombre de mesa por defecto y resultado negativo o neutro', async () => {
    mockGetPlayerMesaReplays.mockResolvedValue([
      { ...mesaReplay, room_id: 'room-loss-123456', table_name: null, players: [], total_net_result: -75000, game_count: 1 },
      { ...mesaReplay, room_id: 'room-even-123456', table_name: '', players: null, total_net_result: 0, game_count: 1 },
    ] as never)

    render(await PlayerReplaysPage({ searchParams: Promise.resolve({}) }))

    expect(screen.getByText(/2 mesas jugadas/)).toBeInTheDocument()
    expect(screen.getAllByText('Mesa')).toHaveLength(2)
    expect(screen.getByText('−$750')).toBeInTheDocument()
    expect(screen.getByText('$0')).toBeInTheDocument()
  })

  it('lista una sola mesa en singular y aplica un periodo válido del query', async () => {
    mockGetPlayerMesaReplays.mockResolvedValue([{ ...mesaReplay, game_count: 1 }] as never)

    render(await PlayerReplaysPage({ searchParams: Promise.resolve({ period: '90d' }) }))

    expect(mockGetPlayerMesaReplays).toHaveBeenCalledWith({ period: '90d', from: undefined, to: undefined })
    expect(screen.getByText(/1 mesa jugada/)).toBeInTheDocument()
    expect(screen.getByText('1 partida')).toBeInTheDocument()
    // El enlace conserva el periodo no-7d en el query.
    expect(screen.getByRole('link', { name: /mesa dorada/i })).toHaveAttribute(
      'href',
      '/replays/mesa/room-alpha-123456?period=90d',
    )
  })

  it('aplica fechas personalizadas del query al listar mesas', async () => {
    mockGetPlayerMesaReplays.mockResolvedValue([] as never)

    render(
      await PlayerReplaysPage({
        searchParams: Promise.resolve({ from: '2026-01-01', to: '2026-02-01' }),
      }),
    )

    expect(mockGetPlayerMesaReplays).toHaveBeenCalledWith({ period: '7d', from: '2026-01-01', to: '2026-02-01' })
  })

  it('muestra el estado vacío del detalle de mesa sin partidas', async () => {
    mockGetPlayerReplaysForRoom.mockResolvedValue([] as never)

    render(await MesaDetailPage({ params: Promise.resolve({ roomId: 'room-empty' }) }))

    expect(mockGetPlayerReplaysForRoom).toHaveBeenCalledWith('room-empty', { period: '7d', from: undefined, to: undefined })
    expect(screen.getByText('No hay partidas grabadas')).toBeInTheDocument()
  })

  it('aplica el periodo y rango del query al detalle de mesa y muestra rivales', async () => {
    mockGetPlayerReplaysForRoom.mockResolvedValue([roomGameReplay] as never)

    render(
      await MesaDetailPage({
        params: Promise.resolve({ roomId: 'room-alpha-123456' }),
        searchParams: Promise.resolve({ period: '30d', from: '2026-01-01', to: '2026-02-01' }),
      }),
    )

    expect(mockGetPlayerReplaysForRoom).toHaveBeenCalledWith('room-alpha-123456', {
      period: '30d',
      from: '2026-01-01',
      to: '2026-02-01',
    })
    expect(screen.getByText(/1 partida ·/)).toBeInTheDocument()
    // Rivales presentes se listan unidos.
    expect(screen.getByText(/Luis · Marta/)).toBeInTheDocument()
  })

  it('lista partidas de una mesa con victoria, bote y enlace al replay', async () => {
    mockGetPlayerReplaysForRoom.mockResolvedValue([roomGameReplay] as never)

    render(await MesaDetailPage({ params: Promise.resolve({ roomId: 'room-alpha-123456' }) }))

    expect(screen.getByRole('heading', { name: 'Partidas de la mesa' })).toBeInTheDocument()
    expect(screen.getByText('Ganaste')).toBeInTheDocument()
    // Bote 450000 centavos → $4.500; neto 120000 → +$1.200
    expect(screen.getByText('$4.500')).toBeInTheDocument()
    expect(screen.getByText('+$1.200')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ganaste/i })).toHaveAttribute('href', '/replays/game-alpha')
  })

  it('tolera jugadores nulos y resultado neutro en el detalle de mesa', async () => {
    mockGetPlayerReplaysForRoom.mockResolvedValue([{
      ...roomGameReplay,
      game_id: 'game-neutro',
      is_winner: false,
      players: null,
      net_result: 0,
    }] as never)

    render(await MesaDetailPage({ params: Promise.resolve({ roomId: 'room-x' }) }))

    expect(screen.getByText('Perdiste')).toBeInTheDocument()
    // net_result 0 → Money sin dirección (neutro).
    expect(screen.getAllByText('$0').length).toBeGreaterThanOrEqual(1)
  })

  it('lista derrota de mesa sin rivales visibles', async () => {
    mockGetPlayerReplaysForRoom.mockResolvedValue([{
      ...roomGameReplay,
      game_id: 'game-loss',
      is_winner: false,
      players: [],
      net_result: -30000,
    }] as never)

    render(await MesaDetailPage({ params: Promise.resolve({ roomId: 'room-loss-123456' }) }))

    expect(screen.getByText('Perdiste')).toBeInTheDocument()
    expect(screen.getByText('−$300')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /perdiste/i })).toHaveAttribute('href', '/replays/game-loss')
  })

  it('el visor muestra el estado vacío cuando no encuentra el replay', async () => {
    mockGetPlayerReplayDetail.mockResolvedValue(null)

    render(<ReplayViewer params={Promise.resolve({ gameId: 'missing-game' })} />)

    expect(await screen.findByText('Repetición no encontrada')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /volver a repeticiones/i })).toHaveAttribute('href', '/replays')
  })

  it('el visor de jugador renderiza la reconstrucción visual, resumen y manos finales', async () => {
    mockGetPlayerReplayDetail.mockResolvedValue(fullReplay as never)

    render(<ReplayViewer params={Promise.resolve({ gameId: 'game-alpha-123456' })} />)

    expect(await screen.findByRole('heading', { name: 'Repetición de la partida' })).toBeInTheDocument()
    expect(screen.getByTestId('replay-controller')).toHaveTextContent('Frames: 1')
    // Secciones del detalle.
    expect(screen.getByRole('heading', { name: 'Resumen' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Manos finales' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Línea de tiempo' })).toBeInTheDocument()
    // handTypeLabel traduce PRIMERA → Primera.
    expect(screen.getByText('Primera')).toBeInTheDocument()
    // La línea de tiempo traduce la acción "apostar" → "Apuesta".
    expect(screen.getByText('Apuesta')).toBeInTheDocument()
    // No se expone seed ni modo admin en la vista de jugador.
    expect(screen.queryByText(/seed/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/modo admin/i)).not.toBeInTheDocument()
  })

  it('el visor oculta la sección de manos finales cuando no hay manos', async () => {
    mockGetPlayerReplayDetail.mockResolvedValue({
      ...fullReplay,
      final_hands: {},
      timeline: [],
    } as never)

    render(<ReplayViewer params={Promise.resolve({ gameId: 'game-sin-manos' })} />)

    expect(await screen.findByRole('heading', { name: 'Resumen' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Manos finales' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Línea de tiempo' })).not.toBeInTheDocument()
  })

  it('el visor traduce el descarte del timeline sin exponer cartas ajenas', async () => {
    mockGetPlayerReplayDetail.mockResolvedValue({
      ...fullReplay,
      timeline: [{ event: 'action', action: 'descartar', player: 'session-1', droppedCards: ['1-O', '7-E'] }],
    } as never)

    render(<ReplayViewer params={Promise.resolve({ gameId: 'game-alpha-123456' })} />)

    // En la línea de tiempo, el detalle muestra las cartas descartadas que llegan saneadas.
    const timeline = (await screen.findByRole('heading', { name: 'Línea de tiempo' })).closest('section')!
    expect(within(timeline).getByText(/Descarta 1-O, 7-E/)).toBeInTheDocument()
  })
})
