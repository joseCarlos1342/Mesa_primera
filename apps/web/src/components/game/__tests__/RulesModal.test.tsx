import { fireEvent, render, screen } from '@testing-library/react'

import { RulesModal } from '../RulesModal'

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, initial: _initial, animate: _animate, exit: _exit, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => <div {...props}>{children}</div>,
  },
}))

describe('RulesModal', () => {
  it('no renderiza cuando está cerrado', () => {
    const { container } = render(<RulesModal isOpen={false} onClose={jest.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('renderiza reglas y permite cerrar desde botones y backdrop', () => {
    const onClose = jest.fn()
    const { container } = render(<RulesModal isOpen={true} onClose={onClose} />)

    expect(screen.getByText(/reglamento de primera/i)).toBeInTheDocument()
    expect(screen.getByText(/jerarquía de manos/i)).toBeInTheDocument()

    const backdrop = Array.from(container.querySelectorAll('div')).find((element) =>
      element.className.includes('bg-black/80 backdrop-blur-sm')
    ) as Element
    fireEvent.click(backdrop)
    fireEvent.click(screen.getByRole('button', { name: /cerrar/i }))
    fireEvent.click(screen.getByRole('button', { name: /¡entendido!/i }))

    expect(onClose).toHaveBeenCalledTimes(3)
  })
})
