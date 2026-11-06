import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WalletHistoryPage from '../history/page'
import { HistoryList } from '../history/HistoryList'
import WithdrawPage from '../withdraw/page'
import { getWalletHistory } from '@/app/actions/wallet'
import { requestWithdrawal } from '@/app/actions/withdrawals'

const routerPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush }),
}))

jest.mock('@/app/actions/wallet', () => ({
  getWalletHistory: jest.fn(),
}))

jest.mock('@/app/actions/withdrawals', () => ({
  requestWithdrawal: jest.fn(),
}))

jest.mock('@/components/wallet/TransactionModal', () => ({
  TransactionModal: ({ transaction, isOpen, onClose }: {
    transaction: { id: string; type: string } | null
    isOpen: boolean
    onClose: () => void
  }) => (
    isOpen ? (
      <div role="dialog">
        Detalle {transaction?.id} {transaction?.type}
        <button type="button" onClick={onClose}>Cerrar detalle</button>
      </div>
    ) : null
  ),
}))

const mockGetWalletHistory = getWalletHistory as jest.MockedFunction<typeof getWalletHistory>
const mockRequestWithdrawal = requestWithdrawal as jest.MockedFunction<typeof requestWithdrawal>

const transactions = [
  {
    id: 'tx-deposit',
    type: 'deposit',
    direction: 'credit',
    amount_cents: 125000,
    status: 'completed',
    created_at: '2026-05-28T10:00:00.000Z',
  },
  {
    id: 'tx-withdrawal',
    type: 'withdrawal',
    direction: 'debit',
    amount_cents: 50000,
    status: 'pending',
    created_at: '2026-05-28T11:00:00.000Z',
  },
  {
    id: 'tx-refund',
    type: 'refund',
    direction: 'credit',
    amount_cents: 30000,
    status: 'failed',
    created_at: '2026-05-28T12:00:00.000Z',
  },
  {
    id: 'tx-bonus',
    type: 'bonus',
    direction: 'credit',
    amount_cents: 10000,
    status: 'completed',
    created_at: '2026-05-28T13:00:00.000Z',
  },
  {
    id: 'tx-adjustment',
    type: 'admin_adjustment',
    direction: 'debit',
    amount_cents: 5000,
    status: 'completed',
    created_at: '2026-05-28T14:00:00.000Z',
  },
]

