import { render, screen } from '@testing-library/react'
import DisputesListPage from '../page'
import { listDisputes } from '@/app/actions/admin-disputes'

jest.mock('@/app/actions/admin-disputes', () => ({
  listDisputes: jest.fn(),
}))

const mockListDisputes = listDisputes as jest.MockedFunction<typeof listDisputes>

describe('DisputesListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('lista disputas con estado, prioridad y enlaces operativos', async () => {
    mockListDisputes.mockResolvedValue({
      data: [
        {
          id: 'dispute-1',
          title: 'Cobro duplicado',
          description: 'Jugador reporta doble cargo.',
          status: 'open',
          priority: 'critical',
          investigation_type: 'collusion',
          source: 'manual',
          subject_user_ids: [],
          game_id: null,
          room_id: null,
          opened_by: 'admin-1',
          support_ticket_id: 'ticket-1',
          assigned_to: 'admin-1',
          evidence_snapshot: [],
          resolution_notes: null,
          resolved_at: null,
          resolved_by: null,
          created_at: '2026-05-25T10:00:00.000Z',
          updated_at: '2026-05-25T10:00:00.000Z',
        },
        {
          id: 'dispute-2',
          title: 'Consulta descartada',
          description: 'No aplica.',
          status: 'unknown' as never,
          priority: 'unknown' as never,
          investigation_type: 'game_integrity',
          source: 'manual',
          subject_user_ids: [],
          game_id: null,
          room_id: null,
          opened_by: 'admin-1',
          support_ticket_id: null,
          assigned_to: null,
          evidence_snapshot: [],
          resolution_notes: null,
          resolved_at: null,
          resolved_by: null,
          created_at: '2026-05-24T10:00:00.000Z',
          updated_at: '2026-05-24T10:00:00.000Z',
        },
      ],
    })

    render(await DisputesListPage())

    expect(screen.getByRole('heading', { name: 'Investigaciones internas' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /consultas/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /nueva investigación/i })).toHaveAttribute('href', '/admin/disputes/new')
    expect(screen.getByText('collusion')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open critical .*cobro duplicado/i })).toHaveAttribute('href', '/admin/disputes/dispute-1')
    expect(screen.getByText('Asignado')).toBeInTheDocument()
    expect(screen.getAllByText('unknown')).toHaveLength(2)
  })

  it('muestra empty state sin disputas', async () => {
    mockListDisputes.mockResolvedValue({ data: [] })

    render(await DisputesListPage())

    expect(screen.getByText('No hay investigaciones registradas.')).toBeInTheDocument()
  })

  it('muestra error de carga', async () => {
    mockListDisputes.mockResolvedValue({ error: 'No autorizado' })

    render(await DisputesListPage())

    expect(screen.getByRole('heading', { name: 'Investigaciones internas' })).toBeInTheDocument()
    expect(screen.getByText('No autorizado')).toBeInTheDocument()
  })

  it('expone filtros operativos y los aplica al listado', async () => {
    mockListDisputes.mockResolvedValue({ data: [] })

    render(await DisputesListPage({
      searchParams: Promise.resolve({ status: 'investigating', priority: 'high', type: 'collusion' }),
    }))

    expect(mockListDisputes).toHaveBeenCalledWith({
      status: 'investigating',
      priority: 'high',
      investigationType: 'collusion',
    })
    expect(screen.getByLabelText('Estado')).toHaveValue('investigating')
    expect(screen.getByLabelText('Tipo')).toHaveValue('collusion')
  })
})
