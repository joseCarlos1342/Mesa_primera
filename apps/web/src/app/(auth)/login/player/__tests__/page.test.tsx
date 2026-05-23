import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useActionState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import PlayerLoginPage from '../page'
import { checkPhoneHasPin, loginWithPhone, loginWithPin } from '../../../auth-actions'
import { getPasskeyLoginOptions, verifyPasskeyLogin } from '../../../passkey-actions'
import { startAuthentication } from '@simplewebauthn/browser'
import { setAuthBypass } from '@/lib/app-lock-session'

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useActionState: jest.fn(),
  useTransition: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

jest.mock('../../../auth-actions', () => ({
  loginWithPin: jest.fn(),
  loginWithPhone: jest.fn(),
  checkPhoneHasPin: jest.fn(),
}))

jest.mock('../../../passkey-actions', () => ({
  getPasskeyLoginOptions: jest.fn(),
  verifyPasskeyLogin: jest.fn(),
}))

jest.mock('@simplewebauthn/browser', () => ({
  startAuthentication: jest.fn(),
}))

jest.mock('@/lib/app-lock-session', () => ({
  setAuthBypass: jest.fn(),
}))

jest.mock('@/components/auth/google-sign-in-button', () => ({
  GoogleSignInButton: ({ label }: { label: string }) => <button type="button">{label}</button>,
}))

jest.mock('@/components/auth/turnstile-widget', () => ({
  TurnstileWidget: () => <div data-testid="turnstile-widget">Turnstile</div>,
}))

const mockUseActionState = useActionState as unknown as jest.Mock
const mockUseTransition = useTransition as unknown as jest.Mock
const mockUseRouter = useRouter as unknown as jest.Mock
const mockUseSearchParams = useSearchParams as unknown as jest.Mock
const mockCheckPhoneHasPin = checkPhoneHasPin as jest.MockedFunction<typeof checkPhoneHasPin>
const mockGetPasskeyLoginOptions = getPasskeyLoginOptions as jest.MockedFunction<typeof getPasskeyLoginOptions>
const mockVerifyPasskeyLogin = verifyPasskeyLogin as jest.MockedFunction<typeof verifyPasskeyLogin>
const mockStartAuthentication = startAuthentication as jest.MockedFunction<typeof startAuthentication>
const mockSetAuthBypass = setAuthBypass as jest.MockedFunction<typeof setAuthBypass>
let currentPinTuple: ActionStateTuple
let currentOtpTuple: ActionStateTuple

type ActionStateTuple = [unknown, jest.Mock, boolean]

function setupActionStates(
  pinTuple: ActionStateTuple = [null, jest.fn(), false],
  otpTuple: ActionStateTuple = [null, jest.fn(), false],
) {
  currentPinTuple = pinTuple
  currentOtpTuple = otpTuple
  mockUseActionState.mockImplementation((action: unknown) => {
    if (action === loginWithPin) return currentPinTuple
    if (action === loginWithPhone) return currentOtpTuple
    throw new Error('Unexpected action passed to useActionState mock')
  })
}

function setupSearchParams(values: Record<string, string | null> = {}) {
  mockUseSearchParams.mockReturnValue({
    get: jest.fn((key: string) => values[key] ?? null),
  })
}

function renderPage() {
  return render(<PlayerLoginPage />)
}

async function fillPhoneAndBlur(value: string) {
  const input = screen.getByPlaceholderText('3001234567')
  fireEvent.change(input, { target: { value } })
  fireEvent.blur(input)
  await waitFor(() => expect(input).toHaveValue(value.replace(/\D/g, '')))
}

function fillPin(value: string) {
  const input = screen.getByPlaceholderText('••••••')
  fireEvent.change(input, { target: { value } })
  return input
}

