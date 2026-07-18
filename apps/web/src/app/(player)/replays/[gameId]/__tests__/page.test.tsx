import { render, screen, waitFor } from '@testing-library/react'
import ReplayViewer from '../page'
import { getPlayerReplayDetail } from '@/app/actions/replays'

jest.mock('@/app/actions/replays', () => ({
  getPlayerReplayDetail: jest.fn(),
}))

jest.mock('@/components/replay/ReplayController', () => ({
  ReplayController: ({ frames }: { frames: unknown[] }) => <div data-testid="replay-controller">Frames: {frames.length}</div>,
}))

jest.mock('@/components/replay/LandscapeLockOverlay', () => ({
  LandscapeLockOverlay: () => <div data-testid="landscape-overlay" />,
}))

const mockGetPlayerReplayDetail = getPlayerReplayDetail as jest.MockedFunction<typeof getPlayerReplayDetail>

describe('ReplayViewer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetPlayerReplayDetail.mockResolvedValue(null)
  })

  it('muestra loading inicialmente', async () => {
    render(<ReplayViewer params={Promise.resolve({ gameId: 'game-1' })} />)
    expect(screen.getByText('Cargando repetición...')).toBeInTheDocument()
    await screen.findByText('Repetición no encontrada')
  })

  it('muestra error cuando la acción no autoriza el replay', async () => {
    render(<ReplayViewer params={Promise.resolve({ gameId: 'game-1' })} />)
    expect(await screen.findByText('Repetición no encontrada')).toBeInTheDocument()
  })

  it('solo renderiza el detalle saneado que entrega la acción player', async () => {
    mockGetPlayerReplayDetail.mockResolvedValue({
      game_id: 'game-123',
      version: 2,
      frames: [{ players: [] }, { players: [] }],
      players: [],
      pot_breakdown: { totalPot: 100000, piquePot: 20000 },
      final_hands: { 'user-1': { nickname: 'Ana', handType: 'Primera', cards: '7O,7C' } },
      timeline: [],
    } as never)

    render(<ReplayViewer params={Promise.resolve({ gameId: 'game-1' })} />)

    await waitFor(() => {
      expect(screen.getByTestId('replay-controller')).toHaveTextContent('Frames: 2')
      expect(screen.getByText('Primera')).toBeInTheDocument()
      expect(screen.queryByText('Seed:')).not.toBeInTheDocument()
      expect(screen.queryByText('MODO ADMIN')).not.toBeInTheDocument()
    })
    expect(mockGetPlayerReplayDetail).toHaveBeenCalledWith('game-1')
  })

  it('degrada un replay legacy con datos parciales sin montar la reconstrucción visual', async () => {
    mockGetPlayerReplayDetail.mockResolvedValue({
      game_id: 'legacy-1', version: 1, frames: null, players: null, pot_breakdown: null,
      final_hands: null, timeline: null,
    } as never)

    render(<ReplayViewer params={Promise.resolve({ gameId: 'legacy-1' })} />)

    expect(await screen.findByText(/versión 1/i)).toBeInTheDocument()
    expect(screen.queryByTestId('replay-controller')).not.toBeInTheDocument()
    expect(screen.getAllByText('0')).toHaveLength(2)
    expect(screen.queryByText('Manos Finales')).not.toBeInTheDocument()
    expect(screen.queryByText('Línea de Tiempo')).not.toBeInTheDocument()
  })

  it('traduce eventos, resuelve jugadores y conserva fallbacks del timeline', async () => {
    mockGetPlayerReplayDetail.mockResolvedValue({
      game_id: 'game-123', version: 1, frames: [{ players: [{ id: 'session-1', nickname: 'Ana' }] }],
      players: [{ userId: 'user-2', nickname: 'Beto' }], pot_breakdown: {}, final_hands: {},
      timeline: [
        { action: 'voy', player: 'session-1', amount: 100_000, phase: 'PIQUE' },
        { action: 'misterio', player: 'user-2', payout: 200_000, tiene: false },
        { event: 'declarar_juego', winner: 'unknown-player', droppedCards: ['1O', '7C'] },
      ],
    } as never)

    render(<ReplayViewer params={Promise.resolve({ gameId: 'game-123' })} />)

    expect(await screen.findByText('Línea de Tiempo')).toBeInTheDocument()
    expect(screen.getAllByText('Voy')).toHaveLength(2)
    expect(screen.getAllByText('MISTERIO')).toHaveLength(2)
    expect(screen.getAllByText('Declara Juego')).toHaveLength(2)
    expect(screen.getAllByText('@Ana')).toHaveLength(2)
    expect(screen.getAllByText('@Beto')).toHaveLength(2)
    expect(screen.getAllByText('@unknow')).toHaveLength(2)
    expect(screen.getByText(/Descarta 1O, 7C/)).toBeInTheDocument()
    expect(screen.getByText(/No Juego/)).toBeInTheDocument()
  })

  it.each([
    [1, 'grid-cols-1'],
    [2, 'grid-cols-1 sm:grid-cols-2'],
    [3, 'grid-cols-1 sm:grid-cols-3'],
    [4, 'grid-cols-2 lg:grid-cols-4'],
    [5, 'grid-cols-2 sm:grid-cols-3'],
    [6, 'grid-cols-2 sm:grid-cols-3'],
    [7, 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'],
  ])('renderiza las %s manos finales con grilla %s', async (count, gridClasses) => {
    const final_hands = Object.fromEntries(Array.from({ length: count }, (_, index) => [
      `user-${index}`, { nickname: `Jugador ${index + 1}`, handType: index === 0 ? 'Primera' : '', cards: index === 0 ? '7O,7C' : '' },
    ]))
    mockGetPlayerReplayDetail.mockResolvedValue({
      game_id: `game-${count}`, version: 1, frames: [], players: [], pot_breakdown: {}, final_hands, timeline: [],
    } as never)

    render(<ReplayViewer params={Promise.resolve({ gameId: `game-${count}` })} />)

    expect(await screen.findByText('Manos Finales')).toBeInTheDocument()
    expect(screen.getAllByText(/Jugador \d/)).toHaveLength(count)
    expect(screen.getAllByText('Primera')).toHaveLength(1)
    expect(screen.getByText('Manos Finales').parentElement?.querySelector('.grid'))
      .toHaveClass(...gridClasses.split(' '))
  })
})
