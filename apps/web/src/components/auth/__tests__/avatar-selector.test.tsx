import { fireEvent, render, screen } from '@testing-library/react'

import { AvatarSelector } from '../avatar-selector'

describe('AvatarSelector', () => {
  it('renderiza el estado base con 4 identidades y CTA de expandir', () => {
    render(<AvatarSelector onSelect={jest.fn()} selectedId="as-oros" />)

    expect(screen.getByText(/identidad en la mesa/i)).toBeInTheDocument()
    expect(screen.getByText('REQUERIDO')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /as de oros/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /rey de espadas/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copa real/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ficha elite/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reina de diamantes/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ver más identidades/i })).toBeInTheDocument()
  })

  it('expande y colapsa el catálogo de identidades', () => {
    render(<AvatarSelector onSelect={jest.fn()} selectedId="as-oros" />)

    fireEvent.click(screen.getByRole('button', { name: /ver más identidades/i }))

    expect(screen.getByRole('button', { name: /reina de diamantes/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dados dorados/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ver menos/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /ver menos/i }))

    expect(screen.queryByRole('button', { name: /reina de diamantes/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ver más identidades/i })).toBeInTheDocument()
  })

  it('llama onSelect con el avatar elegido', () => {
    const onSelect = jest.fn()
    render(<AvatarSelector onSelect={onSelect} selectedId="as-oros" />)

    fireEvent.click(screen.getByRole('button', { name: /ficha elite/i }))

    expect(onSelect).toHaveBeenCalledWith('ficha-maestra')
  })

  it('muestra y oculta el tooltip al hacer hover', () => {
    render(<AvatarSelector onSelect={jest.fn()} selectedId="as-oros" />)

    const avatar = screen.getByRole('button', { name: /as de oros/i })
    fireEvent.mouseEnter(avatar)

    expect(screen.getByText(/la fortuna sonríe a los audaces/i)).toBeInTheDocument()

    fireEvent.mouseLeave(avatar)

    const tooltip = screen.getByText(/la fortuna sonríe a los audaces/i).closest('div')
    expect(tooltip).toHaveClass('opacity-0')
  })
})
