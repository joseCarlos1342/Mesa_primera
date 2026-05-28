import { act } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import AdminAlertsPage from '../page'
import { createClient } from '@/utils/supabase/client'
import { client as colyseusClient } from '@/lib/colyseus'

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/colyseus', () => ({
  client: {
    http: {
      get: jest.fn(),
    },
  },
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
}))

type HelpRequest = {
  id: string
  user_id: string
  room_id: string
  reason: string
  message: string | null
  status: string
  created_at: string
  resolved_at: string | null
  resolved_by: string | null
  admin_notes: string | null
}

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockRoomList = colyseusClient.http.get as jest.MockedFunction<typeof colyseusClient.http.get>

const removeChannel = jest.fn()
const update = jest.fn()
let helpRequests: HelpRequest[] = []
let profiles: Array<{ id: string; username: string }> = []
let realtimeHandler: ((payload: { eventType: string; new: Record<string, unknown> }) => Promise<void>) | undefined

function makeHelpQuery() {
  const query: Record<string, unknown> = {
    select: jest.fn(() => query),
    order: jest.fn(() => query),
    limit: jest.fn(() => query),
    in: jest.fn(() => query),
    then: (resolve: (value: { data: HelpRequest[] }) => void) => Promise.resolve({ data: helpRequests }).then(resolve),
  }
  return query
}

function makeProfilesQuery() {
  const query: Record<string, unknown> = {
    select: jest.fn(() => query),
    in: jest.fn(() => Promise.resolve({ data: profiles })),
    eq: jest.fn(() => query),
    single: jest.fn(() => Promise.resolve({ data: profiles[0] ?? null })),
  }
  return query
}

function makeSupabaseClient() {
  return {
    from: jest.fn((table: string) => {
      if (table === 'profiles') return makeProfilesQuery()
      return {
        ...makeHelpQuery(),
        update,
      }
    }),
    channel: jest.fn(() => ({
      on: jest.fn((_event, _config, handler) => {
        realtimeHandler = handler
        return { subscribe: jest.fn(() => 'alerts-channel') }
      }),
    })),
    removeChannel,
  }
}

const baseRequests: HelpRequest[] = [
  {
    id: 'req-pending',
    user_id: 'user-1',
    room_id: 'room-alpha-1',
    reason: 'dispute',
    message: 'La mano anterior no cuadro.',
    status: 'pending',
    created_at: '2026-05-25T11:45:00.000Z',
    resolved_at: null,
    resolved_by: null,
    admin_notes: null,
  },
  {
    id: 'req-attending',
    user_id: 'user-2',
    room_id: 'room-beta-1',
    reason: 'technical',
    message: null,
    status: 'attending',
    created_at: '2026-05-25T10:00:00.000Z',
    resolved_at: null,
    resolved_by: null,
    admin_notes: 'Revisando conexion',
  },
]

describe('AdminAlertsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    realtimeHandler = undefined
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-25T12:00:00.000Z').getTime())
    helpRequests = baseRequests
    profiles = [
      { id: 'user-1', username: 'ana' },
      { id: 'user-2', username: 'beto' },
    ]
    update.mockReturnValue({ eq: jest.fn(() => Promise.resolve({ error: null })) })
    mockCreateClient.mockReturnValue(makeSupabaseClient() as unknown as ReturnType<typeof createClient>)
    mockRoomList.mockResolvedValue({ data: [{ roomId: 'room-alpha-1', clients: 3, metadata: { phase: 'PIQUE' } }] } as Awaited<ReturnType<typeof colyseusClient.http.get>>)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('carga salas activas, alertas activas, usuarios y enlaces de supervision', async () => {
    render(<AdminAlertsPage />)

    expect(screen.getByRole('heading', { name: /supervisión de mesas/i })).toBeInTheDocument()
    expect(await screen.findByText('1 EN VIVO')).toBeInTheDocument()
    expect(screen.getByText('3 jugadores')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /supervisar/i })).toHaveAttribute('href', '/admin/spectate/room-alpha-1')
    expect(await screen.findByText('ana')).toBeInTheDocument()
    expect(screen.getByText('beto')).toBeInTheDocument()
    expect(screen.getByText('Disputa')).toBeInTheDocument()
    expect(screen.getByText('Técnico')).toBeInTheDocument()
    expect(screen.getByText('15m')).toBeInTheDocument()
    expect(screen.getByText('2h')).toBeInTheDocument()
    expect(screen.getByText('Nota admin: Revisando conexion')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /observar mesa/i })).toHaveLength(2)
  })

  it('actualiza estados y adjunta nota al resolver', async () => {
    render(<AdminAlertsPage />)

    await screen.findByText('ana')
    fireEvent.click(screen.getByRole('button', { name: /atender/i }))

    await waitFor(() => expect(update).toHaveBeenCalledWith({ status: 'attending' }))

    fireEvent.change(screen.getAllByPlaceholderText('Nota (opcional)...')[0], { target: { value: 'Validado con la mesa' } })
    fireEvent.click(screen.getAllByRole('button', { name: /resolver/i })[0])

    await waitFor(() => expect(update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'resolved',
      admin_notes: 'Validado con la mesa',
      resolved_at: expect.any(String),
    })))
  })

  it('cambia a historial, muestra empty state y maneja error de salas', async () => {
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    helpRequests = []
    mockRoomList.mockRejectedValue(new Error('rooms offline'))

    render(<AdminAlertsPage />)

    expect(await screen.findByText('Sin mesas activas')).toBeInTheDocument()
    expect(screen.getByText('Sin alertas activas')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /historial/i }))

    expect(await screen.findByText('No hay solicitudes')).toBeInTheDocument()
    expect(consoleWarn).toHaveBeenCalledWith('[Alerts] Error fetching rooms:', expect.any(Error))
  })

  it('incorpora eventos realtime de insert y update', async () => {
    const play = jest.fn(() => Promise.resolve())
    const audioMock = jest.fn().mockImplementation(() => ({ volume: 0, play }))
    jest.spyOn(window, 'Audio').mockImplementation(audioMock)
    profiles = [{ id: 'user-3', username: 'carla' }]

    render(<AdminAlertsPage />)
    await waitFor(() => expect(realtimeHandler).toBeDefined())

    await act(async () => {
      await realtimeHandler?.({
        eventType: 'INSERT',
        new: {
          id: 'req-new',
          user_id: 'user-3',
          room_id: 'room-gamma-1',
          reason: 'unfair_play',
          message: 'Sospecha de colusion',
          status: 'pending',
          created_at: '2026-05-25T11:59:00.000Z',
          resolved_at: null,
          resolved_by: null,
          admin_notes: null,
        },
      })
    })

    expect(await screen.findByText('carla')).toBeInTheDocument()
    expect(screen.getByText('Juego Desleal')).toBeInTheDocument()
    expect(audioMock).toHaveBeenCalledWith('/sounds/alert.mp3')
    expect(play).toHaveBeenCalled()

    await act(async () => {
      await realtimeHandler?.({
        eventType: 'UPDATE',
        new: { id: 'req-new', status: 'resolved', admin_notes: 'Cerrado por admin' },
      })
    })

    const carlaCard = screen.getByText('carla').closest('div[class*="backdrop-blur"]')
    expect(carlaCard).not.toBeNull()
    await waitFor(() => expect(within(carlaCard as HTMLElement).getByText('Resuelto')).toBeInTheDocument())
    expect(within(carlaCard as HTMLElement).getByText('Nota admin: Cerrado por admin')).toBeInTheDocument()
  })
})
