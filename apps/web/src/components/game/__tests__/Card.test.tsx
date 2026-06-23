import { fireEvent, render, screen } from '@testing-library/react'
import { Card } from '../Card'

jest.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}))

describe('Card', () => {
  it('renders a visible card image with padded value and mapped suit', () => {
    render(<Card suit="Oros" value={7} className="selected-card" />)

    const image = screen.getByRole('img', { name: '7 de Oros' })

    expect(image).toHaveAttribute('src', '/cards/07-oros.png?v=3')
    expect(image).toHaveClass('opacity-0')
    expect(screen.getByRole('img').closest('.selected-card')).toBeInTheDocument()

    fireEvent.load(image)

    expect(image).toHaveClass('opacity-100')
  })

  it('falls back to text when the card image cannot be loaded', () => {
    const { container } = render(<Card suit="Espadas" value={12} />)

    fireEvent.error(screen.getByRole('img', { name: '12 de Espadas' }))

    expect(container.querySelector('span')).toHaveTextContent('12E')
  })

  it('keeps the face hidden when rendering the card back', () => {
    render(<Card suit="Copas" value={1} isHidden />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByText('1')).not.toBeInTheDocument()
  })

  it('renders an empty face when suit or value is missing', () => {
    render(<Card />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
