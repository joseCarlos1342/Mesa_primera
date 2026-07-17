import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import DisputeDetailPage from '../page'
import { DisputeActions } from '../dispute-actions'
import {
  approveDisputeCompensation,
  cancelDisputeCompensation,
  dismissDispute,
  getDispute,
  proposeDisputeCompensation,
  resolveDispute,
  startDispute,
} from '@/app/actions/admin-disputes'
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
  startDispute: jest.fn(),
  resolveDispute: jest.fn(),
  dismissDispute: jest.fn(),
  proposeDisputeCompensation: jest.fn(),
  approveDisputeCompensation: jest.fn(),
  cancelDisputeCompensation: jest.fn(),
}))

const mockGetDispute = getDispute as jest.MockedFunction<typeof getDispute>
const mockStartDispute = startDispute as jest.MockedFunction<typeof startDispute>
const mockResolveDispute = resolveDispute as jest.MockedFunction<typeof resolveDispute>
const mockDismissDispute = dismissDispute as jest.MockedFunction<typeof dismissDispute>
const mockProposeCompensation = proposeDisputeCompensation as jest.MockedFunction<typeof proposeDisputeCompensation>
const mockApproveCompensation = approveDisputeCompensation as jest.MockedFunction<typeof approveDisputeCompensation>
const mockCancelCompensation = cancelDisputeCompensation as jest.MockedFunction<typeof cancelDisputeCompensation>

