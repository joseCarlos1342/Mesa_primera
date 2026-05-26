import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ClientErrorSuppressor } from '../ClientErrorSuppressor'
import { LandscapeLockOverlay } from '../replay/LandscapeLockOverlay'
import { GoogleSignInButton } from '../auth/google-sign-in-button'
import { signInWithGoogle } from '@/app/(auth)/google-auth'

jest.mock('@/app/(auth)/google-auth', () => ({
  signInWithGoogle: jest.fn(),
}))

const mockSignInWithGoogle = signInWithGoogle as jest.MockedFunction<typeof signInWithGoogle>

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
}

describe('more zero coverage components', () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalConsoleError = console.error

  afterEach(() => {
    jest.clearAllMocks()
    console.error = originalConsoleError
    Object.defineProperty(process.env, 'NODE_ENV', {
      configurable: true,
      value: originalNodeEnv,
    })
  })

  it('muestra overlay de repeticion en mobile portrait y lo oculta en landscape', () => {
    setViewport(390, 844)
    render(<LandscapeLockOverlay />)

    expect(screen.getByTestId('replay-landscape-lock')).toBeInTheDocument()
    expect(screen.getByText('Gira tu teléfono')).toBeInTheDocument()

    setViewport(844, 390)
    fireEvent(window, new Event('resize'))

    expect(screen.queryByTestId('replay-landscape-lock')).not.toBeInTheDocument()
  })

  it('no muestra overlay de repeticion en desktop portrait', () => {
    setViewport(1200, 1600)

    render(<LandscapeLockOverlay />)

    expect(screen.queryByTestId('replay-landscape-lock')).not.toBeInTheDocument()
  })

  it('suprime solo errores benignos de LiveKit en development y restaura console.error', () => {
    const originalErrorMock = jest.fn()
    console.error = originalErrorMock
    Object.defineProperty(process.env, 'NODE_ENV', {
      configurable: true,
      value: 'development',
    })

    const { unmount } = render(<ClientErrorSuppressor />)

    console.error('Unknown DataChannel error on lossy')
    console.error('error real')

    expect(originalErrorMock).toHaveBeenCalledTimes(1)
    expect(originalErrorMock).toHaveBeenCalledWith('error real')

    unmount()
    expect(console.error).toBe(originalErrorMock)
  })

  it('no intercepta console.error fuera de development', () => {
    const originalErrorMock = jest.fn()
    console.error = originalErrorMock
    Object.defineProperty(process.env, 'NODE_ENV', {
      configurable: true,
      value: 'test',
    })

    render(<ClientErrorSuppressor />)

    console.error('Unknown DataChannel error on lossy')
    expect(originalErrorMock).toHaveBeenCalledWith('Unknown DataChannel error on lossy')
  })

  it('muestra label custom de Google y error si la accion falla', async () => {
    mockSignInWithGoogle.mockResolvedValue({ error: 'Google no disponible' })

    render(<GoogleSignInButton label="Entrar con Google" />)

    fireEvent.click(screen.getByRole('button', { name: /entrar con google/i }))

    expect(screen.getByText('Conectando...')).toBeInTheDocument()
    expect(await screen.findByText('Google no disponible')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /entrar con google/i })).toBeEnabled()
  })

  it('mantiene loading cuando Google inicia redirect sin error', async () => {
    mockSignInWithGoogle.mockResolvedValue({ error: null })

    render(<GoogleSignInButton />)

    fireEvent.click(screen.getByRole('button', { name: /continuar con google/i }))

    await waitFor(() => expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('button', { name: /conectando/i })).toBeDisabled()
  })
})
