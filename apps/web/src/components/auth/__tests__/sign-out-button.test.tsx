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

describe('SignOutButton confirmation flow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(usePathname).mockReturnValue('/admin/broadcast/history')
  })

  it('asks for confirmation before signing out', () => {
    const confirmMock = jest.spyOn(window, 'confirm').mockReturnValue(false)

    render(<SignOutButton variant="danger" />)
    fireEvent.click(screen.getByRole('button', { name: /cerrar sesión/i }))

    expect(confirmMock).toHaveBeenCalledWith('¿Seguro que deseas cerrar sesión?')
    expect(clearSessionValidated).not.toHaveBeenCalled()
    expect(signOut).not.toHaveBeenCalled()
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
