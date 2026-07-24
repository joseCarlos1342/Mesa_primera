import { render, screen } from '@testing-library/react'
import AdminSupportPage from '../page'
import { createClient } from '@/utils/supabase/server'

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/components/admin/SupportConversationList', () => ({
  SupportConversationList: ({ initialTickets, adminId }: { initialTickets: unknown[]; adminId: string }) => (
    <div data-testid="support-conversation-list">Tickets: {initialTickets.length} Admin: {adminId}</div>
  ),
}))

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

function createSupabaseMock({
  tickets = [{ id: 'ticket-1' }],
  error = null,
  userId = 'admin-1',
}: {
  tickets?: Array<{ id: string }> | null
  error?: { message: string } | null
  userId?: string | null
} = {}) {
  return {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn().mockResolvedValue({ data: tickets, error }),
      })),
    })),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
  }
}

describe('AdminSupportPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('carga tickets con perfil y renderiza el centro de soporte', async () => {
    const supabase = createSupabaseMock({ tickets: [{ id: 'ticket-1' }, { id: 'ticket-2' }], userId: 'admin-42' })
    mockCreateClient.mockResolvedValue(supabase as unknown as Awaited<ReturnType<typeof createClient>>)

    render(await AdminSupportPage({}))

    expect(supabase.from).toHaveBeenCalledWith('support_tickets')
    expect(supabase.auth.getUser).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('heading', { name: /soporte técnico/i })).toBeInTheDocument()
    expect(screen.getByText(/Gestiona las consultas/)).toBeInTheDocument()
    expect(screen.getByText('Servicio En Línea')).toBeInTheDocument()
    expect(screen.getByTestId('support-conversation-list')).toHaveTextContent('Tickets: 2 Admin: admin-42')
  })

  it('muestra error si falla la consulta de soporte', async () => {
    const supabase = createSupabaseMock({ tickets: null, error: { message: 'Permiso denegado' }, userId: 'admin-1' })
    mockCreateClient.mockResolvedValue(supabase as unknown as Awaited<ReturnType<typeof createClient>>)

    render(await AdminSupportPage({}))

    expect(screen.getByText('Error al cargar soporte: Permiso denegado')).toBeInTheDocument()
    expect(supabase.auth.getUser).not.toHaveBeenCalled()
  })

  it('usa string vacio como adminId cuando getUser no devuelve usuario', async () => {
    const supabase = createSupabaseMock({ tickets: [{ id: 'ticket-1' }], userId: null })
    mockCreateClient.mockResolvedValue(supabase as unknown as Awaited<ReturnType<typeof createClient>>)

    render(await AdminSupportPage({}))

    expect(screen.getByTestId('support-conversation-list')).toHaveTextContent('Tickets: 1 Admin:')
  })
})
