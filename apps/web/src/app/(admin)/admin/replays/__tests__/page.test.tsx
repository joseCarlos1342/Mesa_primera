import { render, screen } from '@testing-library/react'
import AdminReplaysPage from '../page'
import { getAdminReplaysSummary, getAllReplays } from '@/app/actions/replays'

jest.mock('@/app/actions/replays', () => ({
  getAllReplays: jest.fn(),
  getAdminReplaysSummary: jest.fn(),
}))

type ReplayEntry = {
  game_id: string
  played_at: string
  total_pot: number
  total_rake: number
  winner_id: string | null
  players?: Array<{ userId: string; nickname: string }> | null
}

jest.mock('@/components/admin/ResponsiveDataView', () => ({
  ResponsiveDataView: ({ columns, data, emptyMessage, header, keyExtractor, renderCard }: {
    columns: Array<{ key: string; header: string; render?: (entry: ReplayEntry) => React.ReactNode }>
    data: ReplayEntry[]
    emptyMessage: string
    header: React.ReactNode
    keyExtractor: (entry: ReplayEntry) => string
    renderCard: (entry: ReplayEntry) => React.ReactNode
  }) => (
    <div data-testid="replays-data-view">
      {header}
      {data.length === 0 ? <p>{emptyMessage}</p> : null}
      {data.map((entry) => (
        <article key={keyExtractor(entry)}>
          {columns.map((column) => (
            <section key={column.key} aria-label={column.header}>{column.render?.(entry)}</section>
          ))}
          <div data-testid={`replay-card-${entry.game_id}`}>{renderCard(entry)}</div>
        </article>
      ))}
    </div>
  ),
}))

const mockGetAllReplays = getAllReplays as jest.MockedFunction<typeof getAllReplays>
const mockGetAdminReplaysSummary = getAdminReplaysSummary as jest.MockedFunction<typeof getAdminReplaysSummary>

describe('AdminReplaysPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetAdminReplaysSummary.mockResolvedValue({
      totalGamesWithReplay: 500,
      totalReplayRakeCents: 12500000,
      totalUniqueReplayPlayers: 80,
    })
  })

  it('usa el summary global, no la muestra visible, para los cards', async () => {
    mockGetAllReplays.mockResolvedValue([
      {
        game_id: 'game-1',
        played_at: '2026-05-25T10:00:00.000Z',
        total_pot: 1500000,
        total_rake: 50000,
        winner_id: 'u1',
        players: [{ userId: 'u1', nickname: 'Ana' }, { userId: 'u2', nickname: 'Beto' }],
      },
      {
        game_id: 'game-2',
        played_at: '2026-05-25T11:00:00.000Z',
        total_pot: 2500000,
        total_rake: 75000,
        winner_id: 'u3',
        players: [{ userId: 'u2', nickname: 'Beto' }, { userId: 'u3', nickname: 'Caro' }],
      },
    ] as Awaited<ReturnType<typeof getAllReplays>>)

    render(await AdminReplaysPage())

    expect(mockGetAllReplays).toHaveBeenCalledWith(100)
    expect(screen.getByRole('heading', { name: /repeticiones/i })).toBeInTheDocument()
    expect(mockGetAdminReplaysSummary).toHaveBeenCalledWith()
    expect(screen.getByText(/Últimas 100 partidas visibles.*500 partidas con replay/i)).toBeInTheDocument()
    expect(screen.getByText('500')).toBeInTheDocument()
    expect(screen.getByText(/\$\s*125\.000/)).toBeInTheDocument()
    expect(screen.getByText('80')).toBeInTheDocument()
    expect(screen.getAllByText('Ana')).toHaveLength(4)
    expect(screen.getAllByRole('link', { name: /ver/i })[0]).toHaveAttribute('href', '/admin/replays/game-1')
    expect(screen.getByText('Historial de Partidas')).toBeInTheDocument()
  })

  it('muestra empty state sin replays', async () => {
    mockGetAllReplays.mockResolvedValue([])

    render(await AdminReplaysPage())

    expect(screen.getByText(/Últimas 100 partidas visibles.*500 partidas con replay/i)).toBeInTheDocument()
    expect(screen.getByText('No hay partidas registradas en el sistema.')).toBeInTheDocument()
  })

  it('usa fallback visual cuando no encuentra ganador ni jugadores', async () => {
    mockGetAllReplays.mockResolvedValue([
      {
        game_id: 'game-3',
        played_at: '2026-05-25T12:00:00.000Z',
        total_pot: 0,
        total_rake: 0,
        winner_id: 'missing',
        players: [],
      },
    ])

    render(await AdminReplaysPage())

    expect(screen.getAllByText('—')).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: /ver/i })[0]).toHaveAttribute('href', '/admin/replays/game-3')
  })

  it('no reemplaza el summary global cuando la muestra no tiene jugadores', async () => {
    mockGetAllReplays.mockResolvedValue([
      {
        game_id: 'game-without-players',
        played_at: '2026-05-25T12:00:00.000Z',
        total_pot: 0,
        total_rake: 0,
        winner_id: null,
        players: null,
      },
      {
        game_id: 'game-with-players',
        played_at: '2026-05-25T13:00:00.000Z',
        total_pot: 0,
        total_rake: 0,
        winner_id: 'u1',
        players: [{ userId: 'u1', nickname: 'Ana' }],
      },
    ] as Awaited<ReturnType<typeof getAllReplays>>)

    render(await AdminReplaysPage())

    expect(screen.getByText('80')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /ver/i })[0]).toHaveAttribute('href', '/admin/replays/game-without-players')
  })
})
