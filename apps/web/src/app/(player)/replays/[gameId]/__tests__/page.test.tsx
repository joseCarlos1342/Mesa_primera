import { render, screen, waitFor } from '@testing-library/react'
import ReplayViewer from '../page'

const mockGetUser = jest.fn()
const mockSingle = jest.fn()
const mockEq = jest.fn(() => ({ single: mockSingle }))
const mockSelect = jest.fn(() => ({ eq: mockEq }))
const mockFrom = jest.fn(() => ({ select: mockSelect }))

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

jest.mock('@/components/replay/ReplayController', () => ({
  ReplayController: ({ frames }: { frames: unknown[] }) => (
    <div data-testid="replay-controller">Frames: {frames.length}</div>
  ),
}))

jest.mock('@/components/replay/LandscapeLockOverlay', () => ({
  LandscapeLockOverlay: () => <div data-testid="landscape-overlay" />,
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

describe('ReplayViewer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    mockFetch.mockResolvedValue({ ok: false })
  })

  it('muestra loading inicialmente', () => {
    render(<ReplayViewer params={Promise.resolve({ gameId: 'game-1' })} />)
    expect(screen.getByText('Cargando repetición...')).toBeInTheDocument()
  })

  it('muestra error cuando no hay replay', async () => {
    render(<ReplayViewer params={Promise.resolve({ gameId: 'game-1' })} />)

    await waitFor(() => {
      expect(screen.getByText('Repetición no encontrada')).toBeInTheDocument()
    })
  })

  it('renderiza replay con version 2 y frames', async () => {
    mockSingle.mockResolvedValue({
      data: {
        game_id: 'game-123',
        version: 2,
        frames: [{ players: [] }, { players: [] }],
        players: [],
        pot_breakdown: { totalPot: 100000, piquePot: 20000 },
        final_hands: {},
        timeline: [],
        rng_seed: 'seed-abc',
      },
      error: null,
    })

    render(<ReplayViewer params={Promise.resolve({ gameId: 'game-1' })} />)

    await waitFor(() => {
      expect(screen.getByTestId('replay-controller')).toBeInTheDocument()
      expect(screen.getByText('Frames: 2')).toBeInTheDocument()
      expect(screen.getByText('Reconstrucción Visual')).toBeInTheDocument()
    })
  })

  it('renderiza replay legacy sin frames', async () => {
    mockSingle.mockResolvedValue({
      data: {
        game_id: 'game-123',
        version: 1,
        players: [],
        pot_breakdown: {},
        final_hands: {},
        timeline: [],
      },
      error: null,
    })

    render(<ReplayViewer params={Promise.resolve({ gameId: 'game-1' })} />)

    await waitFor(() => {
      expect(screen.getByText(/versión 1 \(legacy\)/)).toBeInTheDocument()
    })
  })

  it('hidrata frames desde game server cuando está disponible', async () => {
    mockSingle.mockResolvedValue({
      data: {
        game_id: 'game-123',
        version: 2,
        frames: [],
        players: [],
        pot_breakdown: {},
        final_hands: {},
        timeline: [],
      },
      error: null,
    })

    process.env.NEXT_PUBLIC_GAME_SERVER_URL = 'http://localhost:2567'
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          frames: [{ players: [] }],
          version: 2,
        },
      }),
    })

    render(<ReplayViewer params={Promise.resolve({ gameId: 'game-1' })} />)

    await waitFor(() => {
      expect(screen.getByTestId('replay-controller')).toBeInTheDocument()
      expect(screen.getByText('Frames: 1')).toBeInTheDocument()
    })
    delete process.env.NEXT_PUBLIC_GAME_SERVER_URL
  })

  it('renderiza timeline con eventos y tiempo', async () => {
    mockSingle.mockResolvedValue({
      data: {
        game_id: 'game-123',
        version: 1,
        players: [{ userId: 'user-1', nickname: 'Ana' }],
        pot_breakdown: {},
        final_hands: {},
        timeline: [
          { event: 'start', time: '2026-07-09T10:00:00Z' },
          { action: 'voy', player: 'user-1', amount: 5000, time: '2026-07-09T10:01:00Z' },
          { event: 'end', winner: 'user-1', payout: 50000 },
        ],
      },
      error: null,
    })

    render(<ReplayViewer params={Promise.resolve({ gameId: 'game-1' })} />)

    await waitFor(() => {
      expect(screen.getByText('Línea de Tiempo')).toBeInTheDocument()
      expect(screen.getAllByText('Inicio').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Voy').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Fin').length).toBeGreaterThan(0)
      expect(screen.getAllByText('@Ana').length).toBeGreaterThan(0)
    })
  })

  it('renderiza final hands con diferentes cantidades', async () => {
    mockSingle.mockResolvedValue({
      data: {
        game_id: 'game-123',
        version: 1,
        players: [],
        pot_breakdown: {},
        final_hands: {
          'user-1': { nickname: 'Ana', handType: 'Primera', cards: '7O,7C,7E,7B' },
          'user-2': { nickname: 'Beto', handType: 'Segunda', cards: '6O,6C' },
          'user-3': { nickname: 'Carlos', cards: '5O' },
        },
        timeline: [],
      },
      error: null,
    })

    render(<ReplayViewer params={Promise.resolve({ gameId: 'game-1' })} />)

    await waitFor(() => {
      expect(screen.getByText('Manos Finales')).toBeInTheDocument()
      expect(screen.getByText('Ana')).toBeInTheDocument()
      expect(screen.getByText('Primera')).toBeInTheDocument()
      expect(screen.getByText('Beto')).toBeInTheDocument()
      expect(screen.getByText('Carlos')).toBeInTheDocument()
    })
  })

  it('muestra modo admin cuando el usuario es admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
      }),
    })

    mockSingle.mockResolvedValue({
      data: {
        game_id: 'game-123',
        version: 1,
        players: [],
        pot_breakdown: {},
        final_hands: {},
        timeline: [],
        admin_timeline: [{ event: 'start' }],
      },
      error: null,
    })

    render(<ReplayViewer params={Promise.resolve({ gameId: 'game-1' })} />)

    await waitFor(() => {
      expect(screen.getByText('MODO ADMIN')).toBeInTheDocument()
      expect(screen.getByText('Modo admin · vista completa')).toBeInTheDocument()
    })
  })
})
