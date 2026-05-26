import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'

import { Lobby } from '../Lobby'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('framer-motion', () => ({
  m: {
    div: ({ children, initial: _initial, animate: _animate, transition: _transition, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => <div {...props}>{children}</div>,
    h1: ({ children, initial: _initial, animate: _animate, transition: _transition, ...props }: React.HTMLAttributes<HTMLHeadingElement> & Record<string, unknown>) => <h1 {...props}>{children}</h1>,
  },
}))

const joinOrCreateMock = jest.fn()
const createMock = jest.fn()
const joinByIdMock = jest.fn()

jest.mock('@/lib/colyseus', () => ({
  client: {
    joinOrCreate: (...args: unknown[]) => joinOrCreateMock(...args),
    create: (...args: unknown[]) => createMock(...args),
    joinById: (...args: unknown[]) => joinByIdMock(...args),
  },
}))

const singleMock = jest.fn()
const eqMock = jest.fn()
const selectMock = jest.fn()
const authGetUserMock = jest.fn()

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: authGetUserMock },
    from: jest.fn(() => ({
      select: selectMock,
    })),
  })),
}))

jest.mock('@/components/game/DepositModal', () => ({
  DepositModal: ({ isOpen }: { isOpen: boolean }) => <div data-testid="deposit-modal">open:{String(isOpen)}</div>,
}))

jest.mock('@/components/game/CustomMesaModal', () => ({
  CustomMesaModal: ({ isOpen }: { isOpen: boolean }) => <div data-testid="custom-mesa-modal">open:{String(isOpen)}</div>,
}))

const push = jest.fn()
const leaveMock = jest.fn()
const onMessageMock = jest.fn()