function makeDispute(overrides: Partial<AdminDisputeCase> = {}): AdminDisputeCase {
  return {
    id: 'dispute-1',
    status: 'open',
    priority: 'critical',
    investigation_type: 'collusion',
    source: 'server_alert',
    title: 'Cobro sospechoso',
    description: 'Jugador reporta una mano irregular.',
    opened_by: 'admin-1',
    assigned_to: null,
    support_ticket_id: 'ticket-1',
    evidence_snapshot: [
      { entity: 'ledger', entity_id: 'ledger-1', label: 'Movimiento de entrada' },
      { entity: 'replay', entity_id: 'replay-1', target_id: 'game-1', label: 'Replay de la mano' },
      { entity: 'alert', entity_id: 'alert-1', label: 'Alerta de servidor' },
    ],
    resolution_notes: null,
    resolved_at: null,
    resolved_by: null,
    subject_user_ids: ['11111111-1111-4111-8111-111111111111'],
    game_id: 'game-1',
    room_id: 'room-1',
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
    expect(screen.getByRole('link', { name: /volver a investigaciones/i })).toHaveAttribute('href', '/admin/disputes')
    expect(screen.getByRole('heading', { name: 'Cobro sospechoso' })).toBeInTheDocument()
    expect(screen.getByText('open')).toBeInTheDocument()
    expect(screen.getByText('critical')).toBeInTheDocument()
    expect(screen.getByText('collusion')).toBeInTheDocument()
    expect(screen.getByText('server_alert')).toBeInTheDocument()
    expect(screen.getByText('Jugador reporta una mano irregular.')).toBeInTheDocument()
    expect(screen.getByText('Evidencia vinculada (3)')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ledger movimiento de entrada ledger-1/i })).toHaveAttribute('href', '/admin/ledger?q=ledger-1')
    expect(screen.getByRole('link', { name: /replay replay de la mano replay-1/i })).toHaveAttribute('href', '/admin/replays/game-1')
    expect(screen.getByRole('link', { name: /alert alerta de servidor alert-1/i })).toHaveAttribute('href', '/admin/server-log?q=alert-1')
    expect(screen.getByRole('link', { name: 'ticket-1' })).toHaveAttribute('href', '/admin/support?ticket=ticket-1')
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

    expect(screen.getByRole('link', { name: /deposit deposito sospechoso dep-1/i })).toHaveAttribute('href', '/admin/deposits?q=dep-1')
    expect(screen.getByRole('link', { name: /withdrawal retiro investigado wd-1/i })).toHaveAttribute('href', '/admin/withdrawals?q=wd-1')
    expect(screen.getByRole('link', { name: /user perfil del jugador user-1/i })).toHaveAttribute('href', '/admin/users?q=user-1')
    expect(screen.getByRole('link', { name: /ticket ticket relacionado ticket-2/i })).toHaveAttribute('href', '/admin/support?ticket=ticket-2')
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

  it('inicia una investigación abierta con el admin actual', async () => {
    mockStartDispute.mockResolvedValue({ data: { id: 'dispute-1', status: 'investigating', assigned_to: 'admin-1' } })

    render(<DisputeActions disputeId="dispute-1" status="open" />)

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar investigación' }))

    await waitFor(() => expect(mockStartDispute).toHaveBeenCalledWith('dispute-1'))
    expect(refresh).toHaveBeenCalled()
  })

  it('muestra error al resolver y permite cancelar el formulario', async () => {
    mockResolveDispute.mockResolvedValue({ error: 'Resolucion rechazada' })

    render(<DisputeActions disputeId="dispute-1" status="investigating" subjectUserIds={['11111111-1111-4111-8111-111111111111']} />)
    fireEvent.click(screen.getByRole('button', { name: 'Resolver' }))
    expect(screen.getByRole('button', { name: 'Confirmar resolución' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Resultado'), { target: { value: 'warning' } })
    fireEvent.change(screen.getByPlaceholderText('Notas de resolución…'), { target: { value: 'Se devuelve saldo.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar resolución' }))

    expect(await screen.findByText('Resolucion rechazada')).toBeInTheDocument()
    expect(mockResolveDispute).toHaveBeenCalledWith('dispute-1', {
      outcome: 'warning',
      notes: 'Se devuelve saldo.',
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByRole('button', { name: 'Resolver' })).toBeInTheDocument()
  })

  it('descarta disputa con notas y refresca la pagina', async () => {
    mockDismissDispute.mockResolvedValue({ data: { id: 'dispute-1', status: 'dismissed' } })

    render(<DisputeActions disputeId="dispute-1" status="investigating" subjectUserIds={['11111111-1111-4111-8111-111111111111']} />)
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    fireEvent.change(screen.getByPlaceholderText('Razón del descarte…'), { target: { value: 'Sin impacto confirmado.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar descarte' }))

    await waitFor(() => expect(mockDismissDispute).toHaveBeenCalledWith('dispute-1', 'Sin impacto confirmado.'))
    expect(refresh).toHaveBeenCalled()
  })

  it('propone una compensación estructurada desde una investigación activa', async () => {
    mockProposeCompensation.mockResolvedValue({ data: { id: 'dispute-1', compensation_status: 'proposed' } })
    render(<DisputeActions disputeId="dispute-1" status="investigating" subjectUserIds={['11111111-1111-4111-8111-111111111111']} />)

    fireEvent.click(screen.getByRole('button', { name: 'Proponer compensación' }))
    fireEvent.change(screen.getByLabelText('Jugador beneficiario'), { target: { value: '11111111-1111-4111-8111-111111111111' } })
    fireEvent.change(screen.getByLabelText('Monto en COP'), { target: { value: '1000' } })
    fireEvent.change(screen.getByLabelText('Motivo de compensación'), { target: { value: 'Compensación por una mano anulada tras confirmar colusión.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar propuesta' }))

    await waitFor(() => expect(mockProposeCompensation).toHaveBeenCalledWith('dispute-1', {
      userId: '11111111-1111-4111-8111-111111111111',
      amountCents: 100000,
      reason: 'Compensación por una mano anulada tras confirmar colusión.',
    }))
  })

  it('exige confirmación explícita antes de acreditar una compensación propuesta', async () => {
    mockApproveCompensation.mockResolvedValue({ data: { id: 'dispute-1', status: 'resolved', ledger_id: 'ledger-1' } })
    render(<DisputeActions disputeId="dispute-1" status="investigating" compensationStatus="proposed" compensationUserId="11111111-1111-4111-8111-111111111111" compensationAmountCents={100000} compensationReason="Compensación por colusión confirmada." />)

    fireEvent.click(screen.getByRole('button', { name: 'Aprobar y acreditar' }))
    expect(screen.getByText(/esta operación crea un movimiento inmutable/i)).toBeInTheDocument()
    expect(screen.getByText('11111111-1111-4111-8111-111111111111')).toBeInTheDocument()
    expect(screen.getByText(/1\.000/)).toBeInTheDocument()
    expect(screen.getByText('Compensación por colusión confirmada.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar acreditación' }))

    await waitFor(() => expect(mockApproveCompensation).toHaveBeenCalledWith('dispute-1'))
    expect(refresh).toHaveBeenCalled()
  })

  it('permite cancelar una propuesta equivocada', async () => {
    mockCancelCompensation.mockResolvedValue({ data: { id: 'dispute-1', status: 'investigating' } })
    render(<DisputeActions disputeId="dispute-1" status="investigating" compensationStatus="proposed" />)

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar propuesta' }))
    fireEvent.change(screen.getByLabelText('Motivo de cancelación'), { target: { value: 'El beneficiario seleccionado era incorrecto.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }))

    await waitFor(() => expect(mockCancelCompensation).toHaveBeenCalledWith('dispute-1', 'El beneficiario seleccionado era incorrecto.'))
  })
})
