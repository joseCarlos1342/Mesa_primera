import { render, screen } from '@testing-library/react'
import AdminLedgerPage, { dynamic, revalidate } from '../page'
import { getLedgerEntries, getUsersWithBalances } from '@/app/actions/admin-ledger'

jest.mock('@/app/actions/admin-ledger', () => ({
  getLedgerEntries: jest.fn(),
  getUsersWithBalances: jest.fn(),
}))

jest.mock('@/components/admin/LedgerRealtimeRefresh', () => ({
  LedgerRealtimeRefresh: () => <div data-testid="ledger-realtime-refresh" />,
}))

jest.mock('@/components/admin/LedgerFilters', () => ({
  LedgerUsersFilter: ({ users }: { users: unknown[] }) => <div data-testid="ledger-users">Usuarios: {users.length}</div>,
  LedgerTransactionsFilter: ({ entries }: { entries: unknown[] }) => <div data-testid="ledger-transactions">Movimientos: {entries.length}</div>,
}))

const mockGetLedgerEntries = getLedgerEntries as jest.MockedFunction<typeof getLedgerEntries>
const mockGetUsersWithBalances = getUsersWithBalances as jest.MockedFunction<typeof getUsersWithBalances>

describe('AdminLedgerPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetLedgerEntries.mockResolvedValue([
      {
        id: 'entry-1',
        game_id: null,
        user_id: 'user-1',
        amount_cents: 5000,
        direction: 'credit',
        balance_after_cents: 5000,
        type: 'deposit',
        status: 'completed',
        reference_id: null,
        description: 'Deposito inicial',
        metadata: {},
        created_at: '2026-05-25T10:00:00.000Z',
        user: { display_name: 'Ana Mesa' },
      },
    ])
    mockGetUsersWithBalances.mockResolvedValue([
      {
        id: 'user-1',
        display_name: 'Ana Mesa',
        username: 'ana',
        balance: 5000,
        total_credits: 5000,
        total_debits: 0,
        last_activity: '2026-05-25T10:00:00.000Z',
      },
    ])
  })

  it('fuerza render dinamico sin cache', () => {
    expect(dynamic).toBe('force-dynamic')
    expect(revalidate).toBe(0)
  })

  it('carga usuarios y movimientos para los filtros de libro mayor', async () => {
    render(await AdminLedgerPage({}))

    expect(mockGetLedgerEntries).toHaveBeenCalledWith(50)
    expect(mockGetUsersWithBalances).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('heading', { name: /libro mayor/i })).toBeInTheDocument()
    expect(screen.getByText(/Registro de auditoría inmutable/)).toBeInTheDocument()
    expect(screen.getByTestId('ledger-realtime-refresh')).toBeInTheDocument()
    expect(screen.getByTestId('ledger-users')).toHaveTextContent('Usuarios: 1')
    expect(screen.getByTestId('ledger-transactions')).toHaveTextContent('Movimientos: 1')
  })

  it('muestra error si falla la carga del ledger', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockGetLedgerEntries.mockRejectedValueOnce(new Error('RPC caida'))

    render(await AdminLedgerPage({}))

    expect(screen.getByRole('heading', { name: /error al cargar el libro mayor/i })).toBeInTheDocument()
    expect(screen.getByText('RPC caida')).toBeInTheDocument()
    expect(screen.queryByTestId('ledger-users')).not.toBeInTheDocument()
    expect(consoleError).toHaveBeenCalledWith('[AdminLedgerPage] Error cargando datos:', expect.any(Error))
    consoleError.mockRestore()
  })

  it('usa mensaje generico cuando el error no tiene message', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockGetLedgerEntries.mockRejectedValueOnce('error sin message')

    render(await AdminLedgerPage({}))

    expect(screen.getByText('Error desconocido al cargar el libro mayor')).toBeInTheDocument()
    consoleError.mockRestore()
  })
})
