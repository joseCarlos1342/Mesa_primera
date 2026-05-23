import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

function setupSupabase() {
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
  limitMock.mockResolvedValue({ data: notifications })
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
})
