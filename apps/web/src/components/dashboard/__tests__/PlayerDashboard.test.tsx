import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { PlayerDashboard } from '../PlayerDashboard'
import { getWalletData } from '@/app/actions/wallet'

jest.mock('framer-motion', () => ({
  m: {
    section: ({ children, initial: _initial, animate: _animate, transition: _transition, whileHover: _whileHover, whileTap: _whileTap, ...props }: React.HTMLAttributes<HTMLElement> & Record<string, unknown>) => <section {...props}>{children}</section>,
    div: ({ children, initial: _initial, animate: _animate, transition: _transition, whileHover: _whileHover, whileTap: _whileTap, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => <div {...props}>{children}</div>,
  },
}))

jest.mock('@/app/actions/wallet', () => ({
  getWalletData: jest.fn(),
}))

jest.mock('../../wallet/TransactionModal', () => ({
  TransactionModal: ({ isOpen, transaction, onClose }: { isOpen: boolean; transaction: { id?: string } | null; onClose: () => void }) => (
    <div data-testid="transaction-modal">
      <span>open:{String(isOpen)}</span>
      <span>tx:{transaction?.id ?? 'none'}</span>
      <button type="button" onClick={onClose}>cerrar modal</button>
    </div>
  ),
}))

const mockGetWalletData = getWalletData as jest.MockedFunction<typeof getWalletData>

const initialData = {
  wallet: { balance_cents: 125000 },
  transactions: [
    { id: 'tx-1', type: 'deposit', status: 'completed', amount_cents: 50000, created_at: '2025-01-01T10:00:00.000Z' },
    { id: 'tx-2', type: 'win', status: 'pending', amount_cents: 80000, created_at: '2025-01-02T10:00:00.000Z' },
    { id: 'tx-3', type: 'bet', status: 'failed', amount_cents: 20000, created_at: '2025-01-03T10:00:00.000Z' },
    { id: 'tx-4', type: 'refund', status: 'completed', amount_cents: 10000, created_at: '2025-01-04T10:00:00.000Z' },
  ],
}

describe('PlayerDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renderiza saldo, accesos rápidos y actividad con datos iniciales', () => {
    render(<PlayerDashboard initialData={initialData} />)

    expect(screen.getByText(/saldo disponible/i)).toBeInTheDocument()
    expect(screen.getByText('$1.250')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /cargar saldo/i })).toHaveAttribute('href', '/wallet')
    expect(screen.getByRole('link', { name: /ir al lobby/i })).toHaveAttribute('href', '/lobby')
    expect(screen.getByRole('link', { name: /estadísticas/i })).toHaveAttribute('href', '/stats')
    expect(screen.getByRole('link', { name: /amigos/i })).toHaveAttribute('href', '/friends')
    expect(screen.getByRole('link', { name: /ver todo/i })).toHaveAttribute('href', '/wallet/history')
    expect(screen.getByText('Depósito')).toBeInTheDocument()
    expect(screen.getByText('Ganancia')).toBeInTheDocument()
    expect(screen.getByText('Apuesta')).toBeInTheDocument()
    expect(screen.queryByText(/bóveda vacía/i)).not.toBeInTheDocument()
  })

  it('abre el modal de transacción al hacer click en una actividad', () => {
    render(<PlayerDashboard initialData={initialData} />)

    fireEvent.click(screen.getByText('Depósito'))

    expect(screen.getByTestId('transaction-modal')).toHaveTextContent('open:true')
    expect(screen.getByTestId('transaction-modal')).toHaveTextContent('tx:tx-1')

    fireEvent.click(screen.getByRole('button', { name: /cerrar modal/i }))
    expect(screen.getByTestId('transaction-modal')).toHaveTextContent('open:false')
  })

  it('muestra estado vacío cuando no hay transacciones', () => {
    render(<PlayerDashboard initialData={{ wallet: { balance_cents: 0 }, transactions: [] }} />)

    expect(screen.getByText(/bóveda vacía/i)).toBeInTheDocument()
  })

  it('carga datos con getWalletData cuando no recibe initialData y sale del loading', async () => {
    mockGetWalletData.mockResolvedValue(initialData as never)
    const { container } = render(<PlayerDashboard />)

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)

    await waitFor(() => {
      expect(mockGetWalletData).toHaveBeenCalledTimes(1)
      expect(screen.getByText('Depósito')).toBeInTheDocument()
    })
  })
})
