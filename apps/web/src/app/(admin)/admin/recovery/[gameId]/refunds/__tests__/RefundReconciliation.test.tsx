import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { RefundReconciliation } from '../RefundReconciliation'
import { reconcileRecoveryRefund } from '@/app/actions/admin-recovery'
import { useRouter } from 'next/navigation'

jest.mock('@/app/actions/admin-recovery', () => ({
  reconcileRecoveryRefund: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockReconcileRecoveryRefund = reconcileRecoveryRefund as jest.MockedFunction<typeof reconcileRecoveryRefund>

describe('RefundReconciliation', () => {
  const refresh = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({ refresh } as unknown as ReturnType<typeof useRouter>)
  })

  it('solo habilita la reconciliación tras escribir motivo y confirmar', () => {
    render(<RefundReconciliation refundId="00000000-0000-4000-8000-000000000141" />)

    const submit = screen.getByRole('button', { name: /confirmar conciliación/i })
    expect(submit).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/motivo operativo/i), { target: { value: 'Validación operativa de refund pendiente tras caída.' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /confirmo que debo conciliar/i }))
    expect(submit).toBeEnabled()
  })

  it('reutiliza la action de reconciliación sin enviar monto ni jugador', async () => {
    mockReconcileRecoveryRefund.mockResolvedValue({ data: { refundId: '00000000-0000-4000-8000-000000000141', ledgerId: '00000000-0000-4000-8000-000000000143', alreadyReconciled: false } })
    render(<RefundReconciliation refundId="00000000-0000-4000-8000-000000000141" />)

    fireEvent.change(screen.getByLabelText(/motivo operativo/i), { target: { value: 'Validación operativa de refund pendiente tras caída.' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /confirmo que debo conciliar/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmar conciliación/i }))

    await waitFor(() => expect(mockReconcileRecoveryRefund).toHaveBeenCalledWith({
      refundId: '00000000-0000-4000-8000-000000000141',
      reason: 'Validación operativa de refund pendiente tras caída.',
    }))
    expect(await screen.findByRole('status')).toHaveTextContent('Refund conciliado correctamente.')
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('muestra cuando el refund ya estaba conciliado y refresca', async () => {
    mockReconcileRecoveryRefund.mockResolvedValue({ data: { refundId: 'refund-1', ledgerId: 'ledger-1', alreadyReconciled: true } })
    render(<RefundReconciliation refundId="refund-1" />)

    fireEvent.change(screen.getByLabelText(/motivo operativo/i), { target: { value: 'Revisión duplicada del refund pendiente.' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /confirmo que debo conciliar/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmar conciliación/i }))

    expect(await screen.findByRole('status')).toHaveTextContent('El refund ya estaba conciliado.')
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('muestra errores de dominio sin refrescar y conserva el formulario', async () => {
    mockReconcileRecoveryRefund.mockResolvedValue({ error: 'El refund ya no está pendiente.' })
    render(<RefundReconciliation refundId="refund-1" />)

    fireEvent.change(screen.getByLabelText(/motivo operativo/i), { target: { value: 'Validación operativa de refund pendiente tras caída.' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /confirmo que debo conciliar/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmar conciliación/i }))

    expect(await screen.findByRole('status')).toHaveTextContent('El refund ya no está pendiente.')
    expect(refresh).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/motivo operativo/i)).toHaveValue('Validación operativa de refund pendiente tras caída.')
    expect(screen.getByRole('checkbox', { name: /confirmo que debo conciliar/i })).toBeChecked()
  })

  it('convierte una excepción inesperada en un mensaje de reintento', async () => {
    mockReconcileRecoveryRefund.mockRejectedValue(new Error('network unavailable'))
    render(<RefundReconciliation refundId="refund-1" />)

    fireEvent.change(screen.getByLabelText(/motivo operativo/i), { target: { value: 'Validación operativa de refund pendiente tras caída.' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /confirmo que debo conciliar/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmar conciliación/i }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('No fue posible conciliar el refund'))
    expect(refresh).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).not.toHaveTextContent('network unavailable')
    expect(screen.getByLabelText(/motivo operativo/i)).toHaveValue('Validación operativa de refund pendiente tras caída.')
  })
})
