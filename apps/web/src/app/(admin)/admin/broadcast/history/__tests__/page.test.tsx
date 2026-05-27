import { render, screen, waitFor } from '@testing-library/react'
import BroadcastHistoryPage from '../page'
import { getBroadcastHistory } from '@/app/actions/admin-broadcast'

jest.mock('@/app/actions/admin-broadcast', () => ({
  getBroadcastHistory: jest.fn(),
}))

const mockGetBroadcastHistory = getBroadcastHistory as jest.MockedFunction<typeof getBroadcastHistory>

describe('BroadcastHistoryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-25T12:00:00.000Z').getTime())
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('muestra loading y luego historial con estadisticas de envio', async () => {
    mockGetBroadcastHistory.mockResolvedValue([
      {
        id: 'broadcast-1',
        type: 'maintenance',
        title: 'Mantenimiento programado',
        body: 'El sistema se pausara esta noche.',
        created_at: '2026-05-25T11:30:00.000Z',
        audience_count: 20,
        read_count: 12,
        push_sent_count: 18,
        push_failed_count: 2,
      },
      {
        id: 'broadcast-2',
        type: 'unknown',
        title: 'Aviso general',
        body: 'Mensaje para todos.',
        created_at: '2026-05-25T10:00:00.000Z',
        audience_count: 5,
        read_count: 5,
        push_sent_count: 5,
        push_failed_count: 0,
      },
    ])

    render(<BroadcastHistoryPage />)

    expect(screen.getByRole('heading', { name: /historial de broadcasts/i })).toBeInTheDocument()
    await waitFor(() => expect(mockGetBroadcastHistory).toHaveBeenCalledWith(50))
    expect(await screen.findByText('Mantenimiento programado')).toBeInTheDocument()
    expect(screen.getByText('hace 30m')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('18')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Aviso general')).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('muestra empty state cuando no hay broadcasts', async () => {
    mockGetBroadcastHistory.mockResolvedValue([])

    render(<BroadcastHistoryPage />)

    expect(await screen.findByText('No hay broadcasts enviados todavía.')).toBeInTheDocument()
  })

  it('registra errores y termina el estado de carga', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockGetBroadcastHistory.mockRejectedValue(new Error('fallo historial'))

    render(<BroadcastHistoryPage />)

    expect(await screen.findByText('No hay broadcasts enviados todavía.')).toBeInTheDocument()
    expect(consoleError).toHaveBeenCalledWith(expect.any(Error))
  })
})
