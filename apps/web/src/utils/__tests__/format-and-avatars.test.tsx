import { render, screen } from '@testing-library/react'
import { AVATARS, getAvatarSvg } from '../avatars'
import { formatAmount, formatCurrency } from '../format'

describe('format helpers', () => {
  it('formatea centavos colombianos sin decimales para saldos visibles', () => {
    expect(formatCurrency(123_456_78)).toBe('$ 123.457')
    expect(formatAmount(123_456_78)).toBe('123.457')
  })

  it('usa cero seguro cuando el monto no existe', () => {
    expect(formatCurrency(null)).toBe('$0')
    expect(formatCurrency(undefined)).toBe('$0')
    expect(formatAmount(null)).toBe('0')
    expect(formatAmount(undefined)).toBe('0')
  })
})

describe('avatar helpers', () => {
  it('devuelve el SVG del avatar seleccionado por id', () => {
    const avatar = getAvatarSvg('as-oros')

    expect(avatar).not.toBeNull()

    render(<div data-testid="avatar-frame">{avatar}</div>)

    expect(screen.getByTestId('avatar-frame').querySelector('svg')).toBeInTheDocument()
    expect(AVATARS.map(({ id }) => id)).toContain('as-oros')
  })

  it('no inventa avatar cuando el id falta o es desconocido', () => {
    expect(getAvatarSvg(null)).toBeNull()
    expect(getAvatarSvg(undefined)).toBeNull()
    expect(getAvatarSvg('avatar-inexistente')).toBeNull()
  })
})
