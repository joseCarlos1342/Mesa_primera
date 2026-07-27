import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { closeRecoveryIncident } from '@/app/actions/admin-recovery'
import { CloseRecoveryIncident } from '../CloseRecoveryIncident'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/app/actions/admin-recovery', () => ({
  closeRecoveryIncident: jest.fn(),
}))

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockCloseRecoveryIncident = closeRecoveryIncident as jest.MockedFunction<typeof closeRecoveryIncident>

describe('CloseRecoveryIncident', () => {
  const refresh = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({ refresh } as unknown as ReturnType<typeof useRouter>)
  })

  function prepareValidClose(reason = ' Motivo operativo confirmado. ') {
    fireEvent.change(screen.getByLabelText(/motivo de cierre/i), { target: { value: reason } })
    fireEvent.click(screen.getByRole('checkbox', { name: /confirmo el cierre irreversible/i }))
  }

  it('mantiene bloqueado el cierre hasta confirmar y escribir un motivo válido', () => {
    render(<CloseRecoveryIncident incidentId="incident-1" />)

    const closeButton = screen.getByRole('button', { name: /cerrar incidente/i })
    expect(closeButton).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/motivo de cierre/i), { target: { value: '123456789' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /confirmo el cierre irreversible/i }))
    expect(closeButton).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/motivo de cierre/i), { target: { value: '1234567890' } })
    expect(closeButton).toBeEnabled()
  })

  it('envía el motivo recortado y refresca después de cerrar el incidente', async () => {
    mockCloseRecoveryIncident.mockResolvedValue({ data: { incidentId: 'incident-1', closedAt: '2026-07-27T03:00:00.000Z', alreadyClosed: false } })
    render(<CloseRecoveryIncident incidentId="incident-1" />)
    prepareValidClose()

    fireEvent.click(screen.getByRole('button', { name: /cerrar incidente/i }))

    await waitFor(() => expect(mockCloseRecoveryIncident).toHaveBeenCalledWith({
      incidentId: 'incident-1',
      reason: 'Motivo operativo confirmado.',
      confirmed: true,
    }))
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('muestra el error de dominio y conserva el formulario para reintentar', async () => {
    mockCloseRecoveryIncident.mockResolvedValue({ error: 'El incidente ya fue cerrado.' })
    render(<CloseRecoveryIncident incidentId="incident-1" />)
    prepareValidClose()

    fireEvent.click(screen.getByRole('button', { name: /cerrar incidente/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El incidente ya fue cerrado.')
    expect(refresh).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/motivo de cierre/i)).toHaveValue(' Motivo operativo confirmado. ')
  })

  it('convierte una excepción inesperada en un error operativo visible', async () => {
    mockCloseRecoveryIncident.mockRejectedValue(new Error('network unavailable'))
    render(<CloseRecoveryIncident incidentId="incident-1" />)
    prepareValidClose()

    fireEvent.click(screen.getByRole('button', { name: /cerrar incidente/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible cerrar el incidente')
    expect(refresh).not.toHaveBeenCalled()
  })
})
