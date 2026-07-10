import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import DisputeDetailPage from '../page'
import { DisputeActions } from '../dispute-actions'
import { assignDispute, dismissDispute, getDispute, resolveDispute } from '@/app/actions/admin-disputes'
import type { AdminDisputeCase } from '@/types/admin-search'

const refresh = jest.fn()
const notFound = jest.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
})

jest.mock('next/navigation', () => ({
  notFound: () => notFound(),
  useRouter: () => ({ refresh }),
}))

jest.mock('@/app/actions/admin-disputes', () => ({
  getDispute: jest.fn(),
  assignDispute: jest.fn(),
  resolveDispute: jest.fn(),
  dismissDispute: jest.fn(),
}))

const mockGetDispute = getDispute as jest.MockedFunction<typeof getDispute>
const mockAssignDispute = assignDispute as jest.MockedFunction<typeof assignDispute>
const mockResolveDispute = resolveDispute as jest.MockedFunction<typeof resolveDispute>
const mockDismissDispute = dismissDispute as jest.MockedFunction<typeof dismissDispute>

function makeDispute(overrides: Partial<AdminDisputeCase> = {}): AdminDisputeCase {
  return {
    id: 'dispute-1',
    status: 'open',
    priority: 'critical',
    title: 'Cobro sospechoso',
    description: 'Jugador reporta una mano irregular.',
    opened_by: 'admin-1',
    assigned_to: null,
    support_ticket_id: 'ticket-1',
    evidence_snapshot: [
      { entity: 'ledger', entity_id: 'ledger-1', label: 'Movimiento de entrada' },
      { entity: 'replay', entity_id: 'game-1', label: 'Replay de la mano' },
      { entity: 'alert', entity_id: 'alert-1', label: 'Alerta de servidor' },
    ],
    resolution_notes: null,
    resolved_at: null,
    resolved_by: null,
    created_at: '2026-05-25T10:00:00.000Z',
    updated_at: '2026-05-25T10:00:00.000Z',
    ...overrides,
  }
}

describe('DisputeDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renderiza detalle abierto con evidencia, ticket y acciones', async () => {
    mockGetDispute.mockResolvedValue({ data: makeDispute() })

    render(await DisputeDetailPage({ params: Promise.resolve({ id: 'dispute-1' }) }))

    expect(mockGetDispute).toHaveBeenCalledWith('dispute-1')
    expect(screen.getByRole('link', { name: /volver a disputas/i })).toHaveAttribute('href', '/admin/disputes')
    expect(screen.getByRole('heading', { name: 'Cobro sospechoso' })).toBeInTheDocument()
    expect(screen.getByText('open')).toBeInTheDocument()
    expect(screen.getByText('critical')).toBeInTheDocument()
    expect(screen.getByText('Jugador reporta una mano irregular.')).toBeInTheDocument()
    expect(screen.getByText('Evidencia vinculada (3)')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ledger movimiento de entrada ledger-1/i })).toHaveAttribute('href', '/admin/ledger')
    expect(screen.getByRole('link', { name: /replay replay de la mano game-1/i })).toHaveAttribute('href', '/admin/replays/game-1')
    expect(screen.getByRole('link', { name: /alert alerta de servidor alert-1/i })).toHaveAttribute('href', '/admin/server-log')
    expect(screen.getByRole('link', { name: 'ticket-1' })).toHaveAttribute('href', '/admin/soporte/ticket-1')
    expect(screen.getByRole('heading', { name: 'Acciones' })).toBeInTheDocument()
  })

  it('oculta acciones en disputa cerrada y muestra razon de descarte', async () => {
    mockGetDispute.mockResolvedValue({
      data: makeDispute({
        status: 'dismissed',
        priority: 'low',
        description: '',
        support_ticket_id: null,
        evidence_snapshot: [],
        resolution_notes: 'No se encontro evidencia.',
        resolved_at: '2026-05-25T12:00:00.000Z',
      }),
    })

    render(await DisputeDetailPage({ params: Promise.resolve({ id: 'dispute-1' }) }))

    expect(screen.getByText('dismissed')).toBeInTheDocument()
    expect(screen.getByText('low')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByText('Razón de descarte')).toBeInTheDocument()
    expect(screen.getByText('No se encontro evidencia.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Acciones' })).not.toBeInTheDocument()
  })

  it('llama notFound cuando no hay disputa', async () => {
    mockGetDispute.mockResolvedValue({ error: 'No existe' })

    await expect(DisputeDetailPage({ params: Promise.resolve({ id: 'missing' }) })).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFound).toHaveBeenCalled()
  })

  it('renderiza evidencia con entidades deposit, withdrawal, user, ticket y desconocida', async () => {
    mockGetDispute.mockResolvedValue({
      data: makeDispute({
        evidence_snapshot: [
          { entity: 'deposit', entity_id: 'dep-1', label: 'Deposito sospechoso' },
          { entity: 'withdrawal', entity_id: 'wd-1', label: 'Retiro investigado' },
          { entity: 'user', entity_id: 'user-1', label: 'Perfil del jugador' },
          { entity: 'ticket', entity_id: 'ticket-2', label: 'Ticket relacionado' },
          { entity: 'unknown_entity' as any, entity_id: 'x-1', label: 'Entidad desconocida' },
        ],
        support_ticket_id: null,
      }),
    })

    render(await DisputeDetailPage({ params: Promise.resolve({ id: 'dispute-1' }) }))

    expect(screen.getByRole('link', { name: /deposit deposito sospechoso dep-1/i })).toHaveAttribute('href', '/admin/deposits')
    expect(screen.getByRole('link', { name: /withdrawal retiro investigado wd-1/i })).toHaveAttribute('href', '/admin/withdrawals')
    expect(screen.getByRole('link', { name: /user perfil del jugador user-1/i })).toHaveAttribute('href', '/admin/users/user-1')
    expect(screen.getByRole('link', { name: /ticket ticket relacionado ticket-2/i })).toHaveAttribute('href', '/admin/soporte/ticket-2')
    expect(screen.getByRole('link', { name: /unknown_entity entidad desconocida x-1/i })).toHaveAttribute('href', '#')
  })

  it('usa fallback de colores para status y priority desconocidos', async () => {
    mockGetDispute.mockResolvedValue({
      data: makeDispute({
        status: 'unknown_status' as unknown as AdminDisputeCase['status'],
        priority: 'unknown_priority' as unknown as AdminDisputeCase['priority'],
        evidence_snapshot: [],
        support_ticket_id: null,
      }),
    })

    render(await DisputeDetailPage({ params: Promise.resolve({ id: 'dispute-1' }) }))

    expect(screen.getByText('unknown_status')).toBeInTheDocument()
    expect(screen.getByText('unknown_priority')).toBeInTheDocument()
  })

  it('muestra notas de resolucion cuando la disputa esta resuelta', async () => {
    mockGetDispute.mockResolvedValue({
      data: makeDispute({
        status: 'resolved',
        resolution_notes: 'Se devolvio el saldo al jugador.',
        resolved_at: '2026-05-25T14:00:00.000Z',
        evidence_snapshot: [],
        support_ticket_id: null,
      }),
    })

    render(await DisputeDetailPage({ params: Promise.resolve({ id: 'dispute-1' }) }))

    expect(screen.getByText('Notas de resolución')).toBeInTheDocument()
    expect(screen.getByText('Se devolvio el saldo al jugador.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Acciones' })).not.toBeInTheDocument()
  })
})

