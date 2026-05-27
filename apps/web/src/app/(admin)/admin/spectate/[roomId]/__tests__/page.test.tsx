import { act } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import SpectatePage from '../page'
import { client } from '@/lib/colyseus'
import { generateSupervisionToken } from '@/app/actions/admin-supervision'
import { createSanction } from '@/app/actions/admin-sanctions'

jest.mock('next/navigation', () => ({
  useParams: jest.fn(() => ({ roomId: 'room-123' })),
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
}))

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => function MockVoiceChat(props: { roomName: string; username: string }) {
    return <div data-testid="voice-chat">Voice {props.roomName} {props.username}</div>
  },
}))

jest.mock('@/components/game/ManoIcon', () => ({
  ManoIcon: () => <span>MANO</span>,
}))

jest.mock('@/lib/colyseus', () => ({
  client: {
    joinById: jest.fn(),
  },
}))

jest.mock('@/app/actions/admin-supervision', () => ({
  generateSupervisionToken: jest.fn(),
}))

jest.mock('@/app/actions/admin-sanctions', () => ({
  createSanction: jest.fn(),
}))

const mockJoinById = client.joinById as jest.MockedFunction<typeof client.joinById>
const mockGenerateSupervisionToken = generateSupervisionToken as jest.MockedFunction<typeof generateSupervisionToken>
const mockCreateSanction = createSanction as jest.MockedFunction<typeof createSanction>

let stateHandler: ((state: any) => void) | undefined
let errorHandler: ((code: number, message?: string) => void) | undefined
let leaveHandler: (() => void) | undefined
const send = jest.fn()
const leave = jest.fn()

function makeRoom() {
  return {
    send,
    leave,
    onStateChange: jest.fn((handler) => {
      stateHandler = handler
    }),
    onError: jest.fn((handler) => {
      errorHandler = handler
    }),
    onLeave: jest.fn((handler) => {
      leaveHandler = handler
    }),
  }
}

function emitState() {
  act(() => {
    stateHandler?.({
      phase: 'PIQUE',
      pot: 1000,
      piquePot: 250,
      dealerId: 'player-1',
      lastAction: 'Ana subió la apuesta',
      countdown: 12,
      players: new Map([
        ['player-1', {
          id: 'player-1',
          nickname: 'Ana',
          supabaseUserId: 'user-1',
          connected: true,
          chips: 5000,
          cardCount: 4,
          isFolded: false,
        }],
        ['player-2', {
          id: 'player-2',
          nickname: 'Beto',
          supabaseUserId: 'user-2',
          connected: false,
          chips: 1200,
          cardCount: 0,
          isFolded: true,
        }],
      ]),
    })
  })
}

