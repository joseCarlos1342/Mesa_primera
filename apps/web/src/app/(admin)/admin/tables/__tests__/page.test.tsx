import { render, screen } from '@testing-library/react'
import AdminTablesPage, { dynamic, revalidate } from '../page'
import { getActiveGames, getTableFinancials, getTablesList } from '@/app/actions/admin-tables'

jest.mock('@/app/actions/admin-tables', () => ({
  getActiveGames: jest.fn(),
  getTablesList: jest.fn(),
  getTableFinancials: jest.fn(),
}))

jest.mock('@/components/admin/CreateTableModal', () => ({ CreateTableModal: () => <button>CREAR MESA</button> }))
jest.mock('@/components/admin/CleanupStaleGamesButton', () => ({ CleanupStaleGamesButton: () => <button>Limpiar huerfanas</button> }))
jest.mock('@/components/admin/TableControls', () => ({ TableControls: ({ gameId, currentStatus }: { gameId: string; currentStatus: string }) => <button>Control {gameId} {currentStatus}</button> }))
jest.mock('@/components/admin/PlayerControls', () => ({ PlayerControls: ({ gameId, playerId }: { gameId: string; playerId: string }) => <button>Jugador {gameId} {playerId}</button> }))
jest.mock('@/components/admin/DeleteTableButton', () => ({ DeleteTableButton: ({ tableId, size }: { tableId: string; size?: string }) => <button>Eliminar {tableId} {size ?? 'md'}</button> }))

jest.mock('@/components/admin/ResponsiveDataView', () => ({
  ResponsiveDataView: ({ columns, data, emptyMessage, renderCard }: {
    columns: Array<{ header: string; render: (row: Record<string, unknown>) => React.ReactNode }>
    data: Array<Record<string, unknown>>
    emptyMessage: string
    renderCard: (row: Record<string, unknown>) => React.ReactNode
  }) => (
    <div data-testid="responsive-data-view">
      {data.length === 0 ? <p>{emptyMessage}</p> : data.map((row) => (
        <article key={String(row.table_id ?? row.id)}>
          {columns.map((column) => <section key={column.header}>{column.render(row)}</section>)}
          <div data-testid={`card-${String(row.table_id ?? row.id)}`}>{renderCard(row)}</div>
        </article>
      ))}
    </div>
  ),
}))

const mockGetActiveGames = getActiveGames as jest.MockedFunction<typeof getActiveGames>
const mockGetTablesList = getTablesList as jest.MockedFunction<typeof getTablesList>
const mockGetTableFinancials = getTableFinancials as jest.MockedFunction<typeof getTableFinancials>

describe('AdminTablesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetActiveGames.mockResolvedValue([
      {
        id: 'room-playing-1',
        name: 'Mesa en vivo',
        status: 'playing',
        main_pot_cents: 200000,
        pique_pot_cents: 50000,
        min_bet_cents: 100000,
        max_players: 7,
        players: [{ id: 'player-1', display_name: 'Ana', seat_number: 1, status: 'active', bet_current_cents: 20000 }],
      },
      {
        id: 'room-paused-1',
        name: 'Mesa pausada',
        status: 'paused',
        main_pot_cents: 0,
        pique_pot_cents: 0,
        min_bet_cents: 50000,
        max_players: 5,
        players: [],
      },
    ])
    mockGetTablesList.mockResolvedValue([
      { id: 'table-1', name: 'Mesa comun', game_type: 'primera', max_players: 7, min_entry_cents: 500000, min_bet: 500000 },
    ])
    mockGetTableFinancials.mockResolvedValue([
      {
        table_id: 'table-1',
        table_name: 'Mesa comun',
        game_type: 'primera',
        total_games: 3,
        unique_players: 8,
        total_bets_cents: 500000,
        total_winnings_cents: 450000,
        total_rake_cents: 50000,
        last_activity: '2026-05-25T10:00:00.000Z',
      },
    ])
  })

  it('fuerza render dinamico sin cache', () => {
    expect(dynamic).toBe('force-dynamic')
    expect(revalidate).toBe(0)
  })

  it('renderiza salas en vivo, auditoria financiera y configuraciones', async () => {
    render(await AdminTablesPage())

    expect(mockGetActiveGames).toHaveBeenCalledTimes(1)
    expect(mockGetTablesList).toHaveBeenCalledTimes(1)
    expect(mockGetTableFinancials).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('heading', { name: /control de mesas/i })).toBeInTheDocument()
    expect(screen.getByText('2 ACTIVAS')).toBeInTheDocument()
    expect(screen.getByText('PLAYING')).toBeInTheDocument()
    expect(screen.getByText('PAUSED')).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Mesa libre... esperando jugadores')).toBeInTheDocument()
    expect(screen.getByText('1 MESAS')).toBeInTheDocument()
    expect(screen.getAllByText('Mesa comun')).toHaveLength(4)
    expect(screen.getByRole('button', { name: /Eliminar table-1 sm/ })).toBeInTheDocument()
  })

  it('muestra estados vacios si fallan las cargas', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockGetActiveGames.mockRejectedValueOnce(new Error('rooms down'))
    mockGetTableFinancials.mockRejectedValueOnce(new Error('finance down'))

    render(await AdminTablesPage())

    expect(screen.getByText('SIN ACCIÓN EN VIVO')).toBeInTheDocument()
    expect(screen.getByText('No hay registros financieros aún.')).toBeInTheDocument()
    expect(screen.getByText('No hay mesas configuradas.')).toBeInTheDocument()
    expect(consoleError).toHaveBeenCalledWith('[AdminTablesPage] Error cargando juegos/mesas:', expect.any(Error))
    expect(consoleError).toHaveBeenCalledWith('[AdminTablesPage] Error cargando financieros:', 'finance down')
    consoleError.mockRestore()
  })
})
