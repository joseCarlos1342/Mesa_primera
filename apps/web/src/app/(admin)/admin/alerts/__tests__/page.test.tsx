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
let holdHelpLoads = false
let pendingHelpLoads: Array<(data: HelpRequest[]) => void> = []
let profileSingleError = false
let holdProfileLookups = false
let pendingProfileLookups: Array<(profile: { id: string; username: string } | null) => void> = []

function makeHelpQuery() {
  const query: Record<string, unknown> = {
    select: jest.fn(() => query),
    order: jest.fn(() => query),
    limit: jest.fn(() => query),
    in: jest.fn(() => query),
    then: (resolve: (value: { data: HelpRequest[] }) => void) => {
      if (holdHelpLoads) {
        return new Promise<{ data: HelpRequest[] }>((finish) => {
          pendingHelpLoads.push((data) => finish({ data }))
        }).then(resolve)
      }
      return Promise.resolve({ data: helpRequests }).then(resolve)
    },
  }
  return query
}

function makeProfilesQuery() {
  const query: Record<string, unknown> = {
    select: jest.fn(() => query),
    in: jest.fn(() => Promise.resolve({ data: profiles })),
    eq: jest.fn(() => query),
     single: jest.fn(() => {
       if (holdProfileLookups) {
         return new Promise<{ data: { id: string; username: string } | null }>((resolve) => {
           pendingProfileLookups.push((profile) => resolve({ data: profile }))
         })
       }
       return Promise.resolve({ data: profileSingleError ? null : profiles[0] ?? null, error: profileSingleError ? new Error('profile missing') : null })
     }),
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
    holdHelpLoads = false
    pendingHelpLoads = []
    profileSingleError = false
    holdProfileLookups = false
    pendingProfileLookups = []
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

  it('muestra fallback de usuario y antigüedad en días para datos incompletos', async () => {
    profiles = []
    helpRequests = [
      ...baseRequests,
      {
        ...baseRequests[0],
        id: 'req-old',
        user_id: 'unknown-user',
        created_at: '2026-05-23T12:00:00.000Z',
        reason: 'unrecognized-reason',
        status: 'unknown-status',
      },
    ]

    render(<AdminAlertsPage />)

    expect((await screen.findAllByText('Desconocido')).length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Otro')).toBeInTheDocument()
    expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0)
    expect(screen.getByText('2d')).toBeInTheDocument()
  })

  it('tolera que el catálogo de salas no tenga datos', async () => {
    mockRoomList.mockResolvedValue({ data: undefined } as Awaited<ReturnType<typeof colyseusClient.http.get>>)

    render(<AdminAlertsPage />)

    expect(await screen.findByText('Sin mesas activas')).toBeInTheDocument()
  })

  it('permite refrescar manualmente el catálogo de salas', async () => {
    render(<AdminAlertsPage />)
    await screen.findByText('1 EN VIVO')

    fireEvent.click(screen.getByRole('button', { name: /actualizar/i }))

    await waitFor(() => expect(mockRoomList).toHaveBeenCalledTimes(2))
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
    expect(screen.getAllByText('carla')).toHaveLength(1)

    await act(async () => {
      await realtimeHandler?.({
        eventType: 'UPDATE',
        new: { id: 'req-new', status: 'resolved', admin_notes: 'Cerrado por admin' },
      })
    })

    expect(screen.queryByText('carla')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /historial/i }))
    const carlaCard = await screen.findByText('carla')
    const card = carlaCard.closest('div[class*="backdrop-blur"]')
    expect(card).not.toBeNull()
    await waitFor(() => expect(within(card as HTMLElement).getByText('Resuelto')).toBeInTheDocument())
    expect(within(card as HTMLElement).getByText('Nota admin: Cerrado por admin')).toBeInTheDocument()

    await act(async () => {
      await realtimeHandler?.({ eventType: 'UPDATE', new: { id: 'req-new', status: 'attending' } })
    })
    expect(within(card as HTMLElement).getByText('Atendiendo')).toBeInTheDocument()
  })

  it('no muestra en activas una alerta realtime que ya llega resuelta', async () => {
    const play = jest.fn(() => Promise.resolve())
    jest.spyOn(window, 'Audio').mockImplementation(() => ({ volume: 0, play }) as unknown as HTMLAudioElement)
    render(<AdminAlertsPage />)
    await waitFor(() => expect(realtimeHandler).toBeDefined())
    await waitFor(() => expect(screen.getByText('ana')).toBeInTheDocument())

    await act(async () => {
      await realtimeHandler?.({
        eventType: 'INSERT',
        new: {
          id: 'req-resolved',
          user_id: 'user-1',
          room_id: 'room-resolved',
          reason: 'technical',
          message: null,
          status: 'resolved',
          created_at: '2026-05-25T11:59:00.000Z',
          resolved_at: '2026-05-25T12:00:00.000Z',
          resolved_by: 'admin-1',
          admin_notes: null,
        },
      })
    })

    expect(screen.queryByText(/room-resolved/)).not.toBeInTheDocument()
  })

  it('deduplica INSERT realtime concurrente antes de resolver el perfil', async () => {
    const play = jest.fn(() => Promise.resolve())
    const audioMock = jest.fn().mockImplementation(() => ({ volume: 0, play }))
    jest.spyOn(window, 'Audio').mockImplementation(audioMock)
    profiles = [{ id: 'user-3', username: 'carla' }]
    render(<AdminAlertsPage />)
    await waitFor(() => expect(realtimeHandler).toBeDefined())

    const payload = {
      eventType: 'INSERT' as const,
      new: {
        id: 'req-concurrent', user_id: 'user-3', room_id: 'room-concurrent', reason: 'technical',
        message: null, status: 'pending', created_at: '2026-05-25T11:59:00.000Z',
        resolved_at: null, resolved_by: null, admin_notes: null,
      },
    }
    await act(async () => {
      await Promise.all([realtimeHandler?.(payload), realtimeHandler?.(payload)])
    })

    expect(screen.getAllByText('carla')).toHaveLength(1)
    expect(audioMock).toHaveBeenCalledTimes(1)
  })

  it('muestra una alerta aunque falle la consulta realtime del perfil', async () => {
    const play = jest.fn(() => Promise.resolve())
    const audioMock = jest.fn().mockImplementation(() => ({ volume: 0, play }))
    jest.spyOn(window, 'Audio').mockImplementation(audioMock)
    profileSingleError = true
    render(<AdminAlertsPage />)
    await waitFor(() => expect(realtimeHandler).toBeDefined())

    await act(async () => {
      await realtimeHandler?.({
        eventType: 'INSERT',
        new: {
          id: 'req-profile-error', user_id: 'missing-user', room_id: 'room-profile-error', reason: 'technical',
          message: null, status: 'pending', created_at: '2026-05-25T11:59:00.000Z',
          resolved_at: null, resolved_by: null, admin_notes: null,
        },
      })
    })

    expect(screen.getByText('Desconocido')).toBeInTheDocument()
    expect(screen.getByText(/room-profile-error/)).toBeInTheDocument()
  })

  it('conserva UPDATE recibido mientras el INSERT aún consulta el perfil', async () => {
    const play = jest.fn(() => Promise.resolve())
    jest.spyOn(window, 'Audio').mockImplementation(() => ({ volume: 0, play }) as unknown as HTMLAudioElement)
    holdProfileLookups = true
    profiles = [{ id: 'user-3', username: 'carla' }]
    render(<AdminAlertsPage />)
    await waitFor(() => expect(realtimeHandler).toBeDefined())

    const insertPromise = realtimeHandler?.({
      eventType: 'INSERT',
      new: {
        id: 'req-order', user_id: 'user-3', room_id: 'room-order', reason: 'technical',
        message: null, status: 'pending', created_at: '2026-05-25T11:59:00.000Z',
        resolved_at: null, resolved_by: null, admin_notes: null,
      },
    })
    await waitFor(() => expect(pendingProfileLookups).toHaveLength(1))

    await act(async () => {
      await realtimeHandler?.({ eventType: 'UPDATE', new: { id: 'req-order', status: 'attending' } })
    })
    pendingProfileLookups[0](profiles[0])
    await act(async () => { await insertPromise })

    expect(screen.getAllByText('Atendiendo').length).toBeGreaterThan(1)
  })

  it('ignora UPDATE parcial de una alerta desconocida al cambiar a historial', async () => {
    render(<AdminAlertsPage />)
    await waitFor(() => expect(realtimeHandler).toBeDefined())
    await waitFor(() => expect(screen.getByText('ana')).toBeInTheDocument())

    await act(async () => {
      await realtimeHandler?.({ eventType: 'UPDATE', new: { id: 'unknown-request', status: 'resolved' } })
    })
    fireEvent.click(screen.getByRole('button', { name: /historial/i }))

    await waitFor(() => expect(screen.getByText('ana')).toBeInTheDocument())
    expect(screen.queryByText(/unknown-request/)).not.toBeInTheDocument()
  })

  it('ignora una carga anterior cuando el filtro cambia rápidamente', async () => {
    holdHelpLoads = true
    render(<AdminAlertsPage />)
    await waitFor(() => expect(pendingHelpLoads).toHaveLength(1))

    fireEvent.click(screen.getByRole('button', { name: /historial/i }))
    await waitFor(() => expect(pendingHelpLoads).toHaveLength(2))

    const historicalRequest = { ...baseRequests[0], id: 'historical-request', status: 'resolved', admin_notes: 'Histórico' }
    pendingHelpLoads[1]([historicalRequest])
    await waitFor(() => expect(screen.getByText(/Histórico/)).toBeInTheDocument())

    pendingHelpLoads[0](baseRequests)
    await waitFor(() => expect(screen.getByText(/Histórico/)).toBeInTheDocument())
  })

  it('continúa si el audio de una alerta falla al construirse', async () => {
    const audioMock = jest.fn(() => { throw new Error('audio unavailable') })
    jest.spyOn(window, 'Audio').mockImplementation(audioMock)
    profiles = []

    render(<AdminAlertsPage />)
    await waitFor(() => expect(realtimeHandler).toBeDefined())
    await waitFor(() => expect(screen.getAllByText('Desconocido').length).toBeGreaterThan(0))

    await act(async () => {
      await realtimeHandler?.({
        eventType: 'INSERT',
        new: {
          id: 'req-audio-error',
          user_id: 'user-missing',
          room_id: 'room-audio',
          reason: 'technical',
          message: null,
          status: 'pending',
          created_at: '2026-05-25T11:59:00.000Z',
          resolved_at: null,
          resolved_by: null,
          admin_notes: null,
        },
      })
    })

    expect(await screen.findByText(/room-audio/)).toBeInTheDocument()
    expect(audioMock).toHaveBeenCalledWith('/sounds/alert.mp3')
  })

  it('descarta una alerta sin nota administrativa', async () => {
    render(<AdminAlertsPage />)
    await screen.findByText('ana')

    fireEvent.click(screen.getAllByRole('button', { name: /descartar/i })[0])

    await waitFor(() => expect(update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'dismissed',
      resolved_at: expect.any(String),
    })))
    expect(update.mock.calls.at(-1)?.[0]).not.toHaveProperty('admin_notes')
  })

  it('libera el estado de actualización si Supabase rechaza el cambio', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    update.mockReturnValueOnce({ eq: jest.fn(() => Promise.resolve({ error: new Error('update failed') })) })
    render(<AdminAlertsPage />)
    await screen.findByText('ana')

    fireEvent.click(screen.getAllByRole('button', { name: /atender/i })[0])

    await waitFor(() => expect(consoleError).toHaveBeenCalledWith('[Alerts] Error updating request:', expect.any(Error)))
    expect(screen.getAllByRole('button', { name: /atender/i })[0]).toBeEnabled()
  })
})
