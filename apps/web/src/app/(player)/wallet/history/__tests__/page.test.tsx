import { render, screen } from '@testing-library/react'
import WalletHistoryPage from '../page'
import { getWalletHistory } from '@/app/actions/wallet'

jest.mock('@/app/actions/wallet', () => ({
  getWalletHistory: jest.fn(),
}))

jest.mock('../HistoryList', () => ({
  HistoryList: ({ transactions }: { transactions: unknown[] }) => (
    <div data-testid="history-list">Movimientos: {transactions.length}</div>
  ),
}))

const mockGetWalletHistory = getWalletHistory as jest.MockedFunction<typeof getWalletHistory>

describe('WalletHistoryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renderiza el historial y el enlace de retorno', async () => {
    mockGetWalletHistory.mockResolvedValue({
      transactions: [{ id: 'tx-1' }, { id: 'tx-2' }],
    } as Awaited<ReturnType<typeof getWalletHistory>>)

    render(await WalletHistoryPage())

    expect(screen.getByRole('heading', { name: 'Historial Completo' })).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/wallet')
    expect(screen.getByTestId('history-list')).toHaveTextContent('Movimientos: 2')
  })

  it('usa una lista vacía cuando la acción no devuelve transacciones', async () => {
    mockGetWalletHistory.mockResolvedValue({
      transactions: undefined,
    } as Awaited<ReturnType<typeof getWalletHistory>>)

    render(await WalletHistoryPage())

    expect(screen.getByTestId('history-list')).toHaveTextContent('Movimientos: 0')
  })

  it('muestra un error de conexión sin renderizar el historial', async () => {
    mockGetWalletHistory.mockResolvedValue({ error: 'No se pudo cargar el historial' } as Awaited<ReturnType<typeof getWalletHistory>>)

    render(await WalletHistoryPage())

    expect(screen.getByText('Error de Conexión')).toBeInTheDocument()
    expect(screen.getByText('No se pudo cargar el historial')).toBeInTheDocument()
    expect(screen.queryByTestId('history-list')).not.toBeInTheDocument()
  })
})
