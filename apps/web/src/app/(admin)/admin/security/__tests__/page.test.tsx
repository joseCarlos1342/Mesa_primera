import { render, screen } from '@testing-library/react'
import AdminSecurityPage from '../page'
import { AdminSecurityPanel } from '../AdminSecurityPanel'
import { getAdminSecuritySnapshot } from '@/app/actions/admin-security'

jest.mock('@/app/actions/admin-security', () => ({
  getAdminSecuritySnapshot: jest.fn(),
  requestAdminEmailChange: jest.fn(),
  requestAdminPasswordReset: jest.fn(),
  resetAdminTotpFactor: jest.fn(),
  rotateAdminRecoveryCodes: jest.fn(),
  revokeOtherAdminSessions: jest.fn(),
  signOutAllAdminSessions: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

const mockGetAdminSecuritySnapshot = getAdminSecuritySnapshot as jest.MockedFunction<typeof getAdminSecuritySnapshot>

const secureSnapshot = {
  email: 'admin@mesa.test',
  hasTotpFactor: true,
  currentAal: 'aal2',
  nextAal: 'aal2',
  activeRecoveryCodes: 8,
}

describe('AdminSecurityPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetAdminSecuritySnapshot.mockResolvedValue(secureSnapshot)
  })

  it('muestra estado de seguridad actual y monta el panel', async () => {
    render(await AdminSecurityPage())

    expect(mockGetAdminSecuritySnapshot).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('link', { name: /volver al panel/i })).toHaveAttribute('href', '/admin')
    expect(screen.getByRole('heading', { name: /blindaje de acceso/i })).toBeInTheDocument()
    expect(screen.getByText('TOTP verificado · AAL2')).toBeInTheDocument()
    expect(screen.getByText('Cambio endurecido de email')).toBeInTheDocument()
  })
})

describe('AdminSecurityPanel', () => {
  it('renderiza controles endurecidos para email, TOTP, recovery codes y sesiones', () => {
    render(<AdminSecurityPanel snapshot={secureSnapshot} />)

    expect(screen.getByText('Correo actual:')).toBeInTheDocument()
    expect(screen.getAllByText('admin@mesa.test')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Solicitar cambio' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar enlace' })).toBeInTheDocument()
    expect(screen.getByText('Factor TOTP activo y verificado.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Eliminar y volver a configurar' })).toBeInTheDocument()
    expect(screen.getByText('Códigos activos:')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Regenerar códigos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Revocar otras' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cerrar todo' })).toBeInTheDocument()
  })

  it('muestra estado pendiente cuando no hay TOTP verificado', () => {
    render(<AdminSecurityPanel snapshot={{ ...secureSnapshot, hasTotpFactor: false, activeRecoveryCodes: 0 }} />)

    expect(screen.getByText('No hay factor TOTP verificado.')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})
