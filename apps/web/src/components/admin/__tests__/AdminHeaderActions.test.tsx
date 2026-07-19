import { render, screen } from '@testing-library/react'
import { AdminHeaderActions } from '../AdminHeaderActions'

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

jest.mock('@/components/auth/sign-out-button', () => ({
  SignOutButton: ({ className }: { className?: string }) => (
    <button data-testid="sign-out" className={className} title="Cerrar Sesión" aria-label="Cerrar Sesión">
      Salir
    </button>
  ),
}))

jest.mock('@/components/admin/AdminGlobalSearch', () => ({
  AdminGlobalSearch: () => (
    <form data-testid="admin-global-search">
      <input placeholder="Buscar ID, seed, usuario…" aria-label="Búsqueda global admin" />
      <button type="submit">Buscar</button>
    </form>
  ),
}))

import { usePathname } from 'next/navigation'
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>

describe('AdminHeaderActions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('muestra la búsqueda global, broadcast y salir en /admin', () => {
    mockUsePathname.mockReturnValue('/admin')
    render(<AdminHeaderActions />)
    expect(screen.getByTestId('admin-global-search')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /nuevo broadcast/i })).toBeInTheDocument()
    expect(screen.getByTestId('sign-out')).toBeInTheDocument()
  })

  it('oculta broadcast en otras rutas', () => {
    mockUsePathname.mockReturnValue('/admin/users')
    render(<AdminHeaderActions />)
    expect(screen.queryByRole('link', { name: /nuevo broadcast/i })).not.toBeInTheDocument()
  })

  it('mantiene altura uniforme (h-10) en todos los elementos del header para evitar saltos visuales', () => {
    mockUsePathname.mockReturnValue('/admin')
    render(<AdminHeaderActions />)
    // Verificamos específicamente los 3 elementos visibles del header en /admin:
    // link "Nuevo Broadcast" + botón "Cerrar Sesión" (de SignOutButton mockeado).
    // El input y submit del form de búsqueda los verificamos en su propio test.
    const broadcastLink = screen.getByRole('link', { name: /nuevo broadcast/i })
    const signOutButton = screen.getByTestId('sign-out')
    expect(broadcastLink.className).toMatch(/h-10/)
    expect(signOutButton.className).toMatch(/h-10/)
  })
})