describe('PlayerLoginPage', () => {
  const push = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({ push })
    setupSearchParams()
    setupActionStates()
    mockUseTransition.mockReturnValue([
      false,
      (callback: () => void | Promise<void>) => {
        void callback()
      },
    ])
    mockCheckPhoneHasPin.mockResolvedValue(true)
    mockGetPasskeyLoginOptions.mockResolvedValue({ available: false })
    mockVerifyPasskeyLogin.mockResolvedValue({ ok: false, error: 'Error en la verificación.' } as never)
    mockStartAuthentication.mockResolvedValue({ id: 'assertion-id' } as never)
  })

  it('renderiza el login base con PIN, turnstile y links clave', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: /bienvenido/i, level: 2 })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('3001234567')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••')).toBeInTheDocument()
    expect(screen.getByTestId('turnstile-widget')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ingresar con google/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /recupérala aquí/i })).toHaveAttribute('href', '/recovery')
    expect(screen.getByRole('link', { name: /regístrate aquí/i })).toHaveAttribute('href', '/register/player')
    expect(screen.getByRole('button', { name: /entrar a jugar/i })).toBeEnabled()
  })

  it('muestra alertas por kicked session y error oauth desde search params', () => {
    setupSearchParams({ kicked: 'true', error: 'GoogleFalló' })
    renderPage()

    expect(screen.getByText(/tu sesión anterior ha expirado/i)).toBeInTheDocument()
    expect(screen.getByText(/error de autenticación con google: googlefalló/i)).toBeInTheDocument()
  })

  it('valida teléfono inválido localmente y sanea caracteres no numéricos', async () => {
    renderPage()

    await fillPhoneAndBlur('30a')

    expect(screen.getByPlaceholderText('3001234567')).toHaveValue('30')
    expect(screen.getByText(/número inválido|10 dígitos|debe empezar por 3/i)).toBeInTheDocument()
  })

  it('valida PIN inválido localmente y sanea caracteres no numéricos', () => {
    renderPage()

    const pinInput = fillPin('12a')
    fireEvent.blur(pinInput)

    expect(pinInput).toHaveValue('12')
    expect(screen.getByText(/exactamente 6 dígitos numéricos/i)).toBeInTheDocument()
  })

  it('cambia a flujo OTP cuando el teléfono no tiene PIN', async () => {
    mockCheckPhoneHasPin.mockResolvedValue(false)
    renderPage()

    await fillPhoneAndBlur('3001234567')

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('••••••')).not.toBeInTheDocument()
    })
    expect(screen.getByText(/tu cuenta aún no tiene clave/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enviar código sms/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /recupérala aquí/i })).not.toBeInTheDocument()
  })

  it('mantiene flujo PIN cuando checkPhoneHasPin retorna null', async () => {
    mockCheckPhoneHasPin.mockResolvedValue(null)
    renderPage()

    await fillPhoneAndBlur('3001234567')

    await waitFor(() => {
      expect(screen.getByPlaceholderText('••••••')).toBeInTheDocument()
    })
    expect(screen.queryByText(/tu cuenta aún no tiene clave/i)).not.toBeInTheDocument()
  })

  it('muestra indicador de chequeo mientras useTransition reporta pending', async () => {
    mockUseTransition.mockReturnValue([
      true,
      (callback: () => void | Promise<void>) => {
        void callback()
      },
    ])
    renderPage()

    await fillPhoneAndBlur('3001234567')

    expect(screen.getByText('...')).toBeInTheDocument()
  })

  it('renderiza error del server action PIN y pending state del submit', () => {
    setupActionStates([{ error: 'Número o clave incorrectos.' }, jest.fn(), true], [null, jest.fn(), false])
    renderPage()

    expect(screen.getByText(/número o clave incorrectos/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /autenticando/i })).toBeDisabled()
  })

  it('prioriza fieldErrors de OTP cuando el flujo cambió a hasPin false', async () => {
    mockCheckPhoneHasPin.mockResolvedValue(false)
    setupActionStates(
      [null, jest.fn(), false],
      [{ fieldErrors: { phone: 'Teléfono bloqueado temporalmente' }, error: 'OTP falló' }, jest.fn(), false],
    )
    renderPage()

    await fillPhoneAndBlur('3001234567')

    await waitFor(() => {
      expect(screen.getByText(/teléfono bloqueado temporalmente/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/otp falló/i)).toBeInTheDocument()
  })

  it('muestra botón de huella cuando hay passkey disponible', async () => {
    mockGetPasskeyLoginOptions.mockResolvedValue({ available: true })
    renderPage()

    await fillPhoneAndBlur('3001234567')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /entrar con huella/i })).toBeInTheDocument()
    })
  })

  it('muestra error cuando no hay opciones de passkey disponibles al intentar login biométrico', async () => {
    mockGetPasskeyLoginOptions
      .mockResolvedValueOnce({ available: true })
      .mockResolvedValueOnce({ available: false })

    renderPage()
    await fillPhoneAndBlur('3001234567')

    fireEvent.click(await screen.findByRole('button', { name: /entrar con huella/i }))

    await waitFor(() => {
      expect(screen.getByText(/no hay huella registrada para este dispositivo/i)).toBeInTheDocument()
    })
  })

  it('muestra error si el usuario cancela o falla startAuthentication', async () => {
    mockGetPasskeyLoginOptions
      .mockResolvedValueOnce({ available: true })
      .mockResolvedValueOnce({ available: true, options: { challenge: 'abc' } as never })
    mockStartAuthentication.mockRejectedValueOnce(new Error('cancelled'))

    renderPage()
    await fillPhoneAndBlur('3001234567')

    fireEvent.click(await screen.findByRole('button', { name: /entrar con huella/i }))

    await waitFor(() => {
      expect(screen.getByText(/verificación biométrica cancelada o fallida/i)).toBeInTheDocument()
    })
  })

  it('hace bypass y navega al inicio cuando la passkey verifica correctamente', async () => {
    mockGetPasskeyLoginOptions
      .mockResolvedValueOnce({ available: true })
      .mockResolvedValueOnce({ available: true, options: { challenge: 'abc' } as never })
    mockVerifyPasskeyLogin.mockResolvedValueOnce({ ok: true } as never)

    renderPage()
    await fillPhoneAndBlur('3001234567')

    fireEvent.click(await screen.findByRole('button', { name: /entrar con huella/i }))

    await waitFor(() => {
      expect(mockSetAuthBypass).toHaveBeenCalledTimes(1)
      expect(push).toHaveBeenCalledWith('/')
    })
  })
})
