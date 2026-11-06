import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { SignOutButton } from '@/components/auth/sign-out-button'
import { signOut } from '@/app/(auth)/auth-actions'
import { clearSessionValidated } from '@/lib/app-lock-session'
import { logoutOneSignalUser } from '@/components/OneSignalPushOptIn'

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

jest.mock('@/app/(auth)/auth-actions', () => ({
  signOut: jest.fn(),
}))

jest.mock('@/lib/app-lock-session', () => ({
  clearSessionValidated: jest.fn(),
}))

jest.mock('@/components/OneSignalPushOptIn', () => ({
  logoutOneSignalUser: jest.fn().mockResolvedValue(undefined),
}))

describe('SignOutButton — rutas admin (window.confirm)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(usePathname).mockReturnValue('/admin/broadcast/history')
  })

  it('pide confirmación con window.confirm antes de cerrar sesión', () => {
    const confirmMock = jest.spyOn(window, 'confirm').mockReturnValue(false)

    render(<SignOutButton variant="danger" />)
    fireEvent.click(screen.getByRole('button', { name: /cerrar sesión/i }))

    expect(confirmMock).toHaveBeenCalledWith('¿Seguro que deseas cerrar sesión?')
    expect(clearSessionValidated).not.toHaveBeenCalled()
    expect(signOut).not.toHaveBeenCalled()
    // En admin no se usa el diálogo propio.
    expect(screen.queryByText('¿Cerrar sesión?')).not.toBeInTheDocument()
  })

  it('desvincula OneSignal antes de continuar con el redirect admin', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true)

    render(<SignOutButton variant="danger" />)
    fireEvent.click(screen.getByRole('button', { name: /cerrar sesión/i }))

    await waitFor(() => expect(logoutOneSignalUser).toHaveBeenCalled())
    expect(clearSessionValidated).toHaveBeenCalled()
    expect(signOut).toHaveBeenCalledWith('/login/admin')
  })
})

describe('SignOutButton — rutas de jugador (ConfirmDialog propio)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(usePathname).mockReturnValue('/dashboard')
  })

  it('abre el diálogo "¿Cerrar sesión?" sin usar window.confirm', () => {
    const confirmMock = jest.spyOn(window, 'confirm')

    render(<SignOutButton />)
    fireEvent.click(screen.getByRole('button', { name: /cerrar sesión/i }))

    expect(confirmMock).not.toHaveBeenCalled()
    expect(screen.getByText('¿Cerrar sesión?')).toBeInTheDocument()
  })

  it('al cancelar el diálogo no cierra sesión', () => {
    render(<SignOutButton />)
    fireEvent.click(screen.getByRole('button', { name: /cerrar sesión/i }))

    const cancelButtons = screen.getAllByRole('button', { name: 'Cancelar' })
    const footerCancel = cancelButtons.find((b) => b.getAttribute('aria-label') === null) ?? cancelButtons[0]
    fireEvent.click(footerCancel)

    expect(screen.queryByText('¿Cerrar sesión?')).not.toBeInTheDocument()
    expect(signOut).not.toHaveBeenCalled()
  })

  it('al confirmar ("Sí, salir") desvincula OneSignal y redirige al login de jugador', async () => {
    render(<SignOutButton />)
    fireEvent.click(screen.getByRole('button', { name: /cerrar sesión/i }))

    fireEvent.click(screen.getByRole('button', { name: 'Sí, salir' }))

    await waitFor(() => expect(logoutOneSignalUser).toHaveBeenCalled())
    expect(clearSessionValidated).toHaveBeenCalled()
    expect(signOut).toHaveBeenCalledWith('/login/player')
  })
})
