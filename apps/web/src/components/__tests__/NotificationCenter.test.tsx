import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'

import { NotificationCenter } from '../NotificationCenter'
import { createClient } from '@/utils/supabase/client'
import { deleteNotification } from '@/app/actions/social-actions'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/app/actions/social-actions', () => ({
  deleteNotification: jest.fn(),
}))

const push = jest.fn()
const subscribeMock = jest.fn()
const onMock = jest.fn().mockReturnValue({ subscribe: subscribeMock })
const removeChannelMock = jest.fn()
const orderMock = jest.fn()
const limitMock = jest.fn()
const eqMock = jest.fn()
const updateChainEqMock = jest.fn()
const selectMock = jest.fn()
const fromMock = jest.fn()
const updateIsMock = jest.fn()
let realtimeHandler: ((payload: { new: (typeof notifications)[number] }) => void) | null = null

const mockUseRouter = useRouter as unknown as jest.Mock
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockDeleteNotification = deleteNotification as jest.MockedFunction<typeof deleteNotification>

const notifications = [
  {
    id: 'n1',
    type: 'friend_request',
    title: 'Nueva solicitud',
    body: 'Recibiste $50000 de cortesía',
    created_at: '2025-01-01T10:00:00.000Z',
    read_at: null,
    data: {},
  },
  {
    id: 'n2',
    type: 'wallet_update',
    title: 'Billetera actualizada',
    body: 'Tienes un cambio por $100000.000000000000',
    created_at: '2025-01-02T10:00:00.000Z',
    read_at: '2025-01-02T10:05:00.000Z',
    data: {},
  },
]

function setupSupabase(initialNotifications = notifications) {
  const updateBuilder = {
    eq: updateChainEqMock,
  }
  updateChainEqMock.mockReturnValue({
    is: updateIsMock,
  })
  updateIsMock.mockResolvedValue({ error: null })

  const selectBuilder = {
    eq: eqMock,
    order: orderMock,
    limit: limitMock,
  }
  eqMock.mockReturnValue(selectBuilder)
  orderMock.mockReturnValue(selectBuilder)
  limitMock.mockResolvedValue({ data: initialNotifications })
  selectMock.mockReturnValue(selectBuilder)

  fromMock.mockImplementation(() => ({
    select: selectMock,
    update: jest.fn(() => updateBuilder),
  }))

  mockCreateClient.mockReturnValue({
    from: fromMock,
    channel: jest.fn(() => ({ on: onMock })),
    removeChannel: removeChannelMock,
  } as never)
}

