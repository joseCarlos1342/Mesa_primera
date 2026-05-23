import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

jest.mock('@/lib/colyseus', () => ({
  client: {
    joinOrCreate: (...args: unknown[]) => joinOrCreateMock(...args),
    create: (...args: unknown[]) => createMock(...args),
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
})
