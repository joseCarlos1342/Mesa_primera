import { render, screen } from '@testing-library/react'
import AdminReplayDetailPage from '../page'
import { getAdminReplayDetail } from '@/app/actions/replays'
import type { ReplayDetail, ReplayLedgerEntry } from '@/app/actions/replays'

jest.mock('@/app/actions/replays', () => ({
  getAdminReplayDetail: jest.fn(),
}))

jest.mock('@/components/replay/ReplayController', () => ({
  ReplayController: ({ frames }: { frames: unknown[] }) => <div data-testid="replay-controller">frames={frames.length}</div>,
}))

jest.mock('@/components/admin/ResponsiveDataView', () => ({
  ResponsiveDataView: ({ columns, data, emptyMessage, header, renderCard }: {
    columns: Array<{ key: string; header: string; render?: (entry: ReplayLedgerEntry) => React.ReactNode }>
    data: ReplayLedgerEntry[]
    emptyMessage: string
    header: React.ReactNode
    renderCard: (entry: ReplayLedgerEntry) => React.ReactNode
  }) => (
    <div data-testid="replay-ledger-view">
      {header}
      {data.length === 0 ? <p>{emptyMessage}</p> : null}
      {data.map((entry) => (
        <article key={entry.id}>
          {columns.map((column) => (
            <section key={column.key} aria-label={column.header}>{column.render?.(entry)}</section>
          ))}
          <div data-testid={`ledger-card-${entry.id}`}>{renderCard(entry)}</div>
        </article>
      ))}
    </div>
  ),
}))

const mockGetAdminReplayDetail = getAdminReplayDetail as jest.MockedFunction<typeof getAdminReplayDetail>

const replay: ReplayDetail = {
  id: 'row-1',
  game_id: 'game-1234567890abcdef',
  created_at: '2026-05-25T10:00:00.000Z',
  players: [{ userId: 'u1', nickname: 'Ana' }, { userId: 'u2', nickname: 'Beto' }],
  timeline: [{ type: 'start' }],
  admin_timeline: [{ type: 'admin-start' }, { type: 'admin-end' }],
  pot_breakdown: { totalPot: 1500000, mainPot: 1000000, piquePot: 500000, rake: 50000, potRake: 30000, piqueRake: 20000 },
  final_hands: {
    u1: { nickname: 'Ana', handType: 'Primera', cards: '1O,7C' },
    u2: { nickname: 'Beto', handType: 'Pares', cards: '2O,' },
  },
  rng_seed: 'abcdef1234567890abcdef1234567890',
  version: 2,
  frames: [{ frame: 1 }, { frame: 2 }],
}

const ledger: ReplayLedgerEntry[] = [
  { id: 'entry-1', user_id: 'u1', type: 'win', direction: 'credit', amount_cents: 200000, balance_after_cents: 6000000, description: null, metadata: {}, created_at: '2026-05-25T10:01:00.000Z' },
  { id: 'entry-2', user_id: 'u2', type: 'bet', direction: 'debit', amount_cents: 100000, balance_after_cents: 4900000, description: null, metadata: {}, created_at: '2026-05-25T10:02:00.000Z' },
  { id: 'entry-3', user_id: 'vault', type: 'rake', direction: 'credit', amount_cents: 50000, balance_after_cents: 50000, description: null, metadata: {}, created_at: '2026-05-25T10:03:00.000Z' },
]

describe('AdminReplayDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renderiza replay v2 con resumen, manos finales, controlador y ledger', async () => {
    mockGetAdminReplayDetail.mockResolvedValue({ replay, ledger })

    render(await AdminReplayDetailPage({ params: Promise.resolve({ gameId: replay.game_id }) }))

    expect(mockGetAdminReplayDetail).toHaveBeenCalledWith(replay.game_id)
    expect(screen.getByRole('heading', { name: /auditoría de partida/i })).toBeInTheDocument()
    expect(screen.getByText('MODO ADMIN')).toBeInTheDocument()
    expect(screen.getByText((text) => text.includes('ID:') && text.includes('game-1234567'))).toBeInTheDocument()
    expect(screen.getByText('Jugadores')).toBeInTheDocument()
    expect(screen.getAllByText('Ana').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Primera')).toBeInTheDocument()
    expect(screen.getByText('1O')).toBeInTheDocument()
    expect(screen.getByTestId('replay-controller')).toHaveTextContent('frames=2')
    expect(screen.getByText('Registros del Ledger (3)')).toBeInTheDocument()
    expect(screen.getAllByText('win')).toHaveLength(2)
    expect(screen.getAllByText('bet')).toHaveLength(2)
    expect(screen.getAllByText('rake')).toHaveLength(2)
    expect(screen.getAllByText('vault')).toHaveLength(2)
  })

  it('muestra legacy y empty state de ledger cuando no hay frames ni movimientos', async () => {
    mockGetAdminReplayDetail.mockResolvedValue({
      replay: { ...replay, version: 1, frames: [], admin_timeline: null, final_hands: {}, pot_breakdown: {}, players: [], timeline: [] },
      ledger: [],
    })

    render(await AdminReplayDetailPage({ params: Promise.resolve({ gameId: replay.game_id }) }))

    expect(screen.getByText(/versión 1 \(legacy\)/i)).toBeInTheDocument()
    expect(screen.getByText('Sin registros financieros para esta partida.')).toBeInTheDocument()
    expect(screen.queryByTestId('replay-controller')).not.toBeInTheDocument()
  })

  it('muestra estado no encontrado si no existe replay', async () => {
    mockGetAdminReplayDetail.mockResolvedValue({ replay: null, ledger: [] })

    render(await AdminReplayDetailPage({ params: Promise.resolve({ gameId: 'missing' }) }))

    expect(screen.getByText('Repetición no encontrada')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a Repeticiones' })).toHaveAttribute('href', '/admin/replays')
  })
})
