import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'

import { BottomNav, isNavActive, NAV_ITEMS } from '../BottomNav'

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

const mockUsePathname = usePathname as unknown as jest.Mock

describe('BottomNav', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('no renderiza dentro de rutas /play/', () => {
    mockUsePathname.mockReturnValue('/play/mesa-1')
    const { container } = render(<BottomNav />)

    expect(container.firstChild).toBeNull()
  })

  it('renderiza los accesos principales y marca el activo con aria-current', () => {
    mockUsePathname.mockReturnValue('/wallet')
    render(<BottomNav />)

    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: 'Mesas' })).toHaveAttribute('href', '/lobby')
    expect(screen.getByRole('link', { name: 'Billetera' })).toHaveAttribute('href', '/wallet')
    expect(screen.getByRole('link', { name: 'Amigos' })).toHaveAttribute('href', '/friends')
    expect(screen.getByRole('link', { name: 'Perfil' })).toHaveAttribute('href', '/profile')

    const billetera = screen.getByRole('link', { name: 'Billetera' })
    expect(billetera).toHaveAttribute('aria-current', 'page')
    expect(billetera).toHaveClass('text-brand-gold-light')
  })

  it('no marca ningún acceso cuando la ruta no coincide', () => {
    mockUsePathname.mockReturnValue('/otra-ruta')
    render(<BottomNav />)

    expect(screen.queryByRole('link', { current: 'page' })).toBeNull()
  })

  it('marca Perfil también en /stats y por prefijo de ruta', () => {
    mockUsePathname.mockReturnValue('/stats')
    render(<BottomNav />)

    const perfil = screen.getByRole('link', { name: 'Perfil' })
    expect(perfil).toHaveAttribute('aria-current', 'page')
    expect(perfil).toHaveAttribute('href', '/profile')
  })

  it('isNavActive coincide por igualdad y por prefijo', () => {
    expect(isNavActive('/wallet', ['/wallet'])).toBe(true)
    expect(isNavActive('/wallet/deposit', ['/wallet'])).toBe(true)
    expect(isNavActive('/stats', ['/profile', '/stats'])).toBe(true)
    expect(isNavActive('/lobby', ['/wallet'])).toBe(false)
    expect(isNavActive('/walletx', ['/wallet'])).toBe(false)
  })

  it('expone los cinco accesos esperados en orden', () => {
    expect(NAV_ITEMS.map((item) => item.label)).toEqual(['Inicio', 'Mesas', 'Billetera', 'Amigos', 'Perfil'])
    expect(NAV_ITEMS.map((item) => item.href)).toEqual(['/dashboard', '/lobby', '/wallet', '/friends', '/profile'])
  })
})
