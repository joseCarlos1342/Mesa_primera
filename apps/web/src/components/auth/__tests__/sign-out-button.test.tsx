import { fireEvent, render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { SignOutButton } from '@/components/auth/sign-out-button'
import { signOut } from '@/app/(auth)/auth-actions'
import { clearSessionValidated } from '@/lib/app-lock-session'

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

jest.mock('@/app/(auth)/auth-actions', () => ({
  signOut: jest.fn(),
}))

jest.mock('@/lib/app-lock-session', () => ({
  clearSessionValidated: jest.fn(),
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

  it('continues with the admin redirect after confirmation', () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true)

    render(<SignOutButton variant="danger" />)
    fireEvent.click(screen.getByRole('button', { name: /cerrar sesión/i }))

    expect(clearSessionValidated).toHaveBeenCalled()
    expect(signOut).toHaveBeenCalledWith('/login/admin')
  })
})