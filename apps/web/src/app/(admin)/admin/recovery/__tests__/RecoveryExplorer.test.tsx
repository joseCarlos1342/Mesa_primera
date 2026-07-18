import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { acknowledgeRecoveryIncident } from '@/app/actions/admin-recovery'
import { RecoveryExplorer } from '../RecoveryExplorer'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/app/actions/admin-recovery', () => ({
  acknowledgeRecoveryIncident: jest.fn(),
}))

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockAcknowledgeRecoveryIncident = acknowledgeRecoveryIncident as jest.MockedFunction<typeof acknowledgeRecoveryIncident>

const page = {
  incidents: [
    {
      gameId: '00000000-0000-4000-8000-000000000111',
      roomId: 'mesa-vip-01',
      cause: 'process_restart',
      detectedAt: '2026-07-17T15:00:00.000Z',
      resolvedAt: '2026-07-17T15:03:00.000Z',
      status: 'manual_review' as const,
      resolutionReason: 'requires_review',
      completedRefunds: 1,
      totalRefunds: 1,
      replayAvailable: true,
    },
    {
      gameId: '00000000-0000-4000-8000-000000000112',
      roomId: 'mesa-sin-replay',
      cause: 'process_restart',
      detectedAt: '2026-07-16T15:00:00.000Z',
      resolvedAt: '2026-07-16T15:03:00.000Z',
      status: 'cancelled_crash' as const,
      resolutionReason: 'recovery_deadline_expired',
      completedRefunds: 0,
      totalRefunds: 0,
      replayAvailable: false,
    },
  ],
  total: 2,
  nextCursor: {
    detectedAt: '2026-07-16T15:00:00.000Z',
    gameId: '00000000-0000-4000-8000-000000000112',
  },
}

describe('RecoveryExplorer', () => {
  const push = jest.fn()
  const refresh = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({ push, refresh } as unknown as ReturnType<typeof useRouter>)
  })

  it('envía los filtros de búsqueda a la URL sin cargar todo el historial en cliente', () => {
    render(<RecoveryExplorer page={page} filters={{}} />)

    fireEvent.change(screen.getByRole('searchbox', { name: /buscar sala o juego/i }), { target: { value: ' mesa-vip ' } })
    fireEvent.change(screen.getByRole('combobox', { name: /estado/i }), { target: { value: 'manual_review' } })
    fireEvent.click(screen.getByRole('button', { name: /aplicar filtros/i }))

    expect(push).toHaveBeenCalledWith('/admin/recovery?status=manual_review&q=mesa-vip')
  })

  it('ofrece replay solo cuando existe y conserva el cursor para la siguiente página', () => {
    render(<RecoveryExplorer page={page} filters={{ status: 'manual_review' }} />)

    expect(screen.getByRole('link', { name: /ver auditoría y replay/i })).toHaveAttribute(
      'href',
      '/admin/replays/00000000-0000-4000-8000-000000000111'
    )
    expect(screen.getByText('Replay no disponible')).toBeInTheDocument()
    const nextPageHref = screen.getByRole('link', { name: /siguiente página/i }).getAttribute('href')
    expect(nextPageHref).toContain('cursorDetectedAt=2026-07-16T15%3A00%3A00.000Z')
    expect(nextPageHref).toContain('cursorGameId=00000000-0000-4000-8000-000000000112')
  })

  it('sincroniza los campos cuando se limpian filtros desde la URL', () => {
    const { rerender } = render(<RecoveryExplorer page={page} filters={{ query: 'mesa-vip', status: 'manual_review' }} />)

    expect(screen.getByRole('searchbox', { name: /buscar sala o juego/i })).toHaveValue('mesa-vip')
    expect(screen.getByRole('combobox', { name: /estado/i })).toHaveValue('manual_review')

    rerender(<RecoveryExplorer page={page} filters={{}} />)

    expect(screen.getByRole('searchbox', { name: /buscar sala o juego/i })).toHaveValue('')
    expect(screen.getByRole('combobox', { name: /estado/i })).toHaveValue('')
  })

  it('limita la barra de refunds a un porcentaje accesible', () => {
    render(<RecoveryExplorer page={{ ...page, incidents: [{ ...page.incidents[0], completedRefunds: 7, totalRefunds: 2 }] }} filters={{}} />)

    expect(screen.getByRole('progressbar', { name: /refunds completados/i })).toHaveAttribute('aria-valuenow', '100')
  })

  it('muestra la acción de reconocimiento solo para manual_review pendiente', () => {
    render(<RecoveryExplorer page={{
      ...page,
      incidents: [{
        ...page.incidents[0],
        incidentId: '00000000-0000-4000-8000-000000000131',
        acknowledgedAt: null,
      }],
    }} filters={{}} />)

    expect(screen.getByRole('button', { name: /marcar como revisado/i })).toBeInTheDocument()
  })

  it('refresca el historial después de reconocer un incidente', async () => {
    mockAcknowledgeRecoveryIncident.mockResolvedValue({
      data: {
        incidentId: '00000000-0000-4000-8000-000000000131',
        acknowledgedAt: '2026-07-18T03:00:00.000Z',
        alreadyAcknowledged: false,
      },
    })
    render(<RecoveryExplorer page={{
      ...page,
      incidents: [{
        ...page.incidents[0],
        incidentId: '00000000-0000-4000-8000-000000000131',
        acknowledgedAt: null,
      }],
    }} filters={{}} />)

    fireEvent.click(screen.getByRole('button', { name: /marcar como revisado/i }))

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    expect(mockAcknowledgeRecoveryIncident).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000131')
  })

  it('muestra el error de dominio y no refresca si el reconocimiento falla', async () => {
    mockAcknowledgeRecoveryIncident.mockResolvedValue({ error: 'No fue posible reconocer el incidente' })
    render(<RecoveryExplorer page={{
      ...page,
      incidents: [{
        ...page.incidents[0],
        incidentId: '00000000-0000-4000-8000-000000000131',
        acknowledgedAt: null,
      }],
    }} filters={{}} />)

    fireEvent.click(screen.getByRole('button', { name: /marcar como revisado/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible reconocer el incidente')
    expect(refresh).not.toHaveBeenCalled()
  })

  it('enlaza al detalle de refunds solo cuando hay refunds incompletos', () => {
    render(<RecoveryExplorer page={{
      ...page,
      incidents: [{ ...page.incidents[0], completedRefunds: 0, totalRefunds: 1 }],
    }} filters={{}} />)

    expect(screen.getByRole('link', { name: /ver refunds afectados/i })).toHaveAttribute(
      'href',
      '/admin/recovery/00000000-0000-4000-8000-000000000111/refunds'
    )
  })
})
