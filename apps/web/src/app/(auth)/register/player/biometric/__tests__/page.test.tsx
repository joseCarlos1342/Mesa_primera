import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { startRegistration } from '@simplewebauthn/browser'
import { setAuthBypass } from '@/lib/app-lock-session'
import { getPasskeyRegistrationOptions, verifyPasskeyRegistration } from '@/app/(auth)/passkey-actions'
import BiometricSetupPage from '../page'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@simplewebauthn/browser', () => ({
  startRegistration: jest.fn(),
}))

jest.mock('@/lib/app-lock-session', () => ({
  setAuthBypass: jest.fn(),
}))

jest.mock('@/app/(auth)/passkey-actions', () => ({
  getPasskeyRegistrationOptions: jest.fn(),
  verifyPasskeyRegistration: jest.fn(),
}))

const mockUseRouter = useRouter as unknown as jest.Mock
const mockStartRegistration = startRegistration as jest.MockedFunction<typeof startRegistration>
const mockSetAuthBypass = setAuthBypass as jest.MockedFunction<typeof setAuthBypass>
const mockGetPasskeyRegistrationOptions = getPasskeyRegistrationOptions as jest.MockedFunction<typeof getPasskeyRegistrationOptions>
const mockVerifyPasskeyRegistration = verifyPasskeyRegistration as jest.MockedFunction<typeof verifyPasskeyRegistration>

function setBiometricSupport(value: boolean | Promise<boolean>) {
  Object.defineProperty(window, 'PublicKeyCredential', {
    configurable: true,
    value: {
      isUserVerifyingPlatformAuthenticatorAvailable: jest.fn(() => Promise.resolve(value)),
    },
  })
  Object.defineProperty(globalThis, 'PublicKeyCredential', {
    configurable: true,
    value: window.PublicKeyCredential,
  })
}

describe('BiometricSetupPage', () => {
  const push = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockUseRouter.mockReturnValue({ push })
    setBiometricSupport(true)
    mockGetPasskeyRegistrationOptions.mockResolvedValue({ options: { challenge: 'challenge-1' } } as never)
    mockStartRegistration.mockResolvedValue({ id: 'registration-1' } as never)
    mockVerifyPasskeyRegistration.mockResolvedValue({ ok: true, credentialId: 'credential-1' } as never)
    Object.defineProperty(document, 'cookie', { configurable: true, value: 'device_trusted_id=device-1' })
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('muestra loader mientras verifica soporte biometrico', () => {
    render(<BiometricSetupPage />)

    expect(screen.getByText(/verificando compatibilidad/i)).toBeInTheDocument()
  })

  it('redirige al inicio si el dispositivo no soporta biometria', async () => {
    setBiometricSupport(false)

    render(<BiometricSetupPage />)

    await waitFor(() => expect(push).toHaveBeenCalledWith('/'))
  })

  it('registra passkey con device cookie, hace bypass y redirige despues del exito', async () => {
    render(<BiometricSetupPage />)

    fireEvent.click(await screen.findByRole('button', { name: /sí, activar huella/i }))

    await waitFor(() => expect(mockVerifyPasskeyRegistration).toHaveBeenCalledWith({ id: 'registration-1' }, 'device-1'))
    expect(mockSetAuthBypass).toHaveBeenCalledTimes(1)
    expect(screen.getByText('¡Listo!')).toBeInTheDocument()

    act(() => {
      jest.advanceTimersByTime(1500)
    })
    expect(push).toHaveBeenCalledWith('/')
  })

  it('permite saltar biometria sin registrar passkey', async () => {
    render(<BiometricSetupPage />)

    fireEvent.click(await screen.findByRole('button', { name: /ahora no/i }))

    expect(mockSetAuthBypass).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith('/')
    expect(mockGetPasskeyRegistrationOptions).not.toHaveBeenCalled()
  })

  it('muestra error si el usuario cancela la verificacion biometrica', async () => {
    mockStartRegistration.mockRejectedValueOnce(new Error('NotAllowedError'))
    render(<BiometricSetupPage />)

    fireEvent.click(await screen.findByRole('button', { name: /sí, activar huella/i }))

    expect(await screen.findByText(/verificación cancelada/i)).toBeInTheDocument()
  })
})
