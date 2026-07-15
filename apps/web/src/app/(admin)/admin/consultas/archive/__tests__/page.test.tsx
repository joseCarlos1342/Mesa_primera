import { render, screen } from '@testing-library/react'
import ArchivePage from '../page'
import { listAdminArchivedIssueTickets } from '@/app/actions/admin-issues'

jest.mock('@/app/actions/admin-issues', () => ({
  listAdminArchivedIssueTickets: jest.fn(),
}))

const mockList = listAdminArchivedIssueTickets as jest.MockedFunction<
  typeof listAdminArchivedIssueTickets
>

function makeArchived(overrides: Partial<{ id: string; status: 'closed' | 'resolved' | 'investigating'; description: string }> = {}) {
  return {
    id: 'a-1',
    user_id: 'u-1',
    category: 'table_error',
    status: 'closed' as const,
    description: 'desc',
    transaction_reference: null,
    table_reference: null,
    occurred_at: '2026-07-12T10:00:00.000Z',
    resolution_notes: null,
    created_at: '2026-07-12T10:00:00.000Z',
    updated_at: '2026-07-12T10:00:00.000Z',
    ...overrides,
  }
}

describe('ArchivePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockList.mockResolvedValue({ data: [] })
  })

  it('lista tickets archivados con su etiqueta de estado visible', async () => {
    mockList.mockResolvedValue({
      data: [
        makeArchived({ id: 'a-1', status: 'closed', description: 'caso cerrado' }),
        makeArchived({ id: 'a-2', status: 'resolved', description: 'caso resuelto' }),
        makeArchived({ id: 'a-3', status: 'investigating', description: 'caso en investigacion' }),
      ],
    })

    render(await ArchivePage())

    expect(screen.getByRole('heading', { name: /archivo de consultas/i })).toBeInTheDocument()
    expect(screen.getByText('caso cerrado')).toBeInTheDocument()
    expect(screen.getByText('caso resuelto')).toBeInTheDocument()
    expect(screen.getByText('caso en investigacion')).toBeInTheDocument()
    // Labels legibles en español para el admin
    expect(screen.getByText('Cerrada')).toBeInTheDocument()
    expect(screen.getByText('Resuelta')).toBeInTheDocument()
    expect(screen.getByText('En investigación')).toBeInTheDocument()
    // Cada ticket archivado debe enlazar a su detalle
    expect(screen.getByRole('link', { name: /caso cerrado/i })).toHaveAttribute('href', '/admin/consultas/a-1')
    expect(screen.getByRole('link', { name: /caso resuelto/i })).toHaveAttribute('href', '/admin/consultas/a-2')
    expect(screen.getByRole('link', { name: /caso en investigacion/i })).toHaveAttribute('href', '/admin/consultas/a-3')
  })

  it('muestra empty state cuando no hay archivados', async () => {
    mockList.mockResolvedValue({ data: [] })

    render(await ArchivePage())

    expect(screen.getByText(/no hay consultas archivadas/i)).toBeInTheDocument()
  })

  it('muestra error de carga sin romper la pagina', async () => {
    mockList.mockResolvedValue({ error: 'No autorizado' })

    render(await ArchivePage())

    expect(screen.getByText('No autorizado')).toBeInTheDocument()
  })

  it('no muestra el enlace "Bandeja activa"', async () => {
    mockList.mockResolvedValue({
      data: [makeArchived({ id: 'a-1', status: 'closed', description: 'caso cerrado' })],
    })

    render(await ArchivePage())

    expect(
      screen.queryByRole('link', { name: /bandeja activa/i })
    ).not.toBeInTheDocument()
  })
})
