import { act } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ServerLogPage from '../page'
import { getServerAlerts, resolveAlert, type ServerAlert } from '@/app/actions/admin-server-alerts'
import { createClient } from '@/utils/supabase/client'

jest.mock('@/app/actions/admin-server-alerts', () => ({
  getServerAlerts: jest.fn(),
  resolveAlert: jest.fn(),
}))

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}))

const mockGetServerAlerts = getServerAlerts as jest.MockedFunction<typeof getServerAlerts>
const mockResolveAlert = resolveAlert as jest.MockedFunction<typeof resolveAlert>
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

const removeChannel = jest.fn()
let realtimeHandler: ((payload: { new: ServerAlert }) => void) | undefined

const alerts: ServerAlert[] = [
  {
    id: 'alert-critical',
    severity: 'critical',
    category: 'collusion',
    title: 'Patron sospechoso',
    message: 'Dos jugadores comparten dispositivo.',
    metadata: {},
    room_id: 'room-1',
    game_id: 'game-abcdefgh1234',
    player_id: 'player-1',
    resolved: false,
    resolved_at: null,
    resolved_by: null,
    created_at: '2026-05-25T10:00:00.000Z',
  },
  {
    id: 'alert-warning',
    severity: 'warning',
    category: 'identity',
    title: 'Documento pendiente',
    message: null,
    metadata: {},
    room_id: null,
    game_id: null,
    player_id: null,
    resolved: false,
    resolved_at: null,
    resolved_by: null,
    created_at: '2026-05-25T09:00:00.000Z',
  },
  {
    id: 'alert-resolved',
    severity: 'info',
    category: 'system',
    title: 'Heartbeat recuperado',
    message: 'El servicio volvio a responder.',
    metadata: {},
    room_id: null,
    game_id: null,
    player_id: null,
    resolved: true,
    resolved_at: '2026-05-25T09:10:00.000Z',
    resolved_by: 'admin-1',
    created_at: '2026-05-25T08:00:00.000Z',
  },
]

function setupRealtimeClient() {
  mockCreateClient.mockReturnValue({
    channel: jest.fn(() => ({
      on: jest.fn((_event, _config, handler) => {
        realtimeHandler = handler
        return { subscribe: jest.fn(() => 'server-alerts-channel') }
      }),
    })),
    removeChannel,
  } as unknown as ReturnType<typeof createClient>)
}

