import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { PlayerDashboard } from '../PlayerDashboard'
import { getWalletData } from '@/app/actions/wallet'

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

  it('renderiza saldo, accesos rápidos y últimos movimientos con datos iniciales', () => {
    render(<PlayerDashboard initialData={initialData} />)

    expect(screen.getByText('Tu saldo')).toBeInTheDocument()
    expect(screen.getByText('1.250')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /jugar ahora/i })).toHaveAttribute('href', '/lobby')
    expect(screen.getByRole('link', { name: /cargar saldo/i })).toHaveAttribute('href', '/wallet/deposit')
    expect(screen.getByRole('link', { name: /retirar/i })).toHaveAttribute('href', '/wallet/withdraw')
    expect(screen.getByRole('link', { name: /estadísticas/i })).toHaveAttribute('href', '/stats')
    expect(screen.getByRole('link', { name: /ver todo/i })).toHaveAttribute('href', '/wallet/history')
    // Solo los 3 movimientos más recientes.
    expect(screen.getByText('Carga de saldo')).toBeInTheDocument()
    expect(screen.getByText('Ganancia en mesa')).toBeInTheDocument()
    expect(screen.getByText('Apuesta')).toBeInTheDocument()
    expect(screen.queryByText('Reembolso')).not.toBeInTheDocument()
    expect(screen.queryByText(/aún no tienes movimientos/i)).not.toBeInTheDocument()
  })

  it('muestra las estadísticas del jugador cuando se entregan', () => {
    render(
      <PlayerDashboard
        initialData={initialData}
        stats={{ games_played: 12, games_won: 7, current_streak: 3 }}
      />,
    )
    expect(screen.getByText('Partidas')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('muestra invitación a jugar cuando no hay estadísticas', () => {
    render(<PlayerDashboard initialData={initialData} stats={null} />)
    expect(screen.getByText(/juega tu primera partida/i)).toBeInTheDocument()
  })

  it('abre el modal de transacción al hacer click en un movimiento', () => {
    render(<PlayerDashboard initialData={initialData} />)

    fireEvent.click(screen.getByText('Carga de saldo'))

    expect(screen.getByTestId('transaction-modal')).toHaveTextContent('open:true')
    expect(screen.getByTestId('transaction-modal')).toHaveTextContent('tx:tx-1')

    fireEvent.click(screen.getByRole('button', { name: /cerrar modal/i }))
    expect(screen.getByTestId('transaction-modal')).toHaveTextContent('open:false')
  })

  it('muestra estado vacío cuando no hay transacciones', () => {
    render(<PlayerDashboard initialData={{ wallet: { balance_cents: 0 }, transactions: [] }} />)

    expect(screen.getByText(/aún no tienes movimientos/i)).toBeInTheDocument()
    // Hay dos accesos "Cargar saldo": el del panel y el de la acción vacía.
    expect(screen.getAllByRole('link', { name: /cargar saldo/i }).length).toBeGreaterThanOrEqual(1)
  })

  it('carga datos con getWalletData cuando no recibe initialData y sale del loading', async () => {
    mockGetWalletData.mockResolvedValue(initialData as never)
    render(<PlayerDashboard />)

    expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument()

    await waitFor(() => {
      expect(mockGetWalletData).toHaveBeenCalledTimes(1)
      expect(screen.getByText('Carga de saldo')).toBeInTheDocument()
    })
  })

  it('usa null si getWalletData devuelve error y muestra estado vacío', async () => {
    mockGetWalletData.mockResolvedValue({ error: 'fallo' } as never)
    render(<PlayerDashboard />)

    await waitFor(() => {
      expect(mockGetWalletData).toHaveBeenCalledTimes(1)
      expect(screen.getByText(/aún no tienes movimientos/i)).toBeInTheDocument()
    })
  })
})
