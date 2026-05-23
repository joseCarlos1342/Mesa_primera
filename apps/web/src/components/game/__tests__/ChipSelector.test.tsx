import { fireEvent, render, screen } from '@testing-library/react'

import { ChipSelector } from '../ChipSelector'

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: {
    div: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => <div {...props}>{children}</div>,
  },
}))

describe('ChipSelector', () => {
  beforeEach(() => {
    if (typeof navigator.vibrate === 'function') {
      jest.mocked(navigator.vibrate).mockClear()
    }
  })

  it('renderiza chips disponibles y excluye disabledChips', () => {
    render(
      <ChipSelector
        chipCounts={{}}
        totalBet={0}
        maxChips={10_000_000}
        onAdd={jest.fn()}
        onRemove={jest.fn()}
        disabledChips={[5000000]}
      />,
    )

    expect(screen.getByRole('button', { name: '1k' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '50k' })).not.toBeInTheDocument()
  })

  it('permite activar un chip, sumar y restar cuando corresponde', () => {
    const onAdd = jest.fn()
    const onRemove = jest.fn()
    render(
      <ChipSelector
        chipCounts={{ 100000: 2 }}
        totalBet={0}
        maxChips={10_000_000}
        onAdd={onAdd}
        onRemove={onRemove}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /1k/i }))
    fireEvent.click(screen.getByRole('button', { name: '+' }))
    fireEvent.click(screen.getByRole('button', { name: '−' }))

    expect(onAdd).toHaveBeenCalledWith(100000)
    expect(onRemove).toHaveBeenCalledWith(100000)
  })

  it('deshabilita sumar si no alcanza el saldo y permite cerrar el chip activo', () => {
    render(
      <ChipSelector
        chipCounts={{}}
        totalBet={0}
        maxChips={50000}
        onAdd={jest.fn()}
        onRemove={jest.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /1k/i }))
    expect(screen.getByRole('button', { name: '+' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '✕' }))
    expect(screen.queryByRole('button', { name: '+' })).not.toBeInTheDocument()
  })
})
