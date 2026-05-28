import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AdminMFASetupPage from '../page'
import { enrollAdminTotp, verifyAdminTotpSetup } from '@/app/(auth)/auth-actions'

const replace = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}))

jest.mock('@/app/(auth)/auth-actions', () => ({
  enrollAdminTotp: jest.fn(),
  verifyAdminTotpSetup: jest.fn(),
}))

const mockEnrollAdminTotp = enrollAdminTotp as jest.MockedFunction<typeof enrollAdminTotp>
const mockVerifyAdminTotpSetup = verifyAdminTotpSetup as jest.MockedFunction<typeof verifyAdminTotpSetup>

describe('AdminMFASetupPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockEnrollAdminTotp.mockResolvedValue({ factorId: 'factor-1', qrCode: 'data:image/png;base64,qr', secret: 'SECRET123' })
  })

  it('enrola factor, muestra QR y verifica codigo', async () => {
    mockVerifyAdminTotpSetup.mockResolvedValue({ error: 'Código incorrecto' })

    render(<AdminMFASetupPage />)

    expect(await screen.findByAltText('Código QR para autenticación')).toHaveAttribute('src', 'data:image/png;base64,qr')
    expect(screen.getByText('SECRET123')).toBeInTheDocument()
    const input = screen.getByPlaceholderText('000000')
    fireEvent.change(input, { target: { value: '12a34b56' } })
    fireEvent.click(screen.getByRole('button', { name: 'Activar 2FA' }))

    await waitFor(() => expect(mockVerifyAdminTotpSetup).toHaveBeenCalled())
    expect(await screen.findByText('Código incorrecto')).toBeInTheDocument()
  })

  it('redirige al login si la sesion expiro durante enrollment', async () => {
    mockEnrollAdminTotp.mockResolvedValue({ error: 'Sesión expirada', sessionExpired: true })

    render(<AdminMFASetupPage />)

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login/admin'))
  })

  it('muestra error de enrollment y deja el boton deshabilitado sin factor', async () => {
    mockEnrollAdminTotp.mockResolvedValue({ error: 'No autorizado' })

    render(<AdminMFASetupPage />)

    expect(await screen.findByText('No autorizado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Activar 2FA' })).toBeDisabled()
  })
})
