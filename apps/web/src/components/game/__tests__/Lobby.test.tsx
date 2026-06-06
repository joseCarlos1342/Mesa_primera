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
  CustomMesaModal: ({ isOpen, onCreateMesa, creating }: { isOpen: boolean; onCreateMesa: (options: any) => void; creating: boolean }) => (
    <div data-testid="custom-mesa-modal">
      open:{String(isOpen)} creating:{String(creating)}
      {isOpen && (
        <button
          type="button"
          onClick={() => onCreateMesa({
            tableName: 'Mesa VIP Test',
            maxPlayers: 4,
            minEntry: 7000000,
            minPique: 900000,
            disabledChips: [1000, 2000],
            isCustom: true,
          })}
        >
          Crear VIP
        </button>
      )}
    </div>
  ),
}))

const push = jest.fn()
const leaveMock = jest.fn()
const onMessageMock = jest.fn()

describe('Lobby', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    jest.spyOn(console, 'error').mockImplementation(() => undefined)
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
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

  afterEach(() => {
    jest.restoreAllMocks()
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

  it('usa mesas fallback cuando no llegan tablas desde admin', async () => {
    render(<Lobby />)

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'ABRIR MESA' })).toHaveLength(2)
    })
  })

  it('muestra error de conexión si no puede entrar al lobby', async () => {
    joinOrCreateMock.mockRejectedValueOnce(new Error('server offline'))

    render(<Lobby lobbyTables={{ common: [], custom: [] }} />)

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('Lobby Connection Error:', expect.any(Error))
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

  it('actualiza y elimina rooms con mensajes incrementales del lobby', async () => {
    render(<Lobby lobbyTables={{ common: [], custom: [] }} />)

    await waitFor(() => expect(onMessageMock).toHaveBeenCalledWith('+', expect.any(Function)))
    const plusHandler = onMessageMock.mock.calls.find(([type]) => type === '+')?.[1]
    const minusHandler = onMessageMock.mock.calls.find(([type]) => type === '-')?.[1]

    act(() => {
      plusHandler(['room-1', {
        roomId: 'room-1',
        clients: 1,
        maxClients: 7,
        metadata: { tableName: 'Mesa Extra', totalReservedSeats: 1 },
      }])
    })
    expect(screen.getByText('EXTRA')).toBeInTheDocument()

    act(() => {
      plusHandler(['room-1', {
        roomId: 'room-1',
        clients: 2,
        maxClients: 7,
        metadata: { tableName: 'Mesa Extra', totalReservedSeats: 2, activePlayers: 2 },
      }])
    })
    expect(screen.getByText('2')).toBeInTheDocument()

    act(() => {
      minusHandler('room-1')
    })
    expect(screen.queryByText('EXTRA')).not.toBeInTheDocument()
  })

  it('deshabilita entrada cuando la mesa activa está llena', async () => {
    render(<Lobby lobbyTables={{ common: [], custom: [] }} />)
    await waitFor(() => expect(onMessageMock).toHaveBeenCalledWith('rooms', expect.any(Function)))
    const roomsHandler = onMessageMock.mock.calls.find(([type]) => type === 'rooms')?.[1]

    act(() => {
      roomsHandler([{ roomId: 'full-room', clients: 7, maxClients: 7, metadata: { tableName: 'Mesa #1', totalReservedSeats: 7 } }])
    })

    expect(screen.getByRole('button', { name: 'MESA LLENA' })).toBeDisabled()
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

  it('crea mesa normal desde botón admin flotante y genera nickname/device si faltan', async () => {
    singleMock.mockReset()
    singleMock
      .mockResolvedValueOnce({ data: { id: 'admin-1', role: 'admin', username: null, avatar_url: null } })
      .mockResolvedValueOnce({ data: { balance_cents: 8000000 } })
    jest.spyOn(Math, 'random').mockReturnValue(0.123456)

    render(<Lobby lobbyTables={{ common: [], custom: [] }} />)
    await screen.findByText('80,000')

    fireEvent.click(screen.getByTitle('Nueva Mesa Normal'))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith('mesa', expect.objectContaining({
        tableName: 'Mesa #1',
        maxPlayers: 7,
        nickname: expect.stringMatching(/^Jugador /),
        deviceId: expect.stringMatching(/^dev_/),
        avatarUrl: 'as-oros',
        chips: 8000000,
        userId: 'admin-1',
      }))
      expect(push).toHaveBeenCalledWith('/play/created-room')
    })
  })

  it('abre modal de depósito cuando admin intenta crear mesa normal sin saldo', async () => {
    singleMock.mockReset()
    singleMock
      .mockResolvedValueOnce({ data: { id: 'admin-1', role: 'admin', username: 'Admin', avatar_url: null } })
      .mockResolvedValueOnce({ data: { balance_cents: 1000000 } })

    render(<Lobby lobbyTables={{ common: [], custom: [] }} />)
    await screen.findByText('10,000')

    fireEvent.click(screen.getByTitle('Nueva Mesa Normal'))

    expect(screen.getByTestId('deposit-modal')).toHaveTextContent('open:true')
    expect(createMock).not.toHaveBeenCalled()
  })

  it('crea mesa personalizada desde modal VIP admin', async () => {
    singleMock.mockReset()
    singleMock
      .mockResolvedValueOnce({ data: { id: 'admin-1', role: 'admin', username: 'Admin', avatar_url: 'avatar-admin' } })
      .mockResolvedValueOnce({ data: { balance_cents: 9000000 } })
    localStorage.setItem('deviceId', 'device-admin')

    render(<Lobby lobbyTables={{ common: [], custom: [] }} />)
    await screen.findByText('90,000')

    fireEvent.click(screen.getByTitle('Mesa Personalizada'))
    fireEvent.click(screen.getByRole('button', { name: 'Crear VIP' }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith('mesa', expect.objectContaining({
        tableName: 'Mesa VIP Test',
        maxPlayers: 4,
        minEntry: 7000000,
        minPique: 900000,
        disabledChips: [1000, 2000],
        isCustom: true,
        nickname: 'Admin',
        deviceId: 'device-admin',
        avatarUrl: 'avatar-admin',
      }))
      expect(screen.getByTestId('custom-mesa-modal')).toHaveTextContent('open:false')
      expect(push).toHaveBeenCalledWith('/play/created-room')
    })
  })

  it('muestra error si falla crear mesa personalizada', async () => {
    createMock.mockRejectedValueOnce(new Error('create failed'))
    singleMock.mockReset()
    singleMock
      .mockResolvedValueOnce({ data: { id: 'admin-1', role: 'admin', username: 'Admin', avatar_url: null } })
      .mockResolvedValueOnce({ data: { balance_cents: 9000000 } })

    render(<Lobby lobbyTables={{ common: [], custom: [] }} />)
    await screen.findByText('90,000')
    fireEvent.click(screen.getByTitle('Mesa Personalizada'))
    fireEvent.click(screen.getByRole('button', { name: 'Crear VIP' }))

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('Custom mesa creation error:', expect.any(Error))
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

  it('no elimina mesa si el admin cancela confirmación', async () => {
    ;(window.confirm as jest.Mock).mockReturnValueOnce(false)
    singleMock.mockReset()
    singleMock
      .mockResolvedValueOnce({ data: { id: 'admin-1', role: 'admin', username: 'Admin', avatar_url: null } })
      .mockResolvedValueOnce({ data: { balance_cents: 6500000 } })

    render(<Lobby lobbyTables={{ common: [], custom: [] }} />)
    await waitFor(() => expect(onMessageMock).toHaveBeenCalledWith('rooms', expect.any(Function)))
    const roomsHandler = onMessageMock.mock.calls.find(([type]) => type === 'rooms')?.[1]

    act(() => {
      roomsHandler([{ roomId: 'admin-room-2', clients: 1, maxClients: 7, metadata: { tableName: 'Mesa #1', totalReservedSeats: 1 } }])
    })

    fireEvent.click(screen.getByTitle('Cerrar Mesa'))

    expect(joinByIdMock).not.toHaveBeenCalled()
  })

  it('avisa al admin si no puede eliminar mesa', async () => {
    joinByIdMock.mockRejectedValueOnce(new Error('not found'))
    singleMock.mockReset()
    singleMock
      .mockResolvedValueOnce({ data: { id: 'admin-1', role: 'admin', username: 'Admin', avatar_url: null } })
      .mockResolvedValueOnce({ data: { balance_cents: 6500000 } })

    render(<Lobby lobbyTables={{ common: [], custom: [] }} />)
    await waitFor(() => expect(onMessageMock).toHaveBeenCalledWith('rooms', expect.any(Function)))
    const roomsHandler = onMessageMock.mock.calls.find(([type]) => type === 'rooms')?.[1]

    act(() => {
      roomsHandler([{ roomId: 'admin-room-3', clients: 1, maxClients: 7, metadata: { tableName: 'Mesa #1', totalReservedSeats: 1 } }])
    })

    fireEvent.click(screen.getByTitle('Cerrar Mesa'))

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('No se pudo eliminar la mesa.')
    })
  })
})
