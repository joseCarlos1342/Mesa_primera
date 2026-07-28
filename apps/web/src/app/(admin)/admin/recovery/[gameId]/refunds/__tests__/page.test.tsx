import { render, screen } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import RecoveryRefundsPage from '../page'
import { getAdminRecoveryRefunds } from '@/app/actions/admin-recovery'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/app/actions/admin-recovery', () => ({
  getAdminRecoveryRefunds: jest.fn(),
  reconcileRecoveryRefund: jest.fn(),
}))

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

describe('RecoveryRefundsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({ refresh: jest.fn() } as unknown as ReturnType<typeof useRouter>)
  })

  it('muestra refunds terminales con enlaces al historial del jugador y movimiento ledger', async () => {
    ;(getAdminRecoveryRefunds as jest.Mock).mockResolvedValue([{
      refundId: '00000000-0000-4000-8000-000000000141',
      userId: '00000000-0000-4000-8000-000000000142',
      amountCents: 5000,
      status: 'completed',
      ledgerId: '00000000-0000-4000-8000-000000000143',
      completedAt: '2026-07-18T04:00:00.000Z',
    }])

    render(await RecoveryRefundsPage({ params: Promise.resolve({ gameId: '00000000-0000-4000-8000-000000000140' }) }))

    expect(screen.getByRole('link', { name: /historial del jugador/i })).toHaveAttribute(
      'href', '/admin/ledger/00000000-0000-4000-8000-000000000142'
    )
    expect(screen.getByRole('link', { name: /movimiento ledger/i })).toHaveAttribute(
      'href', '/admin/ledger?q=00000000-0000-4000-8000-000000000143'
    )
  })

  it('muestra estados no completados y el control de conciliación sin movimiento ledger', async () => {
    ;(getAdminRecoveryRefunds as jest.Mock).mockResolvedValue([
      {
        refundId: '00000000-0000-4000-8000-000000000151',
        userId: '00000000-0000-4000-8000-000000000152',
        amountCents: 10000,
        status: 'pending',
        ledgerId: null,
        completedAt: null,
      },
      {
        refundId: '00000000-0000-4000-8000-000000000153',
        userId: '00000000-0000-4000-8000-000000000154',
        amountCents: 2500,
        status: 'failed',
        ledgerId: null,
        completedAt: null,
      },
    ])

    render(await RecoveryRefundsPage({ params: Promise.resolve({ gameId: '00000000-0000-4000-8000-000000000150' }) }))

    expect(screen.getByText('Pendiente')).toHaveClass('text-warning')
    expect(screen.getByText('Fallido')).toHaveClass('text-warning')
    expect(screen.getByText('Pendiente').closest('tr')).toHaveTextContent('Conciliar refund')
    expect(screen.getByText('Fallido').closest('tr')).toHaveTextContent('Conciliar refund')
    expect(screen.getAllByText('Sin movimiento registrado')).toHaveLength(2)
    expect(screen.getAllByText('Conciliar refund')).toHaveLength(2)
    expect(screen.getAllByRole('textbox', { name: /motivo operativo/i })).toHaveLength(2)
  })
})