describe('SpectatePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
    stateHandler = undefined
    errorHandler = undefined
    leaveHandler = undefined
    jest.spyOn(window, 'confirm').mockReturnValue(true)
    mockGenerateSupervisionToken.mockResolvedValue({ token: 'supervision-token' })
    mockJoinById.mockResolvedValue(makeRoom() as never)
    mockCreateSanction.mockResolvedValue({ id: 'sanction-1' } as never)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('genera token, entra como espectador y renderiza estado sin exponer cartas', async () => {
    render(<SpectatePage />)

    await waitFor(() => expect(mockGenerateSupervisionToken).toHaveBeenCalledWith('room-123'))
    expect(mockJoinById).toHaveBeenCalledWith('room-123', {
      spectator: true,
      supervisionToken: 'supervision-token',
    })

    emitState()

    expect(await screen.findByRole('heading', { name: /modo espectador/i })).toBeInTheDocument()
    expect(screen.getByText('PIQUE')).toBeInTheDocument()
    expect(screen.getByText('$1250')).toBeInTheDocument()
    expect(screen.getByText('Ana subió la apuesta')).toBeInTheDocument()
    expect(screen.getByText(/Admin Blindness activo/)).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Beto')).toBeInTheDocument()
    expect(screen.getByText('MANO')).toBeInTheDocument()
    expect(screen.getByText('BOTADO')).toBeInTheDocument()
    expect(screen.getByTestId('voice-chat')).toHaveTextContent('Voice room-123 Soporte')
  })

  it('envia acciones de mute y kick confirmadas', async () => {
    render(<SpectatePage />)
    await waitFor(() => expect(stateHandler).toBeDefined())
    emitState()

    fireEvent.click(screen.getAllByRole('button', { name: /mute/i })[0])
    expect(send).toHaveBeenCalledWith('admin:mute', { playerId: 'player-1', reason: 'Silenciado por moderador' })

    fireEvent.click(screen.getAllByRole('button', { name: /kick/i })[0])
    expect(window.confirm).toHaveBeenCalledWith('¿Retirar a este jugador de la mesa?')
    expect(send).toHaveBeenCalledWith('admin:kick', { playerId: 'player-1' })
  })

  it('aplica sancion temporal, expulsa al jugador y cierra el modal', async () => {
    jest.useFakeTimers()
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-25T12:00:00.000Z').getTime())
    render(<SpectatePage />)
    await waitFor(() => expect(stateHandler).toBeDefined())
    emitState()

    fireEvent.click(screen.getAllByRole('button', { name: /sancionar/i })[0])
    expect(screen.getByRole('heading', { name: /aplicar sanción/i })).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('Describe el motivo de la sanción...'), { target: { value: 'Colusion en mesa' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar Sanción' }))

    await waitFor(() => expect(mockCreateSanction).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      sanctionType: 'game_suspension',
      reason: 'Colusion en mesa',
      sourceRoomId: 'room-123',
      expiresAt: expect.any(String),
    })))
    expect(send).toHaveBeenCalledWith('admin:kick', { playerId: 'player-1' })
    expect(await screen.findByText('Sanción aplicada exitosamente')).toBeInTheDocument()

    act(() => {
      jest.advanceTimersByTime(1500)
    })
    await waitFor(() => expect(screen.queryByRole('heading', { name: /aplicar sanción/i })).not.toBeInTheDocument())
    jest.useRealTimers()
  })

  it('muestra error de sancion permanente y permite cerrar el modal', async () => {
    mockCreateSanction.mockRejectedValue(new Error('sin permisos'))
    render(<SpectatePage />)
    await waitFor(() => expect(stateHandler).toBeDefined())
    emitState()

    fireEvent.click(screen.getAllByRole('button', { name: /sancionar/i })[0])
    fireEvent.click(screen.getByRole('button', { name: /veto permanente/i }))
    expect(screen.queryByLabelText('Duración')).not.toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('Describe el motivo de la sanción...'), { target: { value: 'Fraude grave' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar Sanción' }))

    await waitFor(() => expect(mockCreateSanction).toHaveBeenCalledWith(expect.objectContaining({
      sanctionType: 'permanent_ban',
      expiresAt: undefined,
    })))
    expect(await screen.findByText('sin permisos')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(screen.queryByRole('heading', { name: /aplicar sanción/i })).not.toBeInTheDocument()
  })

  it('muestra errores de conexion y desconexion', async () => {
    const { rerender } = render(<SpectatePage />)
    await waitFor(() => expect(errorHandler).toBeDefined())

    act(() => {
      errorHandler?.(4001, 'Sala cerrada')
    })
    expect(await screen.findByText('Sala cerrada')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /volver a alertas/i })).toHaveAttribute('href', '/admin/alerts')

    mockJoinById.mockResolvedValue(makeRoom() as never)
    rerender(<SpectatePage />)
    act(() => {
      leaveHandler?.()
    })
    expect(await screen.findByText('Desconectado de la sala')).toBeInTheDocument()
  })

  it('muestra error si no puede conectarse', async () => {
    mockJoinById.mockRejectedValue(new Error('token inválido'))

    render(<SpectatePage />)

    expect(await screen.findByText('token inválido')).toBeInTheDocument()
  })

  it('abandona la sala al desmontar', async () => {
    const { unmount } = render(<SpectatePage />)
    await waitFor(() => expect(mockJoinById).toHaveBeenCalled())

    unmount()

    expect(leave).toHaveBeenCalledWith(true)
  })
})
