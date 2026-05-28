import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import NewDisputePage from '../page'
import { createDispute } from '@/app/actions/admin-disputes'

const push = jest.fn()
const back = jest.fn()
let params = new URLSearchParams()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, back }),
  useSearchParams: () => params,
}))

jest.mock('@/app/actions/admin-disputes', () => ({
  createDispute: jest.fn(),
}))

const mockCreateDispute = createDispute as jest.MockedFunction<typeof createDispute>

describe('NewDisputePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    params = new URLSearchParams()
  })

  it('prefill desde query y evidencia, crea disputa y navega al detalle', async () => {
    params = new URLSearchParams({
      q: 'ledger-1',
      evidence: JSON.stringify([{ entity: 'ledger', entity_id: 'ledger-1', label: 'Movimiento inicial' }]),
    })
    mockCreateDispute.mockResolvedValue({ data: { id: 'dispute-1' } })

    render(<NewDisputePage />)

    expect(screen.getByDisplayValue('Investigación originada desde consulta: ledger-1')).toBeInTheDocument()
    expect(screen.getByText('Evidencia vinculada (1)')).toBeInTheDocument()
    expect(screen.getByText('Movimiento inicial')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Título *'), { target: { value: '  Cobro duplicado  ' } })
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: '  Revisar movimiento  ' } })
    fireEvent.change(screen.getByLabelText('Prioridad'), { target: { value: 'critical' } })
    fireEvent.change(screen.getByLabelText(/ticket de soporte/i), { target: { value: ' ticket-1 ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear disputa' }))

    await waitFor(() => expect(mockCreateDispute).toHaveBeenCalledWith({
      title: 'Cobro duplicado',
      description: 'Revisar movimiento',
      priority: 'critical',
      evidence_snapshot: [{ entity: 'ledger', entity_id: 'ledger-1', label: 'Movimiento inicial' }],
      support_ticket_id: 'ticket-1',
    }))
    expect(push).toHaveBeenCalledWith('/admin/disputes/dispute-1')
  })

  it('ignora evidencia invalida y muestra error de creacion', async () => {
    params = new URLSearchParams({ evidence: '{malformed' })
    mockCreateDispute.mockResolvedValue({ error: 'No autorizado' })

    render(<NewDisputePage />)

    expect(screen.queryByText(/Evidencia vinculada/)).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Título *'), { target: { value: 'Caso manual' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear disputa' }))

    expect(await screen.findByText('No autorizado')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('vuelve atras al cancelar', () => {
    render(<NewDisputePage />)

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(back).toHaveBeenCalled()
  })
})
