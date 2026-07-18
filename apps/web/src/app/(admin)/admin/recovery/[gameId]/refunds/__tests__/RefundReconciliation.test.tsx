import { fireEvent, render, screen } from '@testing-library/react'
import { RefundReconciliation } from '../RefundReconciliation'
import { reconcileRecoveryRefund } from '@/app/actions/admin-recovery'

jest.mock('@/app/actions/admin-recovery', () => ({
  reconcileRecoveryRefund: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}))

describe('RefundReconciliation', () => {
  it('solo habilita la reconciliación tras escribir motivo y confirmar', () => {
    render(<RefundReconciliation refundId="00000000-0000-4000-8000-000000000141" />)

    const submit = screen.getByRole('button', { name: /confirmar conciliación/i })
    expect(submit).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/motivo operativo/i), { target: { value: 'Validación operativa de refund pendiente tras caída.' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /confirmo que debo conciliar/i }))
    expect(submit).toBeEnabled()
  })

  it('reutiliza la action de reconciliación sin enviar monto ni jugador', async () => {
    ;(reconcileRecoveryRefund as jest.Mock).mockResolvedValue({ data: { refundId: '00000000-0000-4000-8000-000000000141', ledgerId: '00000000-0000-4000-8000-000000000143', alreadyReconciled: false } })
    render(<RefundReconciliation refundId="00000000-0000-4000-8000-000000000141" />)

    fireEvent.change(screen.getByLabelText(/motivo operativo/i), { target: { value: 'Validación operativa de refund pendiente tras caída.' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /confirmo que debo conciliar/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmar conciliación/i }))

    expect(reconcileRecoveryRefund).toHaveBeenCalledWith({
      refundId: '00000000-0000-4000-8000-000000000141',
      reason: 'Validación operativa de refund pendiente tras caída.',
    })
  })
})
