import { render, screen } from '@testing-library/react'

import { PlayerAvatar } from '../PlayerAvatar'
import { getAvatarSvg } from '@/utils/avatars'

jest.mock('@/utils/avatars', () => ({
  getAvatarSvg: jest.fn(() => null),
}))

const mockGetAvatarSvg = getAvatarSvg as jest.MockedFunction<typeof getAvatarSvg>

describe('PlayerAvatar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetAvatarSvg.mockReturnValue(null)
  })

  it('muestra el SVG del catálogo cuando existe', () => {
    mockGetAvatarSvg.mockReturnValue(<svg data-testid="catalog-svg" />)
    render(<PlayerAvatar avatar="as-oros" name="Ana" />)
    expect(screen.getByTestId('catalog-svg')).toBeInTheDocument()
  })

  it('muestra la imagen cuando avatar es una URL sin SVG', () => {
    const { container } = render(<PlayerAvatar avatar="https://cdn/x.png" name="Ana" />)
    const img = container.querySelector('img')
    expect(img).toHaveAttribute('src', 'https://cdn/x.png')
  })

  it('muestra la inicial del nombre cuando no hay avatar', () => {
    render(<PlayerAvatar name="@beto" />)
    expect(screen.getByText('B')).toBeInTheDocument()
  })

  it('usa "J" cuando no hay nombre ni avatar', () => {
    render(<PlayerAvatar />)
    expect(screen.getByText('J')).toBeInTheDocument()
  })
})
