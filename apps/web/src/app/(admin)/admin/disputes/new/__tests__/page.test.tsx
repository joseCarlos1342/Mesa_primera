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

  it('crea una investigación interna y solo envía la consulta para resolver evidencia en servidor', async () => {
    params = new URLSearchParams({
      q: 'ledger-1',
      evidence: JSON.stringify([{ entity: 'ledger', entity_id: 'ledger-1', label: 'Movimiento inicial' }]),
    })
    mockCreateDispute.mockResolvedValue({ data: { id: 'dispute-1' } })

    render(<NewDisputePage />)

    expect(screen.getByDisplayValue('Investigación originada desde consulta: ledger-1')).toBeInTheDocument()
    expect(screen.getByText(/la evidencia se resolverá de nuevo en el servidor/i)).toBeInTheDocument()
    expect(screen.queryByText('Movimiento inicial')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Título *'), { target: { value: '  Cobro duplicado  ' } })
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: '  Revisar movimiento  ' } })
    fireEvent.change(screen.getByLabelText('Tipo de investigación'), { target: { value: 'collusion' } })
    fireEvent.change(screen.getByLabelText('Prioridad'), { target: { value: 'critical' } })
    fireEvent.change(screen.getByLabelText(/jugadores relacionados/i), { target: { value: '11111111-1111-4111-8111-111111111111' } })
    fireEvent.change(screen.getByLabelText(/id de partida terminada/i), { target: { value: '22222222-2222-4222-8222-222222222222' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear investigación' }))

    await waitFor(() => expect(mockCreateDispute).toHaveBeenCalledWith({
      title: 'Cobro duplicado',
      description: 'Revisar movimiento',
      investigation_type: 'collusion',
      priority: 'critical',
      source: 'global_search',
      source_query: 'ledger-1',
      subject_user_ids: ['11111111-1111-4111-8111-111111111111'],
      game_id: '22222222-2222-4222-8222-222222222222',
      room_id: undefined,
    }))
    expect(push).toHaveBeenCalledWith('/admin/disputes/dispute-1')
  })

  it('ignora evidencia serializada por URL y muestra error de creación', async () => {
    params = new URLSearchParams({ evidence: '{malformed' })
    mockCreateDispute.mockResolvedValue({ error: 'No autorizado' })

    render(<NewDisputePage />)

    expect(screen.queryByText(/Evidencia vinculada/)).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Título *'), { target: { value: 'Caso manual' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear investigación' }))

    expect(await screen.findByText('No autorizado')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('vuelve atras al cancelar', () => {
    render(<NewDisputePage />)

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(back).toHaveBeenCalled()
  })
})
