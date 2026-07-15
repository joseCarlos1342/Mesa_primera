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

  it('muestra loading inicialmente', () => {
    render(<ReplayViewer params={Promise.resolve({ gameId: 'game-1' })} />)
    expect(screen.getByText('Cargando repetición...')).toBeInTheDocument()
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
})
