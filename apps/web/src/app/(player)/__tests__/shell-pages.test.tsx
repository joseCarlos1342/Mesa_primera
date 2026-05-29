import { fireEvent, render, screen } from '@testing-library/react'
import DashboardPage from '../dashboard/page'
import LobbyPage, { dynamic, revalidate } from '../lobby/page'
import WalletPage from '../wallet/page'
import DepositPage from '../wallet/deposit/page'
import LeaderboardPage from '../leaderboard/page'
import { getWalletData } from '@/app/actions/wallet'
import { getLobbyTables } from '@/app/actions/admin-tables'
import { getLeaderboard } from '@/app/actions/social-actions'

const routerPush = jest.fn()
const searchParamsGet = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush }),
  useSearchParams: () => ({ get: searchParamsGet }),
}))

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}))

jest.mock('@/app/actions/wallet', () => ({
  getWalletData: jest.fn(),
}))

jest.mock('@/app/actions/admin-tables', () => ({
  getLobbyTables: jest.fn(),
}))

jest.mock('@/app/actions/social-actions', () => ({
  getLeaderboard: jest.fn(),
}))

jest.mock('@/components/dashboard/PlayerDashboard', () => ({
  PlayerDashboard: ({ initialData }: { initialData: unknown }) => (
    <div data-testid="player-dashboard">Dashboard: {initialData ? 'con datos' : 'sin datos'}</div>
  ),
}))

jest.mock('@/components/game/Lobby', () => ({
  Lobby: ({ lobbyTables }: { lobbyTables: { common: unknown[]; custom: unknown[] } }) => (
    <div data-testid="lobby">Comunes: {lobbyTables.common.length} Custom: {lobbyTables.custom.length}</div>
  ),
}))

jest.mock('@/components/wallet/WalletContent', () => ({
  WalletContent: ({ wallet, transactions }: { wallet: { balance_cents: number }; transactions: unknown[] }) => (
    <div data-testid="wallet-content">Saldo: {wallet.balance_cents} Movimientos: {transactions.length}</div>
  ),
}))

jest.mock('@/components/game/DepositForm', () => ({
  DepositForm: ({ initialAmount, onSuccess }: { initialAmount: string; onSuccess: () => void }) => (
    <button type="button" onClick={onSuccess}>Depositar {initialAmount || 'sin monto'}</button>
  ),
}))

jest.mock('../leaderboard/_components/leaderboard-table', () => ({
  LeaderboardTable: ({ data, category }: { data: unknown[]; category: string }) => (
    <div data-testid="leaderboard-table">{category}: {data.length}</div>
  ),
}))

const mockGetWalletData = getWalletData as jest.MockedFunction<typeof getWalletData>
const mockGetLobbyTables = getLobbyTables as jest.MockedFunction<typeof getLobbyTables>
const mockGetLeaderboard = getLeaderboard as jest.MockedFunction<typeof getLeaderboard>

describe('player shell pages', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    searchParamsGet.mockReturnValue(null)
  })

  it('dashboard pasa datos de wallet al panel del jugador', async () => {
    mockGetWalletData.mockResolvedValue({ wallet: { balance_cents: 125000 }, transactions: [] } as never)

    render(await DashboardPage())

    expect(mockGetWalletData).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('player-dashboard')).toHaveTextContent('con datos')
  })

  it('dashboard usa null si wallet responde error', async () => {
    mockGetWalletData.mockResolvedValue({ error: 'No autenticado' } as never)

    render(await DashboardPage())

    expect(screen.getByTestId('player-dashboard')).toHaveTextContent('sin datos')
  })

  it('lobby es dinamico y entrega mesas comunes/custom al componente realtime', async () => {
    mockGetLobbyTables.mockResolvedValue({
      common: [{ id: 'table-common' }],
      custom: [{ id: 'table-custom' }, { id: 'table-vip' }],
    } as never)

    render(await LobbyPage())

    expect(dynamic).toBe('force-dynamic')
    expect(revalidate).toBe(0)
    expect(screen.getByTestId('lobby')).toHaveTextContent('Comunes: 1 Custom: 2')
  })

  it('lobby cae a listas vacias si falla la carga de mesas', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockGetLobbyTables.mockRejectedValue(new Error('redis offline'))

    render(await LobbyPage())

    expect(screen.getByTestId('lobby')).toHaveTextContent('Comunes: 0 Custom: 0')
    expect(consoleError).toHaveBeenCalledWith('[LobbyPage] Error fetching lobby tables:', expect.any(Error))
    consoleError.mockRestore()
  })

  it('wallet renderiza contenido cuando hay datos', async () => {
    mockGetWalletData.mockResolvedValue({ wallet: { balance_cents: 99000 }, transactions: [{ id: 'tx-1' }] } as never)

    render(await WalletPage())

    expect(screen.getByTestId('wallet-content')).toHaveTextContent('Saldo: 99000 Movimientos: 1')
  })

  it('wallet muestra error de conexion si falla la carga', async () => {
    mockGetWalletData.mockResolvedValue({ error: 'Sesion expirada' } as never)

    render(await WalletPage())

    expect(screen.getByText('Error de Conexión')).toBeInTheDocument()
    expect(screen.getByText('Sesion expirada')).toBeInTheDocument()
  })

  it('leaderboard usa categoria por defecto y tabs con enlaces', async () => {
    mockGetLeaderboard.mockResolvedValue([{ user_id: 'user-1' }] as never)

    render(await LeaderboardPage({ searchParams: {} }))

    expect(mockGetLeaderboard).toHaveBeenCalledWith('all-time', 'top_ganadores')
    expect(screen.getByRole('heading', { name: 'Salón de la Fama' })).toBeInTheDocument()
    expect(screen.getByTestId('leaderboard-table')).toHaveTextContent('top_ganadores: 1')
    expect(screen.getByRole('link', { name: /mejor racha/i })).toHaveAttribute('href', '/leaderboard?category=mejor_racha')
  })

  it('leaderboard respeta categoria seleccionada', async () => {
    mockGetLeaderboard.mockResolvedValue([] as never)

    render(await LeaderboardPage({ searchParams: { category: 'maestro_primera' } }))

    expect(mockGetLeaderboard).toHaveBeenCalledWith('all-time', 'maestro_primera')
    expect(screen.getByTestId('leaderboard-table')).toHaveTextContent('maestro_primera: 0')
  })

  it('deposit precarga el monto de querystring y vuelve a wallet al completar', async () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})
    searchParamsGet.mockReturnValue('5000')

    render(<DepositPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Depositar 5000' }))

    expect(searchParamsGet).toHaveBeenCalledWith('amount')
    expect(alertSpy).toHaveBeenCalledWith('Solicitud enviada correctamente. Se acreditará pronto.')
    expect(routerPush).toHaveBeenCalledWith('/wallet')
    alertSpy.mockRestore()
  })

})
