import { render, screen, waitFor } from '@testing-library/react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
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

jest.mock('next/navigation', () => {
  const push = jest.fn()
  return {
    useRouter: jest.fn(() => ({ push })),
    __push: push,
  }
})

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useActionState: jest.fn(),
}))

const mockGetAdminSecuritySnapshot = getAdminSecuritySnapshot as jest.MockedFunction<typeof getAdminSecuritySnapshot>
const mockUseActionState = useActionState as unknown as jest.Mock
const mockUseRouter = useRouter as unknown as jest.Mock

const secureSnapshot = {
  email: 'admin@mesa.test',
  hasTotpFactor: true,
  currentAal: 'aal2',
  nextAal: 'aal2',
  activeRecoveryCodes: 8,
}

/** Six useActionState slots in declaration order: email, password, totp, recovery, revoke, global. */
function mockAllActionStates(
  overrides: Array<[unknown, jest.Mock, boolean]> = [],
) {
  const defaults: Array<[unknown, jest.Mock, boolean]> = [
    [null, jest.fn(), false],
    [null, jest.fn(), false],
    [null, jest.fn(), false],
    [null, jest.fn(), false],
    [null, jest.fn(), false],
    [null, jest.fn(), false],
  ]
  for (let i = 0; i < overrides.length; i += 1) {
    defaults[i] = overrides[i]
  }
  mockUseActionState.mockImplementation(() => defaults.shift())
}

describe('AdminSecurityPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetAdminSecuritySnapshot.mockResolvedValue(secureSnapshot)
    mockAllActionStates()
  })

  it('muestra estado de seguridad actual y monta el panel', async () => {
    render(await AdminSecurityPage())

    expect(mockGetAdminSecuritySnapshot).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('link', { name: /volver al panel/i })).toHaveAttribute('href', '/admin')
    expect(screen.getByRole('heading', { name: /blindaje de acceso/i })).toBeInTheDocument()
    expect(screen.getByText('TOTP verificado · AAL2')).toBeInTheDocument()
    expect(screen.getByText('Cambio endurecido de email')).toBeInTheDocument()
  })

  it('renderiza estado "TOTP pendiente · AAL1" cuando hasTotpFactor=false y currentAal=null', async () => {
    mockGetAdminSecuritySnapshot.mockResolvedValueOnce({
      ...secureSnapshot,
      hasTotpFactor: false,
      currentAal: null,
    })
    mockAllActionStates()

    render(await AdminSecurityPage())

    expect(screen.getByText('TOTP pendiente · AAL1')).toBeInTheDocument()
  })
})

