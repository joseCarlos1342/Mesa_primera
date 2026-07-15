import { render, screen } from '@testing-library/react'
import AdminRecoveryPage from '../page'
import { getAdminRecoveryIncidents } from '@/app/actions/admin-recovery'

jest.mock('@/app/actions/admin-recovery', () => ({
  getAdminRecoveryIncidents: jest.fn(),
}))

const mockGetAdminRecoveryIncidents = getAdminRecoveryIncidents as jest.MockedFunction<typeof getAdminRecoveryIncidents>

describe('AdminRecoveryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('muestra únicamente el historial terminal y el progreso agregado de refunds', async () => {
    mockGetAdminRecoveryIncidents.mockResolvedValue([{
      gameId: 'game-1',
      roomId: 'room-original',
      cause: 'process_restart',
      detectedAt: '2026-07-13T10:00:00.000Z',
      resolvedAt: '2026-07-13T10:03:00.000Z',
      status: 'cancelled_crash',
      resolutionReason: 'recovery_deadline_expired',
      completedRefunds: 2,
      totalRefunds: 3,
    }])

    render(await AdminRecoveryPage())

    expect(screen.getByRole('heading', { name: /incidentes de recuperación/i })).toBeInTheDocument()
    expect(screen.getByText('room-original')).toBeInTheDocument()
    // El status se muestra con label legible en español
    expect(screen.getByText(/cancelado por caída/i)).toBeInTheDocument()
    // El número de completados se renderiza en un elemento tabular-nums
    const completedNumber = screen.getByText('2', { selector: 'span.font-mono.tabular-nums' })
    expect(completedNumber).toBeInTheDocument()
    expect(screen.getByText('recovery_deadline_expired')).toBeInTheDocument()
    expect(screen.queryByText(/checkpoint|roster|apuestas individuales|recovered_room_id/i)).not.toBeInTheDocument()
  })

  it('muestra contador total de incidentes y resumen de refunds en el header', async () => {
    mockGetAdminRecoveryIncidents.mockResolvedValue([
      {
        gameId: 'g-1',
        roomId: 'r-1',
        cause: 'oom_pique',
        detectedAt: '2026-07-13T10:00:00.000Z',
        resolvedAt: '2026-07-13T10:10:00.000Z',
        status: 'cancelled_crash',
        resolutionReason: 'motivo uno',
        completedRefunds: 3,
        totalRefunds: 3,
      },
      {
        gameId: 'g-2',
        roomId: 'r-2',
        cause: 'redis_disconnect',
        detectedAt: '2026-07-12T08:00:00.000Z',
        resolvedAt: '2026-07-12T08:20:00.000Z',
        status: 'manual_review',
        resolutionReason: 'motivo dos',
        completedRefunds: 2,
        totalRefunds: 4,
      },
    ])

    render(await AdminRecoveryPage())

    // 2 incidentes, 5 refunds completados de 7 totales
    expect(screen.getByText(/incidentes terminales/i)).toBeInTheDocument()
    // El número de incidentes debe estar en la cabecera, no en las cards
    const headers = screen.getAllByText('2', { selector: 'span,p.font-mono.tabular-nums' })
    expect(headers.length).toBeGreaterThan(0)
    expect(screen.getByText('5 / 7')).toBeInTheDocument()
    expect(screen.getAllByText(/refunds completados/i).length).toBeGreaterThanOrEqual(1)
  })

  it('aplica color semántico danger al badge cancelled_crash y warning a manual_review', async () => {
    mockGetAdminRecoveryIncidents.mockResolvedValue([
      {
        gameId: 'g-1', roomId: 'r-1', cause: 'oom',
        detectedAt: '2026-07-13T10:00:00.000Z', resolvedAt: '2026-07-13T10:10:00.000Z',
        status: 'cancelled_crash', resolutionReason: 'r1',
        completedRefunds: 1, totalRefunds: 1,
      },
      {
        gameId: 'g-2', roomId: 'r-2', cause: 'review',
        detectedAt: '2026-07-12T08:00:00.000Z', resolvedAt: '2026-07-12T08:20:00.000Z',
        status: 'manual_review', resolutionReason: 'r2',
        completedRefunds: 1, totalRefunds: 1,
      },
    ])

    render(await AdminRecoveryPage())

    const crashBadge = screen.getByText(/cancelado por caída/i).closest('span')
    expect(crashBadge?.className ?? '').toMatch(/bg-danger|danger\/10/)
    const reviewBadge = screen.getByText(/revisión manual/i).closest('span')
    expect(reviewBadge?.className ?? '').toMatch(/bg-warning|warning\/10/)
  })

  it('renderiza la causa como chip secundario, no como texto crudo', async () => {
    mockGetAdminRecoveryIncidents.mockResolvedValue([{
      gameId: 'game-1', roomId: 'room-1', cause: 'oom_pique',
      detectedAt: '2026-07-13T10:00:00.000Z', resolvedAt: '2026-07-13T10:03:00.000Z',
      status: 'cancelled_crash', resolutionReason: 'motivo',
      completedRefunds: 1, totalRefunds: 1,
    }])

    render(await AdminRecoveryPage())

    // La causa debe estar presente como texto, pero dentro de un chip (rounded-full)
    const causeChip = screen.getByText('oom_pique').closest('span')
    expect(causeChip?.className ?? '').toMatch(/rounded-full/)
  })

  it('explica cuando no hay incidentes terminales visibles', async () => {
    mockGetAdminRecoveryIncidents.mockResolvedValue([])

    render(await AdminRecoveryPage())

    expect(screen.getByText(/no hay incidentes terminales visibles/i)).toBeInTheDocument()
  })

  it('muestra un error de carga sin revelar datos internos', async () => {
    mockGetAdminRecoveryIncidents.mockRejectedValue(new Error('No se pudo cargar el historial de recuperación'))

    render(await AdminRecoveryPage())

    expect(screen.getByRole('heading', { name: /no se pudo cargar el historial/i })).toBeInTheDocument()
    expect(screen.getByText(/vuelve a intentarlo en unos minutos/i)).toBeInTheDocument()
  })
})
