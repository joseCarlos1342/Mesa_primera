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

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial: _initial, animate: _animate, transition: _transition, ...props }: React.HTMLAttributes<HTMLDivElement> & {
      initial?: unknown
      animate?: unknown
      transition?: unknown
    }) => <div {...props}>{children}</div>,
    form: ({ children, initial: _initial, animate: _animate, transition: _transition, ...props }: React.FormHTMLAttributes<HTMLFormElement> & {
      initial?: unknown
      animate?: unknown
      transition?: unknown
    }) => <form {...props}>{children}</form>,
  },
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
      <dialog open>
        Detalle {transaction?.id} {transaction?.type}
        <button type="button" onClick={onClose}>Cerrar detalle</button>
      </dialog>
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

describe('wallet secondary player pages', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('history page muestra error visible si falla la carga', async () => {
    mockGetWalletHistory.mockResolvedValue({ error: 'No se pudo leer la billetera' } as never)

    render(await WalletHistoryPage())

    expect(screen.getByText('Error de Conexión')).toBeInTheDocument()
    expect(screen.getByText('No se pudo leer la billetera')).toBeInTheDocument()
  })

  it('history page enlaza de vuelta a wallet y entrega movimientos', async () => {
    mockGetWalletHistory.mockResolvedValue({ transactions: transactions.slice(0, 2) } as never)

    render(await WalletHistoryPage())

    expect(mockGetWalletHistory).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('heading', { name: 'Historial Completo' })).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/wallet')
    expect(screen.getByText('Depósito')).toBeInTheDocument()
    expect(screen.getByText('Retiro')).toBeInTheDocument()
  })

  it('history list cubre empty, tipos, estados y apertura de detalle', async () => {
    render(<HistoryList transactions={[]} />)
    expect(screen.getByText('Sin movimientos')).toBeInTheDocument()

    const { rerender } = render(<HistoryList transactions={transactions} />)
    expect(screen.getByText('Registro de Bóveda')).toBeInTheDocument()
    expect(screen.getByText('Depósito')).toBeInTheDocument()
    expect(screen.getByText('Retiro')).toBeInTheDocument()
    expect(screen.getByText('Reembolso')).toBeInTheDocument()
    expect(screen.getByText('Bono')).toBeInTheDocument()
    expect(screen.getByText('Ajuste')).toBeInTheDocument()
    expect(screen.getAllByText('Éxito')[0]).toBeInTheDocument()
    expect(screen.getByText('Procesando')).toBeInTheDocument()
    expect(screen.getByText('Fallido')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Depósito'))
    expect(screen.getByText('Detalle tx-deposit deposit')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Cerrar detalle'))
    expect(screen.queryByText('Detalle tx-deposit deposit')).not.toBeInTheDocument()

    rerender(<HistoryList transactions={[{ ...transactions[0], id: 'tx-unknown', type: 'manual_review', status: 'cancelled' }]} />)
    expect(screen.getByText('manual_review')).toBeInTheDocument()
    expect(screen.getByText('Fallido')).toBeInTheDocument()
  })

  it('withdraw no envia si faltan campos y bloquea caracteres invalidos en monto', async () => {
    const user = userEvent.setup()
    render(<WithdrawPage />)

    const amount = screen.getByPlaceholderText('0')
    fireEvent.keyDown(amount, { key: 'e' })
    fireEvent.keyDown(amount, { key: '-' })
    await user.click(screen.getByRole('button', { name: /confirmar retiro/i }))

    expect(mockRequestWithdrawal).not.toHaveBeenCalled()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/wallet')
  })

  it('withdraw solicita retiro y vuelve a wallet en exito', async () => {
    const user = userEvent.setup()
    mockRequestWithdrawal.mockResolvedValue({ error: null } as never)

    render(<WithdrawPage />)

    await user.type(screen.getByPlaceholderText('0'), '25000')
    await user.type(screen.getByPlaceholderText(/ALIAS/i), 'ALIAS: mesa.primera')
    await user.click(screen.getByRole('button', { name: /confirmar retiro/i }))

    await waitFor(() => expect(mockRequestWithdrawal).toHaveBeenCalledWith(25000, 'ALIAS: mesa.primera'))
    expect(routerPush).toHaveBeenCalledWith('/wallet')
  })

  it('withdraw muestra alerta si la accion rechaza la solicitud', async () => {
    const user = userEvent.setup()
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})
    mockRequestWithdrawal.mockResolvedValue({ error: 'Saldo insuficiente' } as never)

    render(<WithdrawPage />)

    await user.type(screen.getByPlaceholderText('0'), '990000')
    await user.type(screen.getByPlaceholderText(/ALIAS/i), 'CBU 000')
    await user.click(screen.getByRole('button', { name: /confirmar retiro/i }))

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Saldo insuficiente'))
    expect(routerPush).not.toHaveBeenCalled()
    alertSpy.mockRestore()
  })
})
