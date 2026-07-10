import { render, screen } from '@testing-library/react'
import WalletPage from '../page'
import { getWalletData } from '@/app/actions/wallet'

jest.mock('@/app/actions/wallet', () => ({
  getWalletData: jest.fn(),
}))

jest.mock('@/components/wallet/WalletContent', () => ({
  WalletContent: ({ wallet, transactions }: { wallet: unknown; transactions: unknown[] }) => (
    <div data-testid="wallet-content">
      Wallet: {wallet ? 'loaded' : 'empty'} Transactions: {transactions.length}
    </div>
  ),
}))

const mockGetWalletData = getWalletData as jest.MockedFunction<typeof getWalletData>

describe('WalletPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renderiza WalletContent con wallet y transacciones', async () => {
    mockGetWalletData.mockResolvedValue({
      wallet: { balance_cents: 50000 },
      transactions: [{ id: 'tx-1' }, { id: 'tx-2' }],
    })

    render(await WalletPage())

    expect(screen.getByTestId('wallet-content')).toHaveTextContent('Wallet: loaded Transactions: 2')
  })

  it('renderiza WalletContent con transacciones vacias cuando transactions es undefined', async () => {
    mockGetWalletData.mockResolvedValue({
      wallet: { balance_cents: 50000 },
      transactions: undefined as any,
    })

    render(await WalletPage())

    expect(screen.getByTestId('wallet-content')).toHaveTextContent('Wallet: loaded Transactions: 0')
  })

  it('muestra error cuando getWalletData falla', async () => {
    mockGetWalletData.mockResolvedValue({
      error: 'No se pudo cargar la wallet',
    })

    render(await WalletPage())

    expect(screen.getByText('Error de Conexión')).toBeInTheDocument()
    expect(screen.getByText('No se pudo cargar la wallet')).toBeInTheDocument()
    expect(screen.queryByTestId('wallet-content')).not.toBeInTheDocument()
  })
})
