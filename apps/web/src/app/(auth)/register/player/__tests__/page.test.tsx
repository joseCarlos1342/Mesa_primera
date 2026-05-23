import { fireEvent, render, screen } from '@testing-library/react'
import { useActionState } from 'react'

import PlayerRegisterPage from '../page'
import { registerPlayer } from '../../../auth-actions'

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useActionState: jest.fn(),
}))

jest.mock('../../../auth-actions', () => ({
  registerPlayer: jest.fn(),
}))

jest.mock('@/components/auth/google-sign-in-button', () => ({
  GoogleSignInButton: ({ label }: { label: string }) => <button type="button">{label}</button>,
}))

jest.mock('@/components/auth/turnstile-widget', () => ({
  TurnstileWidget: () => <div data-testid="turnstile-widget">Turnstile</div>,
}))

const mockUseActionState = useActionState as unknown as jest.Mock

type RegisterActionTuple = [unknown, jest.Mock, boolean]

function setupActionState(tuple: RegisterActionTuple = [null, jest.fn(), false]) {
  mockUseActionState.mockImplementation((action: unknown) => {
    if (action === registerPlayer) return tuple
    throw new Error('Unexpected action passed to useActionState mock')
  })
}

function renderPage() {
  return render(<PlayerRegisterPage />)
}

function getHiddenAvatarInput() {
  return document.querySelector('input[name="avatarId"]') as HTMLInputElement
}

describe('PlayerRegisterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupActionState()
  })

  it('renderiza formulario base, widgets y avatar hidden input inicial', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: /regístrate/i, level: 2 })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Jose Carlos')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('AsDelDestino')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('3001234567')).toBeInTheDocument()
    expect(screen.getByTestId('turnstile-widget')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /registrarme con google/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /entrar ahora/i })).toHaveAttribute('href', '/login/player')
    expect(screen.getByText('0/20')).toBeInTheDocument()
    expect(getHiddenAvatarInput()).toHaveValue('as-oros')
    expect(screen.getByRole('button', { name: /reclamar mi lugar/i })).toBeEnabled()
  })

  it('muestra error global del server action y pending state del submit', () => {
    setupActionState([{ error: 'No pudimos registrarte' }, jest.fn(), true])
    renderPage()

    expect(screen.getByText(/no pudimos registrarte/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /registrando/i })).toBeDisabled()
  })

  it('valida nombre real inválido y luego limpia el error con un valor válido', () => {
    renderPage()

    const fullNameInput = screen.getByPlaceholderText('Jose Carlos')
    fireEvent.blur(fullNameInput, { target: { value: 'J' } })

    expect(screen.getByText(/solo letras, espacios y guiones/i)).toBeInTheDocument()

    fireEvent.change(fullNameInput, { target: { value: 'Jose Carlos' } })
    fireEvent.blur(fullNameInput, { target: { value: 'Jose Carlos' } })

    expect(screen.queryByText(/entre 2 y 80 caracteres/i)).not.toBeInTheDocument()
    expect(screen.getAllByText('✓').length).toBeGreaterThan(0)
  })

  it('actualiza contador de nickname y valida error local', () => {
    renderPage()

    const nicknameInput = screen.getByPlaceholderText('AsDelDestino')
    fireEvent.change(nicknameInput, { target: { value: 'ab' } })
    fireEvent.blur(nicknameInput, { target: { value: 'ab' } })

    expect(screen.getByText('2/20')).toBeInTheDocument()
    expect(screen.getByText(/solo letras, números y guión bajo/i)).toBeInTheDocument()

    fireEvent.change(nicknameInput, { target: { value: 'AsDelDestino' } })
    fireEvent.blur(nicknameInput, { target: { value: 'AsDelDestino' } })

    expect(screen.getByText('12/20')).toBeInTheDocument()
    expect(screen.queryByText(/solo letras, números y guión bajo/i)).not.toBeInTheDocument()
  })

  it('sanea teléfono a solo dígitos y valida error local', () => {
    renderPage()

    const phoneInput = screen.getByPlaceholderText('3001234567') as HTMLInputElement
    fireEvent.change(phoneInput, { target: { value: '30a-1' } })

    expect(phoneInput.value).toBe('301')

    fireEvent.blur(phoneInput, { target: { value: '301' } })
    expect(screen.getByText(/número inválido/i)).toBeInTheDocument()

    fireEvent.change(phoneInput, { target: { value: '3001234567' } })
    fireEvent.blur(phoneInput, { target: { value: '3001234567' } })

    expect(screen.queryByText(/número inválido/i)).not.toBeInTheDocument()
  })

  it('prioriza fieldErrors del servidor sobre errores locales', () => {
    setupActionState([{ fieldErrors: { nickname: 'Apodo ya registrado', phone: 'Este número ya está registrado' } }, jest.fn(), false])
    renderPage()

    expect(screen.getByText(/apodo ya registrado/i)).toBeInTheDocument()
    expect(screen.getByText(/este número ya está registrado/i)).toBeInTheDocument()
  })

  it('actualiza el hidden input cuando se selecciona otro avatar y permite expandir más identidades', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /ficha elite/i }))
    expect(getHiddenAvatarInput()).toHaveValue('ficha-maestra')

    fireEvent.click(screen.getByRole('button', { name: /ver más identidades/i }))
    fireEvent.click(screen.getByRole('button', { name: /reina de diamantes/i }))

    expect(getHiddenAvatarInput()).toHaveValue('reina-diamantes')
  })
})
