import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useActionState } from 'react'
import { completeGoogleRegistration, getGoogleUserData } from '@/app/(auth)/auth-actions'
import CompleteGoogleRegistrationPage from '../page'

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useActionState: jest.fn(),
}))

jest.mock('@/app/(auth)/auth-actions', () => ({
  completeGoogleRegistration: jest.fn(),
  getGoogleUserData: jest.fn(),
}))

jest.mock('@/components/auth/avatar-selector', () => ({
  AvatarSelector: ({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) => (
    <div>
      <p>Avatar actual: {selectedId}</p>
      <button type="button" onClick={() => onSelect('rey-copas')}>Elegir rey</button>
    </div>
  ),
}))

const mockUseActionState = useActionState as unknown as jest.Mock
const mockGetGoogleUserData = getGoogleUserData as jest.MockedFunction<typeof getGoogleUserData>

describe('CompleteGoogleRegistrationPage', () => {
  const formAction = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseActionState.mockImplementation((action: unknown) => {
      if (action !== completeGoogleRegistration) throw new Error('Unexpected action')
      return [null, formAction, false]
    })
    mockGetGoogleUserData.mockResolvedValue({ fullName: 'Ana Google', email: 'ana@google.test', avatarUrl: 'https://avatar.test/ana.png' })
  })

  it('precarga datos de Google, valida campos y actualiza avatar oculto', async () => {
    const { container } = render(<CompleteGoogleRegistrationPage />)

    expect(await screen.findByText('ana@google.test')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Jose Carlos')).toHaveValue('Ana Google')

    const nickname = screen.getByPlaceholderText('AsDelDestino')
    fireEvent.change(nickname, { target: { value: 'apodo con espacios' } })
    fireEvent.blur(nickname)
    expect(screen.getByText(/sin espacios|letras/i)).toBeInTheDocument()

    const phone = screen.getByPlaceholderText('3001234567')
    fireEvent.change(phone, { target: { value: '30a' } })
    expect(phone).toHaveValue('30')
    fireEvent.blur(phone)
    expect(screen.getByText(/10 dígitos|debe empezar/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Elegir rey' }))
    expect(container.querySelector('input[name="avatarId"]')).toHaveValue('rey-copas')
  })

  it('muestra errores server-side y estado pending', async () => {
    mockUseActionState.mockReturnValue([
      { error: 'Perfil incompleto', fieldErrors: { fullName: 'Nombre requerido', phone: 'Telefono duplicado' } },
      formAction,
      true,
    ])

    render(<CompleteGoogleRegistrationPage />)

    await waitFor(() => expect(mockGetGoogleUserData).toHaveBeenCalledTimes(1))
    expect(screen.getByText('Perfil incompleto')).toBeInTheDocument()
    expect(screen.getByText('Nombre requerido')).toBeInTheDocument()
    expect(screen.getByText('Telefono duplicado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /guardando/i })).toBeDisabled()
  })

  it('limpia errores locales y muestra campos válidos al corregir el perfil', async () => {
    render(<CompleteGoogleRegistrationPage />)

    const fullName = screen.getByPlaceholderText('Jose Carlos')
    const nickname = screen.getByPlaceholderText('AsDelDestino')
    const phone = screen.getByPlaceholderText('3001234567')

    fireEvent.blur(fullName, { target: { value: '' } })
    fireEvent.change(fullName, { target: { value: 'Ana Jugadora' } })
    fireEvent.blur(nickname, { target: { value: 'apodo invalido' } })
    fireEvent.change(nickname, { target: { value: 'Ana_2026' } })
    fireEvent.blur(phone, { target: { value: '301' } })
    fireEvent.change(phone, { target: { value: '3001234567' } })

    expect(screen.queryByText(/nombre.*requerido/i)).not.toBeInTheDocument()
    expect(nickname).toHaveClass('border-green-500/40')
    expect(screen.getAllByText('✓')).toHaveLength(3)
  })

  it('mantiene el formulario disponible cuando Google no aporta datos', async () => {
    mockGetGoogleUserData.mockResolvedValue(null)

    render(<CompleteGoogleRegistrationPage />)

    await waitFor(() => expect(mockGetGoogleUserData).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('Conectado como')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('Jose Carlos')).toHaveValue('')
  })
})
