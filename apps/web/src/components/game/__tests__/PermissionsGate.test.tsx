import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { PermissionsGate } from '../PermissionsGate'
import { useGamePermissions } from '@/hooks/useGamePermissions'

jest.mock('@/hooks/useGamePermissions', () => ({
  useGamePermissions: jest.fn(),
}))

const mockUseGamePermissions = useGamePermissions as jest.MockedFunction<typeof useGamePermissions>

describe('PermissionsGate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('siempre renderiza children y muestra el aviso cuando faltan permisos', () => {
    const requestAll = jest.fn().mockResolvedValue(undefined)
    mockUseGamePermissions.mockReturnValue({
      notifications: 'pending',
      microphone: 'pending',
      isMobile: true,
      allGranted: false,
      requestAll,
    })

    render(
      <PermissionsGate>
        <div data-testid="game-content">Game loaded</div>
      </PermissionsGate>
    )

    expect(screen.getByTestId('game-content')).toBeVisible()
    expect(screen.getByText('Activa la voz y los avisos')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Permitir' })).toBeInTheDocument()
    // Micrófono y notificaciones aún sin conceder: sin marca "activo/activas".
    expect(screen.getByText('Micrófono')).toBeInTheDocument()
    expect(screen.getByText('Notificaciones')).toBeInTheDocument()
  })

  it('marca micrófono y notificaciones concedidos cuando el permiso está activo', () => {
    mockUseGamePermissions.mockReturnValue({
      notifications: 'granted',
      microphone: 'granted',
      isMobile: true,
      // allGranted falso para que el aviso siga visible y poder comprobar el estado.
      allGranted: false,
      requestAll: jest.fn(),
    })

    render(<PermissionsGate><div>child</div></PermissionsGate>)

    expect(screen.getByText('Micrófono activo')).toBeInTheDocument()
    expect(screen.getByText('Notificaciones activas')).toBeInTheDocument()
  })

  it('solicita permisos, muestra el estado de carga y cierra el aviso al terminar', async () => {
    let resolveRequest: () => void = () => {}
    const requestAll = jest.fn(() => new Promise<void>((resolve) => { resolveRequest = resolve }))
    mockUseGamePermissions.mockReturnValue({
      notifications: 'denied',
      microphone: 'pending',
      isMobile: true,
      allGranted: false,
      requestAll,
    })

    render(<PermissionsGate><div>child</div></PermissionsGate>)

    fireEvent.click(screen.getByRole('button', { name: 'Permitir' }))

    // Mientras la promesa está pendiente, el botón muestra el estado de carga.
    expect(await screen.findByRole('button', { name: 'Pidiendo permiso…' })).toBeInTheDocument()

    resolveRequest()

    await waitFor(() => {
      expect(requestAll).toHaveBeenCalledTimes(1)
      expect(screen.queryByText('Activa la voz y los avisos')).not.toBeInTheDocument()
    })
  })

  it('permite cerrar manualmente sin solicitar permisos', () => {
    const requestAll = jest.fn()
    mockUseGamePermissions.mockReturnValue({
      notifications: 'pending',
      microphone: 'pending',
      isMobile: true,
      allGranted: false,
      requestAll,
    })

    render(<PermissionsGate><div>child</div></PermissionsGate>)
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByText('Activa la voz y los avisos')).not.toBeInTheDocument()
    expect(requestAll).not.toHaveBeenCalled()
  })

  it('auto-oculta el aviso cuando allGranted es true', () => {
    mockUseGamePermissions.mockReturnValue({
      notifications: 'granted',
      microphone: 'granted',
      isMobile: false,
      allGranted: true,
      requestAll: jest.fn(),
    })

    render(<PermissionsGate><div>child</div></PermissionsGate>)
    expect(screen.queryByText('Activa la voz y los avisos')).not.toBeInTheDocument()
  })
})
