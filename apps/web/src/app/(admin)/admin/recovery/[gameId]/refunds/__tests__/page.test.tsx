import { render, screen } from '@testing-library/react'
import RecoveryRefundsPage from '../page'
import { getAdminRecoveryRefunds } from '@/app/actions/admin-recovery'

jest.mock('@/app/actions/admin-recovery', () => ({
  getAdminRecoveryRefunds: jest.fn(),
}))

describe('RecoveryRefundsPage', () => {
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
})