describe('AdminSecurityPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAllActionStates()
  })

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

  it('muestra mensaje de error de la action de email cuando emailState.error está presente', () => {
    mockAllActionStates([
      [{ error: 'Código TOTP inválido.' }, jest.fn(), false],
    ])

    render(<AdminSecurityPanel snapshot={secureSnapshot} />)

    expect(screen.getByText('Código TOTP inválido.')).toBeInTheDocument()
  })

  it('muestra mensaje de éxito de la action de password cuando passwordState.success está presente', () => {
    mockAllActionStates([
      [null, jest.fn(), false],
      [{ success: 'Confirma el cambio desde tu correo actual.' }, jest.fn(), false],
    ])

    render(<AdminSecurityPanel snapshot={secureSnapshot} />)

    expect(
      screen.getByText('Confirma el cambio desde tu correo actual.'),
    ).toBeInTheDocument()
  })

  it('muestra error de validación del email cuando emailState.fieldErrors.email está presente', () => {
    mockAllActionStates([
      [{ fieldErrors: { email: 'Ingresa un correo válido' } }, jest.fn(), false],
    ])

    render(<AdminSecurityPanel snapshot={secureSnapshot} />)

    expect(screen.getByText('Ingresa un correo válido')).toBeInTheDocument()
  })

  it('muestra error de validación del código TOTP cuando totpState.fieldErrors.code está presente', () => {
    mockAllActionStates([
      [null, jest.fn(), false],
      [null, jest.fn(), false],
      [{ fieldErrors: { code: 'Código de 6 dígitos requerido' } }, jest.fn(), false],
    ])

    render(<AdminSecurityPanel snapshot={secureSnapshot} />)

    expect(screen.getByText('Código de 6 dígitos requerido')).toBeInTheDocument()
  })

  it('redirige al setup de TOTP cuando totpState.redirectTo está presente', async () => {
    mockAllActionStates([
      [null, jest.fn(), false],
      [null, jest.fn(), false],
      [{ redirectTo: '/login/admin/mfa/setup?reset=1' }, jest.fn(), false],
    ])

    render(<AdminSecurityPanel snapshot={secureSnapshot} />)

    await waitFor(() => {
      const push = mockUseRouter().push as jest.Mock
      expect(push).toHaveBeenCalledWith('/login/admin/mfa/setup?reset=1')
    })
  })

  it('redirige al login admin cuando globalState.redirectTo está presente', async () => {
    mockAllActionStates([
      [null, jest.fn(), false],
      [null, jest.fn(), false],
      [null, jest.fn(), false],
      [null, jest.fn(), false],
      [null, jest.fn(), false],
      [{ redirectTo: '/login/admin?revoked=1' }, jest.fn(), false],
    ])

    render(<AdminSecurityPanel snapshot={secureSnapshot} />)

    await waitFor(() => {
      const push = mockUseRouter().push as jest.Mock
      expect(push).toHaveBeenCalledWith('/login/admin?revoked=1')
    })
  })

  it('muestra los códigos de recuperación cuando recoveryState.recoveryCodes está presente', () => {
    mockAllActionStates([
      [null, jest.fn(), false],
      [null, jest.fn(), false],
      [null, jest.fn(), false],
      [
        {
          recoveryCodes: ['ABCD-EFGH-JKLM', 'NPQR-STUV-WXYZ'],
          success: 'Códigos regenerados.',
        },
        jest.fn(),
        false,
      ],
    ])

    render(<AdminSecurityPanel snapshot={secureSnapshot} />)

    expect(screen.getByText('Guárdalos fuera del panel')).toBeInTheDocument()
    expect(screen.getByText('ABCD-EFGH-JKLM')).toBeInTheDocument()
    expect(screen.getByText('NPQR-STUV-WXYZ')).toBeInTheDocument()
  })

  it('cambia la etiqueta del botón a "Validando..." cuando emailPending=true', () => {
    mockAllActionStates([
      [null, jest.fn(), true],
    ])

    render(<AdminSecurityPanel snapshot={secureSnapshot} />)

    expect(screen.getByRole('button', { name: 'Validando...' })).toBeInTheDocument()
  })

  it('cambia la etiqueta del botón a "Enviando..." cuando passwordPending=true', () => {
    mockAllActionStates([
      [null, jest.fn(), false],
      [null, jest.fn(), true],
    ])

    render(<AdminSecurityPanel snapshot={secureSnapshot} />)

    expect(screen.getByRole('button', { name: 'Enviando...' })).toBeInTheDocument()
  })

  it('cambia la etiqueta del botón a "Revocando..." cuando totpPending=true', () => {
    mockAllActionStates([
      [null, jest.fn(), false],
      [null, jest.fn(), false],
      [null, jest.fn(), true],
    ])

    render(<AdminSecurityPanel snapshot={secureSnapshot} />)

    expect(screen.getByRole('button', { name: 'Revocando...' })).toBeInTheDocument()
  })

  it('cambia la etiqueta del botón a "Regenerando..." cuando recoveryPending=true', () => {
    mockAllActionStates([
      [null, jest.fn(), false],
      [null, jest.fn(), false],
      [null, jest.fn(), false],
      [null, jest.fn(), true],
    ])

    render(<AdminSecurityPanel snapshot={secureSnapshot} />)

    expect(screen.getByRole('button', { name: 'Regenerando...' })).toBeInTheDocument()
  })

  it('muestra error de validación del código de recovery cuando recoveryState.fieldErrors.code está presente', () => {
    mockAllActionStates([
      [null, jest.fn(), false],
      [null, jest.fn(), false],
      [null, jest.fn(), false],
      [{ fieldErrors: { code: 'Ingresa el código TOTP de 6 dígitos' } }, jest.fn(), false],
    ])

    render(<AdminSecurityPanel snapshot={secureSnapshot} />)

    expect(screen.getByText('Ingresa el código TOTP de 6 dígitos')).toBeInTheDocument()
  })

  it('cambia la etiqueta del botón "Revocar otras" a "Cerrando..." cuando revokePending=true', () => {
    mockAllActionStates([
      [null, jest.fn(), false],
      [null, jest.fn(), false],
      [null, jest.fn(), false],
      [null, jest.fn(), false],
      [null, jest.fn(), true],
    ])

    render(<AdminSecurityPanel snapshot={secureSnapshot} />)

    expect(screen.getByRole('button', { name: 'Cerrando...' })).toBeInTheDocument()
  })

  it('cambia la etiqueta del botón "Cerrar todo" a "Revocando..." cuando globalPending=true', () => {
    mockAllActionStates([
      [null, jest.fn(), false],
      [null, jest.fn(), false],
      [null, jest.fn(), false],
      [null, jest.fn(), false],
      [null, jest.fn(), false],
      [null, jest.fn(), true],
    ])

    render(<AdminSecurityPanel snapshot={secureSnapshot} />)

    expect(screen.getAllByRole('button', { name: 'Revocando...' })).toHaveLength(1)
  })
})
