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

  it('siempre renderiza children y muestra banner cuando faltan permisos', () => {
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
    expect(screen.getByText(/permisos opcionales/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /conceder/i })).toBeInTheDocument()
  })

  it('solicita permisos y permite cerrar el banner', async () => {
    const requestAll = jest.fn().mockResolvedValue(undefined)
    mockUseGamePermissions.mockReturnValue({
      notifications: 'denied',
      microphone: 'pending',
      isMobile: true,
      allGranted: false,
      requestAll,
    })

    render(<PermissionsGate><div>child</div></PermissionsGate>)

    fireEvent.click(screen.getByRole('button', { name: /conceder/i }))

    await waitFor(() => {
      expect(requestAll).toHaveBeenCalledTimes(1)
      expect(screen.queryByText(/permisos opcionales/i)).not.toBeInTheDocument()
    })
  })

  it('permite cerrar manualmente sin solicitar permisos', () => {
    mockUseGamePermissions.mockReturnValue({
      notifications: 'pending',
      microphone: 'pending',
      isMobile: true,
      allGranted: false,
      requestAll: jest.fn(),
    })

    render(<PermissionsGate><div>child</div></PermissionsGate>)
    fireEvent.click(screen.getByRole('button', { name: /cerrar/i }))
    expect(screen.queryByText(/permisos opcionales/i)).not.toBeInTheDocument()
  })

  it('auto-dismiss cuando allGranted es true', () => {
    mockUseGamePermissions.mockReturnValue({
      notifications: 'granted',
      microphone: 'granted',
      isMobile: false,
      allGranted: true,
      requestAll: jest.fn(),
    })

    render(<PermissionsGate><div>child</div></PermissionsGate>)
    expect(screen.queryByText(/permisos opcionales/i)).not.toBeInTheDocument()
  })
})
