import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'

import { BottomNav } from '../BottomNav'

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, layoutId: _layoutId, transition: _transition, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => <div {...props}>{children}</div>,
  },
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

  it('renderiza los accesos principales y marca el activo', () => {
    mockUsePathname.mockReturnValue('/wallet')
    render(<BottomNav />)

    expect(screen.getByRole('link', { name: /inicio/i })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: /billetera/i })).toHaveAttribute('href', '/wallet')
    expect(screen.getByRole('link', { name: /estadísticas/i })).toHaveAttribute('href', '/stats')
    expect(screen.getByRole('link', { name: /amigos/i })).toHaveAttribute('href', '/friends')
    expect(screen.getByRole('link', { name: /reglas/i })).toHaveAttribute('href', '/rules')
    expect(screen.getByText('Billetera')).toHaveClass('text-brand-gold')
  })
})