describe('NotificationCenter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({ push })
    mockDeleteNotification.mockResolvedValue({ success: true } as never)
    realtimeHandler = null
    onMock.mockImplementation((_event, _filter, callback) => {
      realtimeHandler = callback
      return { subscribe: subscribeMock }
    })
    setupSupabase()
    jest.spyOn(window, 'Audio').mockImplementation(() => ({ volume: 0, play: jest.fn().mockResolvedValue(undefined) } as unknown as HTMLAudioElement))
  })

  it('carga notificaciones iniciales y muestra contador de no leídas', async () => {
    render(<NotificationCenter userId="user-1" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /notificaciones/i })).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })

  it('no consulta Supabase si no hay userId', () => {
    render(<NotificationCenter userId="" />)

    expect(fromMock).not.toHaveBeenCalled()
    expect(screen.queryByText('1')).not.toBeInTheDocument()
  })

  it('muestra estado vacío cuando no hay notificaciones', async () => {
    setupSupabase([])
    render(<NotificationCenter userId="user-1" />)

    fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }))

    expect(await screen.findByText(/tu buzón está vacío/i)).toBeInTheDocument()
  })

  it('abre el panel, formatea montos y permite limpiar todo', async () => {
    render(<NotificationCenter userId="user-1" />)

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }))

    expect(await screen.findByText(/nueva solicitud/i)).toBeInTheDocument()
    expect(screen.getByText(/\$\s?50.000/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /limpiar todo/i }))

    await waitFor(() => {
      expect(updateIsMock).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /limpiar todo/i })).not.toBeInTheDocument()
    })
  })

  it('mantiene contador si limpiar todo falla en Supabase', async () => {
    updateIsMock.mockResolvedValueOnce({ error: { message: 'DB offline' } })

    render(<NotificationCenter userId="user-1" />)
    await screen.findByText('1')
    fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }))
    fireEvent.click(await screen.findByRole('button', { name: /limpiar todo/i }))

    await waitFor(() => expect(updateIsMock).toHaveBeenCalled())
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('aplica feedback hover al botón de limpiar todo', async () => {
    render(<NotificationCenter userId="user-1" />)
    await screen.findByText('1')
    fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }))

    const clearButton = await screen.findByRole('button', { name: /limpiar todo/i })
    fireEvent.mouseEnter(clearButton)
    expect(clearButton).toHaveStyle({ background: 'rgba(212,175,55,0.18)' })

    fireEvent.mouseLeave(clearButton)
    expect(clearButton).toHaveStyle({ background: 'rgba(212,175,55,0.06)' })
  })

  it('agrega notificaciones realtime, incrementa contador y reproduce audio', async () => {
    const play = jest.fn().mockResolvedValue(undefined)
    ;(window.Audio as unknown as jest.Mock).mockImplementation(() => ({ volume: 0, play } as unknown as HTMLAudioElement))
    setupSupabase([])
    render(<NotificationCenter userId="user-1" />)

    await waitFor(() => expect(realtimeHandler).toBeTruthy())
    act(() => {
      realtimeHandler!({
        new: {
          id: 'n3',
          type: 'game_invite',
          title: 'Invitación',
          body: 'Te invitaron a jugar',
          created_at: '2025-01-03T10:00:00.000Z',
          read_at: null,
          data: {},
        },
      })
    })

    expect(await screen.findByText('1')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }))
    expect(await screen.findByText(/invitación/i)).toBeInTheDocument()
    expect(play).toHaveBeenCalled()
  })

  it('ignora errores al reproducir audio realtime', async () => {
    ;(window.Audio as unknown as jest.Mock).mockImplementation(() => {
      throw new Error('Audio blocked')
    })
    setupSupabase([])
    render(<NotificationCenter userId="user-1" />)

    await waitFor(() => expect(realtimeHandler).toBeTruthy())
    expect(() => act(() => {
      realtimeHandler!({
        new: {
          id: 'n4',
          type: 'info',
          title: 'Info',
          body: '',
          created_at: 'fecha-invalida',
          read_at: null,
          data: {},
        },
      })
    })).not.toThrow()
  })

  it('renderiza cuerpo vacío y fecha inválida sin romper el panel', async () => {
    setupSupabase([{ ...notifications[0], id: 'invalid-date', body: '', created_at: 'fecha-invalida' }])
    render(<NotificationCenter userId="user-1" />)
    await screen.findByText('1')

    fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }))

    expect(await screen.findByText(/nueva solicitud/i)).toBeInTheDocument()
    const timestamp = screen.getByText('', { selector: 'time' })
    expect(timestamp).toHaveAttribute('dateTime', 'fecha-invalida')
  })

  it('navega y borra una notificación al pulsar Ir', async () => {
    render(<NotificationCenter userId="user-1" />)
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }))

    const goButtons = await screen.findAllByRole('button', { name: /ir/i })
    fireEvent.click(goButtons[0])

    await waitFor(() => {
      expect(mockDeleteNotification).toHaveBeenCalledWith('n1')
      expect(push).toHaveBeenCalledWith('/friends?tab=requests')
    })
  })

  it.each([
    ['game_invite', {}, '/lobby'],
    ['friend_accepted', {}, '/friends'],
    ['friend_removed', {}, '/friends'],
    ['direct_message', { senderId: 'friend-1' }, '/friends?chat=friend-1'],
    ['direct_message', {}, '/friends'],
    ['deposit_success', {}, '/wallet'],
    ['withdraw_success', {}, '/wallet'],
    ['wallet_update', {}, '/wallet'],
  ])('navega según tipo %s', async (type, data, expectedPath) => {
    setupSupabase([{ ...notifications[0], id: `nav-${type}`, type, data }])
    render(<NotificationCenter userId="user-1" />)
    await screen.findByText('1')
    fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }))

    fireEvent.click((await screen.findAllByRole('button', { name: /ir/i }))[0])

    await waitFor(() => expect(push).toHaveBeenCalledWith(expectedPath))
  })

  it('cierra panel sin navegar cuando el tipo no tiene destino', async () => {
    setupSupabase([{ ...notifications[0], id: 'unknown', type: 'system' }])
    render(<NotificationCenter userId="user-1" />)
    await screen.findByText('1')
    fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }))

    fireEvent.click((await screen.findAllByRole('button', { name: /ir/i }))[0])

    await waitFor(() => expect(mockDeleteNotification).toHaveBeenCalledWith('unknown'))
    expect(push).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.queryByText(/nueva solicitud/i)).not.toBeInTheDocument()
    })
  })

  it('borra una notificación manualmente', async () => {
    render(<NotificationCenter userId="user-1" />)
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }))

    const deleteButtons = await screen.findAllByRole('button', { name: /borrar/i })
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(mockDeleteNotification).toHaveBeenCalledWith('n1')
    })
  })

  it('aplica feedback hover en botones de acción', async () => {
    render(<NotificationCenter userId="user-1" />)
    await screen.findByText('1')
    fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }))

    const goButton = (await screen.findAllByRole('button', { name: /ir/i }))[0]
    fireEvent.mouseEnter(goButton)
    expect(goButton).toHaveStyle({ background: 'rgba(212,175,55,0.22)' })
    fireEvent.mouseLeave(goButton)
    expect(goButton).toHaveStyle({ background: 'rgba(212,175,55,0.1)' })

    const deleteButton = (await screen.findAllByRole('button', { name: /borrar/i }))[0]
    fireEvent.mouseEnter(deleteButton)
    expect(deleteButton).toHaveStyle({ background: 'rgba(239,68,68,0.2)' })
    fireEvent.mouseLeave(deleteButton)
    expect(deleteButton).toHaveStyle({ background: 'rgba(239,68,68,0.08)' })
  })

  it('no elimina visualmente si deleteNotification falla', async () => {
    mockDeleteNotification.mockResolvedValueOnce({ success: false } as never)
    render(<NotificationCenter userId="user-1" />)
    await screen.findByText('1')
    fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }))

    fireEvent.click((await screen.findAllByRole('button', { name: /borrar/i }))[0])

    await waitFor(() => expect(mockDeleteNotification).toHaveBeenCalledWith('n1'))
    expect(screen.getByText(/nueva solicitud/i)).toBeInTheDocument()
  })
})
