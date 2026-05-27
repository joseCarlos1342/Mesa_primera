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
          support_ticket_id: 'ticket-1',
          assigned_to: 'admin-1',
          created_at: '2026-05-25T10:00:00.000Z',
        },
        {
          id: 'dispute-2',
          title: 'Consulta descartada',
          description: 'No aplica.',
          status: 'unknown',
          priority: 'unknown',
          support_ticket_id: null,
          assigned_to: null,
          created_at: '2026-05-24T10:00:00.000Z',
        },
      ],
    })

    render(await DisputesListPage())

    expect(screen.getByRole('heading', { name: 'Disputas' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /consultas/i })).toHaveAttribute('href', '/admin/consultas')
    expect(screen.getByRole('link', { name: /nueva disputa/i })).toHaveAttribute('href', '/admin/disputes/new')
    expect(screen.getByRole('link', { name: /open critical .*cobro duplicado/i })).toHaveAttribute('href', '/admin/disputes/dispute-1')
    expect(screen.getByText('Asignado')).toBeInTheDocument()
    expect(screen.getAllByText('unknown')).toHaveLength(2)
  })

  it('muestra empty state sin disputas', async () => {
    mockListDisputes.mockResolvedValue({ data: [] })

    render(await DisputesListPage())

    expect(screen.getByText('No hay disputas registradas.')).toBeInTheDocument()
  })

  it('muestra error de carga', async () => {
    mockListDisputes.mockResolvedValue({ error: 'No autorizado' })

    render(await DisputesListPage())

    expect(screen.getByRole('heading', { name: 'Disputas' })).toBeInTheDocument()
    expect(screen.getByText('No autorizado')).toBeInTheDocument()
  })
})
