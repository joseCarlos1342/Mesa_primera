import { render, screen } from '@testing-library/react'

import { PlayerHeader } from '../PlayerHeader'

jest.mock('@/utils/avatars', () => ({
  getAvatarSvg: jest.fn(() => null),
}))

describe('PlayerHeader', () => {
  it('muestra el nombre y enlaza al perfil', () => {
    render(<PlayerHeader username="Ana" avatar={null} />)
    const link = screen.getByRole('link', { name: /tu perfil, ana/i })
    expect(link).toHaveAttribute('href', '/profile')
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Ver perfil')).toBeInTheDocument()
  })

  it('usa "Jugador" como nombre por defecto', () => {
    render(<PlayerHeader />)
    expect(screen.getByText('Jugador')).toBeInTheDocument()
  })

  it('renderiza las acciones de la derecha', () => {
    render(<PlayerHeader username="Ana" actions={<button type="button">Soporte</button>} />)
    expect(screen.getByRole('button', { name: 'Soporte' })).toBeInTheDocument()
  })
})
