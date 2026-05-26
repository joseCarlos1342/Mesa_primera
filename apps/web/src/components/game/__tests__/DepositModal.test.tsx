import { fireEvent, render, screen } from '@testing-library/react'
import { DepositModal } from '../DepositModal'
import { RechargeButton } from '../RechargeButton'

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, initial: _initial, animate: _animate, exit: _exit, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => <div {...props}>{children}</div>,
    button: ({ children, whileHover: _whileHover, whileTap: _whileTap, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>) => <button {...props}>{children}</button>,
  },
}))

jest.mock('../DepositForm', () => ({
  DepositForm: ({ onSuccess }: { onSuccess: () => void }) => (
    <div>
      <p>Formulario de deposito</p>
      <button type="button" onClick={onSuccess}>Completar deposito</button>
    </div>
  ),
}))

describe('DepositModal y RechargeButton', () => {
  it('no renderiza el modal cuando esta cerrado', () => {
    render(<DepositModal isOpen={false} onClose={jest.fn()} />)

    expect(screen.queryByText(/cargar saldo/i)).not.toBeInTheDocument()
  })

  it('renderiza el formulario y permite cerrar manualmente', () => {
    const onClose = jest.fn()

    render(<DepositModal isOpen onClose={onClose} />)

    expect(screen.getByText(/cargar/i)).toBeInTheDocument()
    expect(screen.getByText('Formulario de deposito')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /cerrar/i }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('cierra el modal cuando el formulario reporta exito', () => {
    const onClose = jest.fn()

    render(<DepositModal isOpen onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: /completar deposito/i }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('RechargeButton abre y cierra el modal de recarga', () => {
    render(<RechargeButton />)

    fireEvent.click(screen.getByRole('button'))

    expect(screen.getByText('Formulario de deposito')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /completar deposito/i }))

    expect(screen.queryByText('Formulario de deposito')).not.toBeInTheDocument()
  })
})
