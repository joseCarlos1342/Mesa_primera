import { render, screen } from '@testing-library/react'
import GananciasPage from '../page'
import { getAdminRakeData, type RakeEntry } from '@/app/actions/admin-rake'

jest.mock('@/app/actions/admin-rake', () => ({
  getAdminRakeData: jest.fn(),
}))

jest.mock('@/components/admin/ResponsiveDataView', () => ({
  ResponsiveDataView: ({ columns, data, emptyMessage, header, footer, renderCard }: {
    columns: Array<{ key: string; header: string; render?: (entry: RakeEntry) => React.ReactNode }>
    data: RakeEntry[]
    emptyMessage: string
    header: React.ReactNode
    footer?: React.ReactNode
    renderCard: (entry: RakeEntry) => React.ReactNode
  }) => (
    <div data-testid="rake-data-view">
      {header}
      {data.length === 0 ? <p>{emptyMessage}</p> : null}
      {data.map((entry) => (
        <article key={entry.id}>
          {columns.map((column) => (
            <section key={column.key} aria-label={column.header}>{column.render?.(entry)}</section>
          ))}
          <div data-testid={`rake-card-${entry.id}`}>{renderCard(entry)}</div>
        </article>
      ))}
      {footer}
    </div>
  ),
}))

const mockGetAdminRakeData = getAdminRakeData as jest.MockedFunction<typeof getAdminRakeData>

describe('GananciasPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renderiza estadisticas, comisiones y paginacion', async () => {
    mockGetAdminRakeData.mockResolvedValue({
      entries: [
        { id: 'rake-1', user_id: 'u1', game_id: 'game-1', table_id: 'table-1', amount_cents: 50000, metadata: {}, created_at: '2026-05-25T10:00:00.000Z', winner_username: 'Ana', win_amount: 950000 },
        { id: 'rake-2', user_id: 'u2', game_id: null, table_id: null, amount_cents: 25000, metadata: {}, created_at: '2026-05-25T11:00:00.000Z', winner_username: 'Beto', win_amount: 0 },
      ],
      totalCount: 75,
      stats: { totalRake: 75000, totalRake24h: 50000, totalRake7d: 75000, rakeCount: 75 },
    })

    render(await GananciasPage({ searchParams: Promise.resolve({ page: '2' }) }))

    expect(mockGetAdminRakeData).toHaveBeenCalledWith(2, 50)
    expect(screen.getByRole('heading', { name: /ganancias 5%/i })).toBeInTheDocument()
    expect(screen.getByText('Total Acumulado')).toBeInTheDocument()
    expect(screen.getByText('Historial de Comisiones')).toBeInTheDocument()
    expect(screen.getAllByText('Ana')).toHaveLength(2)
    expect(screen.getByText('game-1')).toBeInTheDocument()
    expect(screen.getByText('ID: game-1')).toBeInTheDocument()
    expect(screen.getAllByText((_, node) => node?.textContent === '$ 500').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Página 2 de 2 (75 registros)')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /anterior/i })).toHaveAttribute('href', '/admin/ganancias?page=1')
    expect(screen.queryByRole('link', { name: /siguiente/i })).not.toBeInTheDocument()
  })

  it('normaliza pagina invalida y muestra empty state sin paginacion', async () => {
    mockGetAdminRakeData.mockResolvedValue({
      entries: [],
      totalCount: 0,
      stats: { totalRake: 0, totalRake24h: 0, totalRake7d: 0, rakeCount: 0 },
    })

    render(await GananciasPage({ searchParams: Promise.resolve({ page: 'nope' }) }))

    expect(mockGetAdminRakeData).toHaveBeenCalledWith(1, 50)
    expect(screen.getByText('No hay ganancias registradas aún.')).toBeInTheDocument()
    expect(screen.queryByText(/Página/)).not.toBeInTheDocument()
  })
})
