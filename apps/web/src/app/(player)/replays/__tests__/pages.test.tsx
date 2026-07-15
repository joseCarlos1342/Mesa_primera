import { render, screen } from '@testing-library/react'
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
  rng_seed: 'seed-visible',
  version: 2,
  players: [{ userId: 'user-1', nickname: 'Ana' }],
  frames: [{ players: [{ id: 'session-1', nickname: 'Ana' }] }],
  pot_breakdown: { totalPot: 500000, piquePot: 100000 },
  final_hands: {
    'user-1': { nickname: 'Ana', handType: 'Primera', cards: '1O,7E' },
  },
  timeline: [{ event: 'action', action: 'apostar', player: 'session-1', amount: 50000, time: '2026-05-28T10:35:00.000Z' }],
  admin_timeline: [{ event: 'end', winner: 'user-1', payout: 500000 }],
}

describe('player replay pages', () => {
  let clipboardWrite: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as never
    clipboardWrite = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWrite },
    })
    mockGetPlayerReplayDetail.mockResolvedValue(null)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('muestra empty state cuando el jugador no tiene mesas grabadas', async () => {
    mockGetPlayerMesaReplays.mockResolvedValue([] as never)

    render(await PlayerReplaysPage({ searchParams: Promise.resolve({}) }))

    expect(mockGetPlayerMesaReplays).toHaveBeenCalledWith({ period: '7d', from: undefined, to: undefined })
    expect(screen.getByRole('heading', { name: /mis grabaciones/i })).toBeInTheDocument()
    expect(screen.getByText('Aún no tienes partidas registradas')).toBeInTheDocument()
  })

  it('lista mesas jugadas con jugadores unicos, resultado y enlace al detalle', async () => {
    mockGetPlayerMesaReplays.mockResolvedValue([mesaReplay] as never)

    render(await PlayerReplaysPage({ searchParams: Promise.resolve({}) }))

    expect(screen.getAllByText('Mesa Dorada')[0]).toBeInTheDocument()
    expect(screen.getAllByText(/Ana, Luis \(2\)/)[0]).toBeInTheDocument()
    expect(screen.getAllByText(/\+\$\s*1\.500/)[0]).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /mesa dorada/i })[0]).toHaveAttribute('href', '/replays/mesa/room-alpha-123456')
  })

  it('lista mesas con fallback de nombre, sin jugadores y resultado negativo o neutro', async () => {
    mockGetPlayerMesaReplays.mockResolvedValue([
      { ...mesaReplay, room_id: 'room-loss-123456', table_name: null, players: [], total_net_result: -75000 },
      { ...mesaReplay, room_id: 'room-even-123456', table_name: '', players: null, total_net_result: 0 },
    ] as never)

    render(await PlayerReplaysPage({ searchParams: Promise.resolve({}) }))

    expect(screen.getByText(/2 mesas/)).toBeInTheDocument()
    expect(screen.getAllByText('Mesa')[0]).toBeInTheDocument()
    expect(screen.getAllByText('—')[0]).toBeInTheDocument()
    expect(screen.getAllByText(/-\$\s*750/)[0]).toBeInTheDocument()
    expect(screen.getAllByText(/\$\s*0/)[0]).toBeInTheDocument()
  })

  it('muestra empty state del detalle de mesa sin partidas', async () => {
    mockGetPlayerReplaysForRoom.mockResolvedValue([] as never)

    render(await MesaDetailPage({ params: Promise.resolve({ roomId: 'room-empty' }) }))

    expect(mockGetPlayerReplaysForRoom).toHaveBeenCalledWith('room-empty', { period: '7d', from: undefined, to: undefined })
    expect(screen.getByText('No se encontraron grabaciones')).toBeInTheDocument()
  })

  it('lista partidas de una mesa con victoria, bote y enlace al replay', async () => {
    mockGetPlayerReplaysForRoom.mockResolvedValue([roomGameReplay] as never)

    render(await MesaDetailPage({ params: Promise.resolve({ roomId: 'room-alpha-123456' }) }))

    expect(screen.getByRole('heading', { name: /grabaciones de mesa/i })).toBeInTheDocument()
    expect(screen.getByText('Victoria')).toBeInTheDocument()
    expect(screen.getByText(/\$\s*4\.500/)).toBeInTheDocument()
    expect(screen.getByText(/\+\$\s*1\.200/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /victoria/i })).toHaveAttribute('href', '/replays/game-alpha')
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

    expect(screen.getByText('Derrota')).toBeInTheDocument()
    expect(screen.queryByText('Jugadores contra ti')).not.toBeInTheDocument()
    expect(screen.getByText(/-\$\s*300/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /derrota/i })).toHaveAttribute('href', '/replays/game-loss')
  })

  it('visor muestra fallback cuando no encuentra replay', async () => {
    mockGetPlayerReplayDetail.mockResolvedValue(null)

    render(<ReplayViewer params={Promise.resolve({ gameId: 'missing-game' })} />)

    expect(await screen.findByText('Repetición no encontrada')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver al Inicio' })).toHaveAttribute('href', '/lobby')
  })

  it('visor de jugador muestra el replay saneado sin exponer seed ni modo admin', async () => {
    mockGetPlayerReplayDetail.mockResolvedValue({ ...fullReplay, rng_seed: undefined, admin_timeline: undefined } as never)

    render(<ReplayViewer params={Promise.resolve({ gameId: 'game-alpha-123456' })} />)

    expect(await screen.findByRole('heading', { name: 'Repetición de Partida' })).toBeInTheDocument()
    expect(screen.queryByText(/modo admin/i)).not.toBeInTheDocument()
    expect(screen.getByTestId('replay-controller')).toHaveTextContent('Frames: 1')
    expect(screen.getByText('Primera')).toBeInTheDocument()
    expect(screen.getAllByText('Apuesta')[0]).toBeInTheDocument()

    expect(screen.queryByText('Seed:')).not.toBeInTheDocument()
    expect(screen.queryByText(/modo admin/i)).not.toBeInTheDocument()
  })

  it('visor usa fallback legacy cuando no hay frames reproducibles', async () => {
    mockGetPlayerReplayDetail.mockResolvedValue({
        game_id: 'legacy-game',
        version: 1,
        players: [],
        pot_breakdown: {},
        final_hands: {},
        timeline: [],
    } as never)

    render(<ReplayViewer params={Promise.resolve({ gameId: 'legacy-game' })} />)

    expect(await screen.findByText(/versión 1 \(legacy\)/i)).toBeInTheDocument()
    expect(screen.queryByText('Manos Finales')).not.toBeInTheDocument()
    expect(screen.queryByText('Línea de Tiempo')).not.toBeInTheDocument()
    expect(screen.queryByText('Seed:')).not.toBeInTheDocument()
  })


  it('visor no recibe cartas descartadas en la línea de tiempo saneada', async () => {
    mockGetPlayerReplayDetail.mockResolvedValue({
        ...fullReplay,
        timeline: [{ event: 'action', action: 'descartar', player: 'session-1' }],
    } as never)

    render(<ReplayViewer params={Promise.resolve({ gameId: 'game-alpha-123456' })} />)

    expect(await screen.findAllByText('Descarta')).toHaveLength(2)
    expect(screen.queryByText('Descarta 1O, 7E')).not.toBeInTheDocument()
  })

  it.each([
    [2, 'grid-cols-1 sm:grid-cols-2'],
    [3, 'grid-cols-1 sm:grid-cols-3'],
    [4, 'grid-cols-2 lg:grid-cols-4'],
    [5, 'grid-cols-2 sm:grid-cols-3'],
    [7, 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'],
  ])('visor usa clase de grid correcta para %i manos finales', async (handsCount, expectedClass) => {
    const finalHands = Object.fromEntries(
      Array.from({ length: handsCount }, (_, index) => [
        `user-${index + 1}`,
        { nickname: `Jugador ${index + 1}`, handType: 'Primera', cards: '1O,7E' },
      ]),
    )
    mockGetPlayerReplayDetail.mockResolvedValue({ ...fullReplay, final_hands: finalHands } as never)
    render(
      <ReplayViewer params={Promise.resolve({ gameId: `game-hands-${handsCount}` })} />,
    )

    const finalHandsTitle = await screen.findByText('Manos Finales')
    const finalHandsGrid = finalHandsTitle.parentElement?.querySelector('.grid')
    for (const className of expectedClass.split(' ')) {
      expect(finalHandsGrid).toHaveClass(className)
    }
  })

  it('visor player no habilita la vista admin aunque el payload incluya datos ajenos', async () => {
    mockGetPlayerReplayDetail.mockResolvedValue({ ...fullReplay, admin_timeline: [{ event: 'end', payout: 500000 }] } as never)

    render(<ReplayViewer params={Promise.resolve({ gameId: 'game-alpha-123456' })} />)

    expect(await screen.findByText('Repetición de Partida')).toBeInTheDocument()
    expect(screen.queryByText('MODO ADMIN')).not.toBeInTheDocument()
    expect(screen.queryByText(/Pago \$\s*5\.000/)).not.toBeInTheDocument()
  })
})