describe('ServerLogPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    realtimeHandler = undefined
    setupRealtimeClient()
    mockGetServerAlerts.mockResolvedValue(alerts)
    mockResolveAlert.mockResolvedValue()
  })

  it('carga alertas no resueltas con categorias, contador y sala/juego', async () => {
    render(<ServerLogPage />)

    expect(screen.getByText('Cargando alertas del servidor...')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: /log del servidor/i })).toBeInTheDocument()
    expect(mockGetServerAlerts).toHaveBeenCalledWith(200)
    expect(screen.getByText('Patron sospechoso')).toBeInTheDocument()
    expect(screen.getByText('Documento pendiente')).toBeInTheDocument()
    expect(screen.queryByText('Heartbeat recuperado')).not.toBeInTheDocument()
    expect(screen.getAllByText('CRÍTICO').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Identidad').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText(/Sala: room-1/)).toHaveTextContent('Juego: game-abc...')
    expect(screen.getByText('2 de 3')).toBeInTheDocument()
  })

  it('filtra por severidad, categoria, busqueda y muestra resueltas', async () => {
    render(<ServerLogPage />)
    await screen.findByText('Patron sospechoso')

    fireEvent.click(screen.getByRole('button', { name: 'CRÍTICO' }))
    expect(screen.getByText('Patron sospechoso')).toBeInTheDocument()
    expect(screen.queryByText('Documento pendiente')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Todos' }))
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'identity' } })
    expect(screen.getByText('Documento pendiente')).toBeInTheDocument()
    expect(screen.queryByText('Patron sospechoso')).not.toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'all' } })
    fireEvent.change(screen.getByPlaceholderText('Buscar en alertas...'), { target: { value: 'dispositivo' } })
    expect(screen.getByText('Patron sospechoso')).toBeInTheDocument()
    expect(screen.queryByText('Documento pendiente')).not.toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Buscar en alertas...'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /mostrar resueltas/i }))
    expect(screen.getByText('Heartbeat recuperado')).toBeInTheDocument()
    expect(screen.getByText('3 de 3')).toBeInTheDocument()
  })

  it('busca por id, juego, jugador y categoría', async () => {
    render(<ServerLogPage />)
    await screen.findByText('Patron sospechoso')
    const search = screen.getByPlaceholderText('Buscar en alertas...')

    fireEvent.change(search, { target: { value: 'alert-critical' } })
    expect(screen.getByText('Patron sospechoso')).toBeInTheDocument()
    fireEvent.change(search, { target: { value: 'game-abcdefgh1234' } })
    expect(screen.getByText('Patron sospechoso')).toBeInTheDocument()
    fireEvent.change(search, { target: { value: 'player-1' } })
    expect(screen.getByText('Patron sospechoso')).toBeInTheDocument()
    fireEvent.change(search, { target: { value: 'collusion' } })
    expect(screen.getByText('Patron sospechoso')).toBeInTheDocument()
  })

  it('usa fallbacks para severidad y categoría desconocidas', async () => {
    const unknownAlert = {
      ...alerts[0],
      id: 'alert-unknown',
      severity: 'notice',
      category: 'new-category',
      title: 'Alerta futura',
    } as unknown as ServerAlert
    mockGetServerAlerts.mockResolvedValueOnce([unknownAlert])

    render(<ServerLogPage />)

    expect(await screen.findByText('Alerta futura')).toBeInTheDocument()
    expect(screen.getAllByText('INFO').length).toBeGreaterThan(1)
    expect(screen.getAllByText('new-category').length).toBeGreaterThan(1)
  })

  it('resuelve una alerta y la oculta del listado pendiente', async () => {
    render(<ServerLogPage />)
    await screen.findByText('Patron sospechoso')

    fireEvent.click(screen.getAllByRole('button', { name: /resolver/i })[0])

    await waitFor(() => expect(mockResolveAlert).toHaveBeenCalledWith('alert-critical'))
    await waitFor(() => expect(screen.queryByText('Patron sospechoso')).not.toBeInTheDocument())
    expect(screen.getByText('1 de 3')).toBeInTheDocument()
  })

  it('incorpora alertas realtime y limpia el canal al desmontar', async () => {
    const { unmount } = render(<ServerLogPage />)
    await waitFor(() => expect(realtimeHandler).toBeDefined())

    act(() => {
      realtimeHandler?.({
        new: {
          id: 'alert-live',
          severity: 'info',
          category: 'refund',
          title: 'Reembolso generado',
          message: 'Se creo un ajuste automatico.',
          metadata: {},
          room_id: null,
          game_id: null,
          player_id: null,
          resolved: false,
          resolved_at: null,
          resolved_by: null,
          created_at: '2026-05-25T12:00:00.000Z',
        },
      })
    })

    expect(screen.getByText('Reembolso generado')).toBeInTheDocument()
    expect(screen.getAllByText('Reembolso').length).toBeGreaterThanOrEqual(2)

    unmount()
    expect(removeChannel).toHaveBeenCalledWith('server-alerts-channel')
  })

  it('oculta una alerta realtime resuelta hasta activar el historial', async () => {
    render(<ServerLogPage />)
    await waitFor(() => expect(realtimeHandler).toBeDefined())

    act(() => {
      realtimeHandler?.({
        new: {
          ...alerts[2],
          id: 'alert-live-resolved',
          title: 'Alerta ya resuelta',
        },
      })
    })

    expect(screen.queryByText('Alerta ya resuelta')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /mostrar resueltas/i }))
    expect(screen.getByText('Alerta ya resuelta')).toBeInTheDocument()
  })

  it('muestra empty state si la carga falla', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockGetServerAlerts.mockRejectedValue(new Error('server offline'))

    render(<ServerLogPage />)

    expect(await screen.findByText('Sin alertas pendientes')).toBeInTheDocument()
    expect(consoleError).toHaveBeenCalledWith('Error loading alerts:', expect.any(Error))
  })
})