describe('páginas secundarias de billetera', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('history page muestra alerta de error si falla la carga', async () => {
    mockGetWalletHistory.mockResolvedValue({ error: 'No se pudo leer la billetera' } as never)

    render(await WalletHistoryPage())

    expect(screen.getByText(/no pudimos cargar tu historial/i)).toBeInTheDocument()
    expect(screen.getByText('No se pudo leer la billetera')).toBeInTheDocument()
  })

  it('history page enlaza de vuelta a billetera y entrega movimientos', async () => {
    mockGetWalletHistory.mockResolvedValue({ transactions: transactions.slice(0, 2) } as never)

    render(await WalletHistoryPage())

    expect(mockGetWalletHistory).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('heading', { name: 'Historial' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /billetera/i })).toHaveAttribute('href', '/wallet')
    expect(screen.getByText('Carga de saldo')).toBeInTheDocument()
    expect(screen.getByText('Retiro')).toBeInTheDocument()
  })

  it('history list cubre empty, tipos, estados, filtros y apertura de detalle', () => {
    const { unmount } = render(<HistoryList transactions={[]} />)
    expect(screen.getByText(/aún no tienes movimientos/i)).toBeInTheDocument()
    unmount()

    render(<HistoryList transactions={transactions} />)
    // Filtros disponibles
    expect(screen.getByRole('button', { name: 'Todos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cargas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retiros' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Transferencias' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Otros' })).toBeInTheDocument()

    // Tipos y estados
    expect(screen.getByText('Carga de saldo')).toBeInTheDocument()
    expect(screen.getByText('Retiro')).toBeInTheDocument()
    expect(screen.getByText('Reembolso')).toBeInTheDocument()
    expect(screen.getByText('Bono')).toBeInTheDocument()
    expect(screen.getByText('Ajuste de saldo')).toBeInTheDocument()
    // Solo los no completados muestran etiqueta de estado.
    expect(screen.getByText('En revisión')).toBeInTheDocument()
    expect(screen.getByText('Rechazado')).toBeInTheDocument()

    // Filtro por cargas deja solo el depósito.
    fireEvent.click(screen.getByRole('button', { name: 'Cargas' }))
    expect(screen.getByText('Carga de saldo')).toBeInTheDocument()
    expect(screen.queryByText('Retiro')).not.toBeInTheDocument()

    // Filtro "Otros" muestra bono y ajuste, no cargas/retiros/transferencias.
    fireEvent.click(screen.getByRole('button', { name: 'Otros' }))
    expect(screen.getByText('Bono')).toBeInTheDocument()
    expect(screen.getByText('Ajuste de saldo')).toBeInTheDocument()
    expect(screen.queryByText('Carga de saldo')).not.toBeInTheDocument()

    // Filtro sin coincidencias muestra mensaje.
    fireEvent.click(screen.getByRole('button', { name: 'Transferencias' }))
    expect(screen.getByText(/no hay movimientos de este tipo/i)).toBeInTheDocument()

    // Abrir detalle desde "Todos".
    fireEvent.click(screen.getByRole('button', { name: 'Todos' }))
    fireEvent.click(screen.getByText('Carga de saldo'))
    expect(screen.getByText('Detalle tx-deposit deposit')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Cerrar detalle'))
    expect(screen.queryByText('Detalle tx-deposit deposit')).not.toBeInTheDocument()
  })

  it('history list agrupa movimientos con fecha inválida bajo "Sin fecha" y trata tipos desconocidos', () => {
    render(
      <HistoryList
        transactions={[
          { ...transactions[0], id: 'tx-unknown', type: 'manual_review', status: 'cancelled', created_at: 'no-fecha' },
        ]}
      />,
    )
    expect(screen.getByText('manual_review')).toBeInTheDocument()
    expect(screen.getByText('Rechazado')).toBeInTheDocument()
  })

  it('withdraw no envía si faltan campos', async () => {
    const user = userEvent.setup()
    render(<WithdrawPage />)

    const amount = screen.getByPlaceholderText('0')
    fireEvent.keyDown(amount, { key: 'e' })
    fireEvent.keyDown(amount, { key: '-' })
    await user.click(screen.getByRole('button', { name: /confirmar retiro/i }))

    expect(mockRequestWithdrawal).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: /billetera/i })).toHaveAttribute('href', '/wallet')
  })

  it('withdraw solicita retiro y vuelve a la billetera en éxito', async () => {
    const user = userEvent.setup()
    mockRequestWithdrawal.mockResolvedValue({ error: null } as never)

    render(<WithdrawPage />)

    await user.type(screen.getByPlaceholderText('0'), '25000')
    await user.type(screen.getByPlaceholderText(/ana pérez/i), 'Nequi 3001234567')
    await user.click(screen.getByRole('button', { name: /confirmar retiro/i }))

    await waitFor(() => expect(mockRequestWithdrawal).toHaveBeenCalledWith(25000, 'Nequi 3001234567'))
    expect(routerPush).toHaveBeenCalledWith('/wallet')
  })

  it('withdraw muestra el error en una alerta si la acción rechaza la solicitud', async () => {
    const user = userEvent.setup()
    mockRequestWithdrawal.mockResolvedValue({ error: 'Saldo insuficiente' } as never)

    render(<WithdrawPage />)

    await user.type(screen.getByPlaceholderText('0'), '990000')
    await user.type(screen.getByPlaceholderText(/ana pérez/i), 'Cuenta 000')
    await user.click(screen.getByRole('button', { name: /confirmar retiro/i }))

    expect(await screen.findByText(/saldo insuficiente/i)).toBeInTheDocument()
    expect(routerPush).not.toHaveBeenCalled()
  })
})
