import { render, screen, waitFor, act } from '@testing-library/react'
import { useActionState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
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

  describe('AdminRecoveryPage — branches', () => {
    it('muestra el banner de "enlace expirado" cuando el query string tiene error=invalid_or_expired_link', () => {
      mockUseSearchParams.mockReturnValue({
        get: jest.fn((key: string) => (key === 'error' ? 'invalid_or_expired_link' : null)),
      })

      render(<AdminRecoveryPage />)

      expect(
        screen.getByText(/El enlace ya expiró o no es válido. Solicita uno nuevo\./),
      ).toBeInTheDocument()
    })

    it('muestra el mensaje de error de la server action cuando useActionState devuelve state.error', () => {
      mockUseActionState.mockReturnValue([
        { error: 'Servicio de correo no disponible.' },
        formAction,
        false,
      ])

      render(<AdminRecoveryPage />)

      expect(screen.getByText('Servicio de correo no disponible.')).toBeInTheDocument()
    })

    it('muestra el mensaje de éxito de la server action cuando useActionState devuelve state.success', () => {
      mockUseActionState.mockReturnValue([
        { success: 'Revisa tu correo. Te enviamos un enlace firmado.' },
        formAction,
        false,
      ])

      render(<AdminRecoveryPage />)

      expect(
        screen.getByText('Revisa tu correo. Te enviamos un enlace firmado.'),
      ).toBeInTheDocument()
    })

    it('muestra el error de validación del email cuando fieldErrors.email está presente', () => {
      mockUseActionState.mockReturnValue([
        { fieldErrors: { email: 'Ingresa un correo válido' } },
        formAction,
        false,
      ])

      render(<AdminRecoveryPage />)

      expect(screen.getByText('Ingresa un correo válido')).toBeInTheDocument()
    })

    it('cambia la etiqueta del botón a "Enviando enlace..." y lo deshabilita cuando isPending=true', () => {
      mockUseActionState.mockReturnValue([null, formAction, true])

      render(<AdminRecoveryPage />)

      const button = screen.getByRole('button', { name: 'Enviando enlace...' })
      expect(button).toBeDisabled()
    })
  })

  describe('AdminPasswordResetPage — branches', () => {
    it('cae al flujo de getSession y marca el enlace como inválido cuando el hash no tiene tokens', async () => {
      window.history.replaceState({}, '', '/login/admin/password#unrelated=hash')
      getSession.mockResolvedValueOnce({ data: { session: null }, error: null })

      render(<AdminPasswordResetPage />)

      await waitFor(() => {
        expect(getSession).toHaveBeenCalled()
      })
      expect(setSession).not.toHaveBeenCalled()
      expect(
        screen.getByText(/El enlace ya expiró o no es válido\. Solicita uno nuevo\./),
      ).toBeInTheDocument()
    })

    it('ignora el hash cuando el type no es "recovery"', async () => {
      window.history.replaceState(
        {},
        '',
        '/login/admin/password#access_token=t&refresh_token=r&type=magiclink',
      )

      render(<AdminPasswordResetPage />)

      await waitFor(() => {
        expect(getSession).toHaveBeenCalled()
      })
      expect(setSession).not.toHaveBeenCalled()
    })

    it('ignora el hash cuando falta el refresh_token', async () => {
      window.history.replaceState(
        {},
        '',
        '/login/admin/password#access_token=t&type=recovery',
      )

      render(<AdminPasswordResetPage />)

      await waitFor(() => {
        expect(getSession).toHaveBeenCalled()
      })
      expect(setSession).not.toHaveBeenCalled()
    })

    it('marca el enlace como inválido cuando setSession retorna error con tokens válidos', async () => {
      window.history.replaceState(
        {},
        '',
        '/login/admin/password#access_token=token-123&refresh_token=refresh-456&type=recovery',
      )
      setSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Invalid Refresh Token' },
      })

      render(<AdminPasswordResetPage />)

      await waitFor(() => {
        expect(setSession).toHaveBeenCalledWith({
          access_token: 'token-123',
          refresh_token: 'refresh-456',
        })
      })
      expect(
        screen.getByText(/El enlace ya expiró o no es válido\. Solicita uno nuevo\./),
      ).toBeInTheDocument()
    })

    it('marca el enlace como inválido cuando setSession OK pero devuelve session=null', async () => {
      window.history.replaceState(
        {},
        '',
        '/login/admin/password#access_token=token-123&refresh_token=refresh-456&type=recovery',
      )
      setSession.mockResolvedValueOnce({ data: { session: null }, error: null })

      render(<AdminPasswordResetPage />)

      await waitFor(() => {
        expect(setSession).toHaveBeenCalled()
      })
      expect(
        screen.getByText(/El enlace ya expiró o no es válido\. Solicita uno nuevo\./),
      ).toBeInTheDocument()
    })

    it('marca el enlace como inválido cuando getSession retorna error sin hash', async () => {
      getSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Network' },
      })

      render(<AdminPasswordResetPage />)

      await waitFor(() => {
        expect(getSession).toHaveBeenCalled()
      })
      expect(
        screen.getByText(/El enlace ya expiró o no es válido\. Solicita uno nuevo\./),
      ).toBeInTheDocument()
    })

    it('marca el enlace como inválido cuando getSession OK pero session=null sin hash', async () => {
      getSession.mockResolvedValueOnce({ data: { session: null }, error: null })

      render(<AdminPasswordResetPage />)

      await waitFor(() => {
        expect(getSession).toHaveBeenCalled()
      })
      expect(
        screen.getByText(/El enlace ya expiró o no es válido\. Solicita uno nuevo\./),
      ).toBeInTheDocument()
    })

    it('cambia el status a "ready" cuando onAuthStateChange notifica SIGNED_IN', async () => {
      let onChangeCb: ((event: string, session: Session | null) => void) | undefined
      onAuthStateChange.mockImplementationOnce((cb: (event: string, session: Session | null) => void) => {
        onChangeCb = cb
        return { data: { subscription: { unsubscribe } } }
      })
      // Make getSession never resolve to keep status=loading
      getSession.mockReturnValue(new Promise(() => undefined))

      render(<AdminPasswordResetPage />)

      await waitFor(() => {
        expect(onAuthStateChange).toHaveBeenCalled()
      })

      act(() => {
        onChangeCb?.('SIGNED_IN', { user: { id: 'admin-2' } } as any)
      })

      await waitFor(() => {
        expect(
          screen.queryByText(/El enlace ya expiró o no es válido/),
        ).not.toBeInTheDocument()
      })
    })

    it('cambia el status a "invalid" cuando onAuthStateChange notifica SIGNED_OUT', async () => {
      let onChangeCb: ((event: string, session: Session | null) => void) | undefined
      onAuthStateChange.mockImplementationOnce((cb: (event: string, session: Session | null) => void) => {
        onChangeCb = cb
        return { data: { subscription: { unsubscribe } } }
      })
      getSession.mockReturnValue(new Promise(() => undefined))

      render(<AdminPasswordResetPage />)

      await waitFor(() => {
        expect(onAuthStateChange).toHaveBeenCalled()
      })

      act(() => {
        onChangeCb?.('SIGNED_OUT', null)
      })

      await waitFor(() => {
        expect(
          screen.getByText(/El enlace ya expiró o no es válido\. Solicita uno nuevo\./),
        ).toBeInTheDocument()
      })
    })

    it('muestra el error de validación del password cuando fieldErrors.password está presente', async () => {
      mockUseActionState.mockReturnValue([
        { fieldErrors: { password: 'Mínimo 12 caracteres' } },
        formAction,
        false,
      ])

      render(<AdminPasswordResetPage />)

      await waitFor(() => {
        expect(getSession).toHaveBeenCalled()
      })
      expect(screen.getByText('Mínimo 12 caracteres')).toBeInTheDocument()
    })

    it('muestra el error de validación del passwordConfirm cuando fieldErrors.passwordConfirm está presente', async () => {
      mockUseActionState.mockReturnValue([
        { fieldErrors: { passwordConfirm: 'Las contraseñas no coinciden' } },
        formAction,
        false,
      ])

      render(<AdminPasswordResetPage />)

      await waitFor(() => {
        expect(getSession).toHaveBeenCalled()
      })
      expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument()
    })

    it('muestra el error de la server action cuando state.error está presente', async () => {
      mockUseActionState.mockReturnValue([
        { error: 'No fue posible actualizar la contraseña.' },
        formAction,
        false,
      ])

      render(<AdminPasswordResetPage />)

      await waitFor(() => {
        expect(getSession).toHaveBeenCalled()
      })
      expect(screen.getByText('No fue posible actualizar la contraseña.')).toBeInTheDocument()
    })

    it('cambia la etiqueta del botón a "Actualizando..." cuando isPending=true', async () => {
      mockUseActionState.mockReturnValue([null, formAction, true])

      render(<AdminPasswordResetPage />)

      await waitFor(() => {
        expect(getSession).toHaveBeenCalled()
      })
      const button = screen.getByRole('button', { name: 'Actualizando...' })
      expect(button).toBeDisabled()
    })

    it('muestra la etiqueta "Validando enlace..." mientras recoverySessionStatus=loading', async () => {
      // getSession never resolves → status stays loading
      getSession.mockReturnValue(new Promise(() => undefined))

      render(<AdminPasswordResetPage />)

      await waitFor(() => {
        expect(getSession).toHaveBeenCalled()
      })
      const button = screen.getByRole('button', { name: 'Validando enlace...' })
      expect(button).toBeDisabled()
    })
  })
})