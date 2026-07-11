import { fireEvent, render, screen } from '@testing-library/react'
import { CustomMesaModal } from '../CustomMesaModal'

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => <div {...props}>{children}</div>,
  },
}))

describe('CustomMesaModal', () => {
  const onClose = jest.fn()
  const onCreateMesa = jest.fn()

  beforeEach(() => jest.clearAllMocks())

  it('no renderiza contenido cuando está cerrado', () => {
    render(<CustomMesaModal isOpen={false} onClose={onClose} onCreateMesa={onCreateMesa} creating={false} />)
    expect(screen.queryByText('Mesa Personalizada')).not.toBeInTheDocument()
  })

  it('bloquea crear hasta recibir un nombre', () => {
    render(<CustomMesaModal isOpen onClose={onClose} onCreateMesa={onCreateMesa} creating={false} />)
    expect(screen.getByRole('button', { name: /crear mesa personalizada/i })).toBeDisabled()
  })

  it('permite reactivar una ficha deshabilitada', () => {
    render(<CustomMesaModal isOpen onClose={onClose} onCreateMesa={onCreateMesa} creating={false} />)

    const chip = screen.getByRole('button', { name: /\$1k/ })
    fireEvent.click(chip)
    expect(screen.getByText('Fichas Habilitadas (5/6)')).toBeInTheDocument()

    fireEvent.click(chip)
    expect(screen.getByText('Fichas Habilitadas (6/6)')).toBeInTheDocument()
  })

  it('envía la configuración seleccionada y reinicia al cerrar', () => {
    render(<CustomMesaModal isOpen onClose={onClose} onCreateMesa={onCreateMesa} creating={false} />)

    fireEvent.change(screen.getByPlaceholderText(/vip diamante/i), { target: { value: 'Mesa Final' } })
    fireEvent.click(screen.getByRole('button', { name: '4' }))
    fireEvent.click(screen.getByRole('button', { name: '$100,000' }))
    fireEvent.click(screen.getByRole('button', { name: '$10,000' }))
    fireEvent.click(screen.getByRole('button', { name: /\$1k/ }))
    fireEvent.click(screen.getByRole('button', { name: /crear mesa personalizada/i }))

    expect(onCreateMesa).toHaveBeenCalledWith({
      tableName: 'Mesa Final', maxPlayers: 4, minEntry: 10_000_000,
      minPique: 1_000_000, disabledChips: [100_000], isCustom: true,
    })

    fireEvent.click(screen.getAllByRole('button')[0])
    expect(onClose).toHaveBeenCalled()
    expect(screen.getByPlaceholderText(/vip diamante/i)).toHaveValue('')
  })
})
