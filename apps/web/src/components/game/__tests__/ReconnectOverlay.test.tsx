import { render, screen } from '@testing-library/react'

import { ReconnectOverlay } from '../ReconnectOverlay'

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: {
    div: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => <div {...props}>{children}</div>,
    span: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }: React.HTMLAttributes<HTMLSpanElement> & Record<string, unknown>) => <span {...props}>{children}</span>,
  },
}))

describe('ReconnectOverlay', () => {
  it('no renderiza cuando no es visible', () => {
    const { container } = render(<ReconnectOverlay isVisible={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('renderiza título y mensaje cuando es visible', () => {
    render(<ReconnectOverlay isVisible={true} message="Volviendo a la mesa..." />)

    expect(screen.getByText(/conexión perdida/i)).toBeInTheDocument()
    expect(screen.getByText(/volviendo a la mesa/i)).toBeInTheDocument()
    expect(screen.getByText(/restaurando sesión/i)).toBeInTheDocument()
  })
})
