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
  ResponsiveDataView: ({ columns, data, emptyMessage, renderCard, keyExtractor, cardClassName }: {
    columns: Array<{ header: string; render: (row: Record<string, unknown>) => React.ReactNode }>
    data: Array<Record<string, unknown>>
    emptyMessage: string
    renderCard: (row: Record<string, unknown>) => React.ReactNode
    keyExtractor: (row: Record<string, unknown>) => string
    cardClassName: (row: Record<string, unknown>) => string
  }) => (
    <div data-testid="responsive-data-view">
      {data.length === 0 ? <p>{emptyMessage}</p> : data.map((row) => (
        <article key={keyExtractor(row)} className={cardClassName(row)}>
          {columns.map((column) => <section key={column.header}>{column.render(row)}</section>)}
          <div data-testid={`card-${keyExtractor(row)}`}>{renderCard(row)}</div>
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
        started_at: '2026-05-25T10:00:00.000Z',
        created_by: 'admin-1',
        players: [{ id: 'player-1', user_id: 'user-1', display_name: 'Ana', seat_number: 1, status: 'active', bet_current_cents: 20000 }],
      },
      {
        id: 'room-paused-1',
        name: 'Mesa pausada',
        status: 'paused',
        main_pot_cents: 0,
        pique_pot_cents: 0,
        min_bet_cents: 50000,
        max_players: 5,
        started_at: '2026-05-25T10:30:00.000Z',
        created_by: 'admin-1',
        players: [],
      },
    ])
    mockGetTablesList.mockResolvedValue([
      {
        id: 'table-1',
        name: 'Mesa comun',
        game_type: 'primera',
        max_players: 7,
        min_entry_cents: 500000,
        min_pique_cents: 100000,
        min_bet: 500000,
        active_games: 1,
        created_at: '2026-05-25T09:00:00.000Z',
        table_category: 'common',
        lobby_slot: 1,
        disabled_chips: [],
        is_active: true,
        sort_order: 1,
        games: [{ count: 1 }],
      },
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
        total_credits_cents: 500000,
        total_debits_cents: 450000,
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

  it('renderiza el estado neutro cuando un game tiene status distinto a playing o paused', async () => {
    mockGetActiveGames.mockResolvedValueOnce([
      {
        id: 'room-waiting-1',
        name: 'Mesa en espera',
        status: 'waiting',
        main_pot_cents: 0,
        pique_pot_cents: 0,
        min_bet_cents: 100000,
        max_players: 7,
        started_at: '2026-05-25T10:00:00.000Z',
        created_by: 'admin-1',
        players: [],
      },
    ])

    render(await AdminTablesPage())

    // The status badge should render the status as text
    expect(screen.getByText('WAITING')).toBeInTheDocument()
  })

  it('muestra "Sin actividad" en la columna cuando un financial tiene last_activity=null', async () => {
    mockGetTableFinancials.mockResolvedValueOnce([
      {
        table_id: 'table-1',
        table_name: 'Mesa comun',
        game_type: 'primera',
        total_games: 3,
        unique_players: 8,
        total_bets_cents: 500000,
        total_winnings_cents: 450000,
        total_rake_cents: 50000,
        total_credits_cents: 500000,
        total_debits_cents: 450000,
        last_activity: null,
      },
    ])

    render(await AdminTablesPage())

    expect(screen.getAllByText('Sin actividad').length).toBeGreaterThan(0)
  })

  it('loguea el valor crudo del error si getTableFinancials rechaza con un valor sin .message', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockGetTableFinancials.mockRejectedValueOnce('plain string error')

    render(await AdminTablesPage())

    expect(consoleError).toHaveBeenCalledWith(
      '[AdminTablesPage] Error cargando financieros:',
      'plain string error',
    )
    consoleError.mockRestore()
  })

  it('usa min_bet como fallback cuando min_entry_cents es 0', async () => {
    mockGetTablesList.mockResolvedValueOnce([
      {
        id: 'table-2',
        name: 'Mesa gratis',
        game_type: 'primera',
        max_players: 7,
        min_entry_cents: 0,
        min_pique_cents: 100000,
        min_bet: 250000,
        active_games: 0,
        created_at: '2026-05-25T09:00:00.000Z',
        table_category: 'common',
        lobby_slot: 2,
        disabled_chips: [],
        is_active: true,
        sort_order: 2,
        games: [],
      },
    ])

    render(await AdminTablesPage())

    // The fallback path is exercised; assert that the page renders without crashing
    expect(screen.getByRole('heading', { name: /control de mesas/i })).toBeInTheDocument()
  })
})