describe('DisputeActions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('asigna disputa abierta y refresca la pagina', async () => {
    mockAssignDispute.mockResolvedValue({ data: { id: 'dispute-1', status: 'investigating', assigned_to: 'admin-2' } })

    render(<DisputeActions disputeId="dispute-1" status="open" />)

    expect(screen.getByRole('button', { name: 'Asignar' })).toBeDisabled()
    fireEvent.change(screen.getByPlaceholderText('UUID del admin a asignar'), { target: { value: ' admin-2 ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Asignar' }))

    await waitFor(() => expect(mockAssignDispute).toHaveBeenCalledWith('dispute-1', 'admin-2'))
    expect(refresh).toHaveBeenCalled()
  })

  it('muestra error al resolver y permite cancelar el formulario', async () => {
    mockResolveDispute.mockResolvedValue({ error: 'Resolucion rechazada' })

    render(<DisputeActions disputeId="dispute-1" status="investigating" />)
    fireEvent.click(screen.getByRole('button', { name: 'Resolver' }))
    expect(screen.getByRole('button', { name: 'Confirmar resolución' })).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText('Notas de resolución…'), { target: { value: 'Se devuelve saldo.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar resolución' }))

    expect(await screen.findByText('Resolucion rechazada')).toBeInTheDocument()
    expect(mockResolveDispute).toHaveBeenCalledWith('dispute-1', 'Se devuelve saldo.')
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByRole('button', { name: 'Resolver' })).toBeInTheDocument()
  })

  it('descarta disputa con notas y refresca la pagina', async () => {
    mockDismissDispute.mockResolvedValue({ data: { id: 'dispute-1', status: 'dismissed' } })

    render(<DisputeActions disputeId="dispute-1" status="investigating" />)
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    fireEvent.change(screen.getByPlaceholderText('Razón del descarte…'), { target: { value: 'Sin impacto confirmado.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar descarte' }))

    await waitFor(() => expect(mockDismissDispute).toHaveBeenCalledWith('dispute-1', 'Sin impacto confirmado.'))
    expect(refresh).toHaveBeenCalled()
  })
})