describe('Lobby', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    window.confirm = jest.fn(() => true)
    window.alert = jest.fn()
    ;(useRouter as unknown as jest.Mock).mockReturnValue({ push })

    joinOrCreateMock.mockResolvedValue({
      roomId: 'lobby-room',
      leave: leaveMock,
      onMessage: onMessageMock,
    })
    createMock.mockResolvedValue({
      roomId: 'created-room',
      reconnectionToken: 'created-token',
      connection: { transport: { close: jest.fn() } },
    })
    joinByIdMock.mockResolvedValue({ send: jest.fn() })

    authGetUserMock.mockResolvedValue({ data: { user: { id: 'user-1', user_metadata: {} } } })

    selectMock.mockReturnValue({ eq: eqMock })
    eqMock.mockReturnValue({ single: singleMock })
    singleMock
      .mockResolvedValueOnce({ data: { id: 'user-1', role: 'player', username: 'Chepe', avatar_url: 'as-oros' } })
      .mockResolvedValueOnce({ data: { balance_cents: 6500000 } })
  })

  it('detecta sesión activa y redirige a /play/:roomId', async () => {
    sessionStorage.setItem('reconnectionToken_room-77', 'token-77')
    render(<Lobby lobbyTables={{ common: [], custom: [] }} />)

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/play/room-77')
      expect(screen.getByText(/restaurando tu sesión en la mesa/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(sessionStorage.getItem('reconnectionToken_room-77')).toBeNull()
  })

  it('renderiza lobby, balance y placeholders de mesas comunes cuando no hay rooms activas', async () => {
    render(
      <Lobby
        lobbyTables={{
          common: [
            { id: '1', name: 'Mesa #1', game_type: 'primera_28', max_players: 7, table_category: 'common', lobby_slot: 1, min_entry_cents: 5000000, min_pique_cents: 500000, disabled_chips: [], sort_order: 1 },
            { id: '2', name: 'Mesa #2', game_type: 'primera_28', max_players: 7, table_category: 'common', lobby_slot: 2, min_entry_cents: 5000000, min_pique_cents: 500000, disabled_chips: [], sort_order: 2 },
          ],
          custom: [],
        }}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText(/lobby/i)).toBeInTheDocument()
      expect(screen.getByText(/selecciona tu mesa de primera/i)).toBeInTheDocument()
      expect(screen.getByText('65,000')).toBeInTheDocument()
      expect(screen.getAllByText(/abrir mesa/i).length).toBeGreaterThan(0)
    })
  })

  it('actualiza rooms desde mensajes del lobby y permite entrar a una mesa activa', async () => {
    render(<Lobby lobbyTables={{ common: [], custom: [] }} />)

    await waitFor(() => expect(onMessageMock).toHaveBeenCalledWith('rooms', expect.any(Function)))
    const roomsHandler = onMessageMock.mock.calls.find(([type]) => type === 'rooms')?.[1]

    act(() => {
      roomsHandler([
        {
          roomId: 'live-room-1',
          clients: 3,
          maxClients: 7,
          metadata: { tableName: 'Mesa #1', activePlayers: 3, totalReservedSeats: 3 },
        },
      ])
    })

    expect(screen.getByText('1 MESAS DISPONIBLES')).toBeInTheDocument()
    expect(screen.getByText('REF: live-roo')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'ENTRAR' }))

    expect(push).toHaveBeenCalledWith('/play/live-room-1')
  })

  it('crea una mesa placeholder con config de DB y guarda token de reconexion', async () => {
    render(
      <Lobby
        lobbyTables={{
          common: [
            { id: '1', name: 'Mesa Premium', game_type: 'primera_28', max_players: 5, table_category: 'common', lobby_slot: 1, min_entry_cents: 5000000, min_pique_cents: 700000, disabled_chips: [1000], sort_order: 1 },
          ],
          custom: [],
        }}
      />,
    )

    await screen.findByText('65,000')
    fireEvent.click(screen.getByRole('button', { name: 'ABRIR MESA' }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith('mesa', expect.objectContaining({
        tableName: 'Mesa Premium',
        maxPlayers: 5,
        minEntry: 5000000,
        minPique: 700000,
        disabledChips: [1000],
        isCustom: false,
        chips: 6500000,
        userId: 'user-1',
      }))
      expect(sessionStorage.getItem('reconnectionToken_created-room')).toBe('created-token')
      expect(push).toHaveBeenCalledWith('/play/created-room')
    })
  })

  it('bloquea apertura de placeholder si el balance no alcanza', async () => {
    singleMock.mockReset()
    singleMock
      .mockResolvedValueOnce({ data: { id: 'user-1', role: 'player', username: 'Chepe', avatar_url: null } })
      .mockResolvedValueOnce({ data: { balance_cents: 1000000 } })

    render(
      <Lobby
        lobbyTables={{
          common: [
            { id: '1', name: 'Mesa Cara', game_type: 'primera_28', max_players: 7, table_category: 'common', lobby_slot: 1, min_entry_cents: 5000000, min_pique_cents: 500000, disabled_chips: [], sort_order: 1 },
          ],
          custom: [],
        }}
      />,
    )

    await screen.findByText('10,000')
    fireEvent.click(screen.getByRole('button', { name: 'ABRIR MESA' }))

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Fondos insuficientes'))
    expect(createMock).not.toHaveBeenCalled()
  })

  it('permite al admin cerrar una mesa activa confirmada', async () => {
    const deleteRoom = { send: jest.fn() }
    joinByIdMock.mockResolvedValue(deleteRoom)
    singleMock.mockReset()
    singleMock
      .mockResolvedValueOnce({ data: { id: 'admin-1', role: 'admin', username: 'Admin', avatar_url: null } })
      .mockResolvedValueOnce({ data: { balance_cents: 6500000 } })

    render(<Lobby lobbyTables={{ common: [], custom: [] }} />)

    await waitFor(() => expect(onMessageMock).toHaveBeenCalledWith('rooms', expect.any(Function)))
    const roomsHandler = onMessageMock.mock.calls.find(([type]) => type === 'rooms')?.[1]

    act(() => {
      roomsHandler([
        {
          roomId: 'admin-room-1',
          clients: 1,
          maxClients: 7,
          metadata: { tableName: 'Mesa #1', totalReservedSeats: 1 },
        },
      ])
    })

    fireEvent.click(screen.getByTitle('Cerrar Mesa'))

    await waitFor(() => {
      expect(joinByIdMock).toHaveBeenCalledWith('admin-room-1')
      expect(deleteRoom.send).toHaveBeenCalledWith('delete-room', { adminToken: 'admin-1' })
    })
  })
})
