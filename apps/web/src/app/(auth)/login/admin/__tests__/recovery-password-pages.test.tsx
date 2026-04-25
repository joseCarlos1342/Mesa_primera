import { render, screen, waitFor } from '@testing-library/react'
import { useActionState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AdminRecoveryPage from '../recovery/page'
import AdminPasswordResetPage from '../password/page'
import { createClient } from '@/utils/supabase/client'

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useActionState: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

jest.mock('@/app/actions/admin-security', () => ({
  requestAdminPasswordReset: jest.fn(),
  completeAdminPasswordReset: jest.fn(),
}))

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}))

const mockUseActionState = useActionState as unknown as jest.Mock
const mockUseRouter = useRouter as unknown as jest.Mock
const mockUseSearchParams = useSearchParams as unknown as jest.Mock
const mockCreateClient = createClient as unknown as jest.Mock

describe('Admin recovery and password reset pages', () => {
  const push = jest.fn()
  const formAction = jest.fn()
  const unsubscribe = jest.fn()
  const getSession = jest.fn()
  const setSession = jest.fn()
  const onAuthStateChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    window.history.replaceState({}, '', '/login/admin/password')
    mockUseRouter.mockReturnValue({ push })
    mockUseSearchParams.mockReturnValue({ get: jest.fn().mockReturnValue(null) })
    mockUseActionState.mockReturnValue([null, formAction, false])
    getSession.mockResolvedValue({ data: { session: { user: { id: 'admin-123' } } }, error: null })
    setSession.mockResolvedValue({ data: { session: { user: { id: 'admin-123' } } }, error: null })
    onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe } } })
    mockCreateClient.mockReturnValue({
      auth: {
        getSession,
        setSession,
        onAuthStateChange,
      },
    })
  })

  afterEach(() => {
    window.history.replaceState({}, '', '/login/admin/password')
  })

  it('does not render a back-to-login link on the recovery page', () => {
    render(<AdminRecoveryPage />)

    expect(screen.queryByRole('link', { name: /volver/i })).not.toBeInTheDocument()
  })

  it('does not render a back-to-login link on the password reset page', async () => {
    render(<AdminPasswordResetPage />)

    await waitFor(() => {
      expect(getSession).toHaveBeenCalled()
    })

    expect(screen.queryByRole('link', { name: /volver/i })).not.toBeInTheDocument()
  })

  it('redirects to admin login after a successful password reset', async () => {
    mockUseActionState.mockReturnValue([
      { success: 'Contraseña actualizada. Ya puedes volver al panel.' },
      formAction,
      false,
    ])

    render(<AdminPasswordResetPage />)

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/login/admin')
    })
  })

  it('initializes the browser recovery session on the password reset page', async () => {
    render(<AdminPasswordResetPage />)

    await waitFor(() => {
      expect(mockCreateClient).toHaveBeenCalled()
      expect(getSession).toHaveBeenCalled()
      expect(onAuthStateChange).toHaveBeenCalled()
    })
  })

  it('hydrates a recovery session from the URL hash before showing the link as invalid', async () => {
    window.history.replaceState(
      {},
      '',
      '/login/admin/password#access_token=token-123&refresh_token=refresh-456&type=recovery'
    )
    getSession
      .mockResolvedValueOnce({ data: { session: null }, error: null })
      .mockResolvedValue({ data: { session: { user: { id: 'admin-123' } } }, error: null })

    render(<AdminPasswordResetPage />)

    await waitFor(() => {
      expect(setSession).toHaveBeenCalledWith({
        access_token: 'token-123',
        refresh_token: 'refresh-456',
      })
    })
  })
})