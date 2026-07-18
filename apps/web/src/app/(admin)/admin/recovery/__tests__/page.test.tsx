import { render, screen } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import AdminRecoveryPage from '../page'
import { getAdminRecoveryIncidentPage, type AdminRecoveryIncident } from '@/app/actions/admin-recovery'

jest.mock('@/app/actions/admin-recovery', () => ({
  getAdminRecoveryIncidentPage: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

const mockGetAdminRecoveryIncidentPage = getAdminRecoveryIncidentPage as jest.MockedFunction<typeof getAdminRecoveryIncidentPage>
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

const incident: AdminRecoveryIncident = {
  gameId: '00000000-0000-4000-8000-000000000101',
  roomId: 'room-original',
  cause: 'process_restart',
  detectedAt: '2026-07-13T10:00:00.000Z',
  resolvedAt: '2026-07-13T10:03:00.000Z',
  status: 'cancelled_crash' as const,
  resolutionReason: 'recovery_deadline_expired',
  completedRefunds: 2,
  totalRefunds: 3,
  replayAvailable: false,
}

function page(incidents = [incident]) {
  return { incidents, total: incidents.length, nextCursor: null }
}

describe('AdminRecoveryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({ push: jest.fn() } as unknown as ReturnType<typeof useRouter>)
  })

  it('muestra únicamente el historial terminal y el progreso agregado de refunds', async () => {
    mockGetAdminRecoveryIncidentPage.mockResolvedValue(page())

    render(await AdminRecoveryPage())

    expect(screen.getByRole('heading', { name: /incidentes de recuperación/i })).toBeInTheDocument()
    expect(screen.getByText('room-original')).toBeInTheDocument()
    expect(screen.getAllByText(/cancelado por caída/i).at(-1)).toBeInTheDocument()
    expect(screen.getByText('2', { selector: 'span.font-mono.tabular-nums' })).toBeInTheDocument()
    expect(screen.getByText('recovery_deadline_expired')).toBeInTheDocument()
    expect(screen.queryByText(/checkpoint|roster|apuestas individuales|recovered_room_id/i)).not.toBeInTheDocument()
  })

  it('muestra el total filtrado y los refunds de la página', async () => {
    mockGetAdminRecoveryIncidentPage.mockResolvedValue(page([
      incident,
      {
        ...incident,
        gameId: '00000000-0000-4000-8000-000000000102',
        roomId: 'room-second',
        status: 'manual_review',
        completedRefunds: 3,
        totalRefunds: 4,
      },
    ]))

    render(await AdminRecoveryPage())

    expect(screen.getByText(/coincidencias/i)).toBeInTheDocument()
    expect(screen.getByText('5 / 7')).toBeInTheDocument()
    expect(screen.getAllByText(/refunds completados/i).length).toBeGreaterThanOrEqual(1)
  })

  it('mantiene el color semántico de cada estado', async () => {
    mockGetAdminRecoveryIncidentPage.mockResolvedValue(page([
      incident,
      { ...incident, gameId: '00000000-0000-4000-8000-000000000102', status: 'manual_review' },
    ]))

    render(await AdminRecoveryPage())

    expect(screen.getAllByText(/cancelado por caída/i).at(-1)?.closest('span')?.className ?? '').toMatch(/bg-danger|danger\/10/)
    expect(screen.getAllByText(/revisión manual/i).at(-1)?.closest('span')?.className ?? '').toMatch(/bg-warning|warning\/10/)
  })

  it('explica cuando no hay incidentes terminales visibles', async () => {
    mockGetAdminRecoveryIncidentPage.mockResolvedValue(page([]))

    render(await AdminRecoveryPage())

    expect(screen.getByText(/no hay incidentes terminales visibles/i)).toBeInTheDocument()
  })

  it('muestra un error de carga sin revelar datos internos', async () => {
    mockGetAdminRecoveryIncidentPage.mockRejectedValue(new Error('detalle interno'))

    render(await AdminRecoveryPage())

    expect(screen.getByRole('heading', { name: /no se pudo cargar el historial/i })).toBeInTheDocument()
    expect(screen.getByText(/vuelve a intentarlo en unos minutos/i)).toBeInTheDocument()
  })

  it('traduce los search params a filtros del explorador paginado', async () => {
    mockGetAdminRecoveryIncidentPage.mockResolvedValue(page([]))

    render(await AdminRecoveryPage({
      searchParams: Promise.resolve({
        status: 'manual_review',
        cause: 'process_restart',
        q: 'mesa-vip',
        from: '2026-07-01',
        to: '2026-07-17',
        cursorDetectedAt: '2026-07-16T15:00:00.000Z',
        cursorGameId: '00000000-0000-4000-8000-000000000110',
      }),
    }))

    expect(mockGetAdminRecoveryIncidentPage).toHaveBeenCalledWith({
      status: 'manual_review',
      cause: 'process_restart',
      query: 'mesa-vip',
      from: '2026-07-01',
      to: '2026-07-17',
      cursor: {
        detectedAt: '2026-07-16T15:00:00.000Z',
        gameId: '00000000-0000-4000-8000-000000000110',
      },
    })
  })
})
