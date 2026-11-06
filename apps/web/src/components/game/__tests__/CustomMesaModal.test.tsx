import { fireEvent, render, screen } from '@testing-library/react'
import { CustomMesaModal } from '../CustomMesaModal'

describe('CustomMesaModal', () => {
  const onClose = jest.fn()
  const onCreateMesa = jest.fn()

  beforeEach(() => jest.clearAllMocks())

  it('no renderiza contenido cuando está cerrado', () => {
    render(<CustomMesaModal isOpen={false} onClose={onClose} onCreateMesa={onCreateMesa} creating={false} />)
    expect(screen.queryByText('Mesa personalizada')).not.toBeInTheDocument()
  })

  it('bloquea crear hasta recibir un nombre', () => {
    render(<CustomMesaModal isOpen onClose={onClose} onCreateMesa={onCreateMesa} creating={false} />)
    expect(screen.getByRole('button', { name: 'Crear mesa' })).toBeDisabled()
  })

  it('muestra el estado "Creando…" y deshabilita el botón', () => {
    render(<CustomMesaModal isOpen onClose={onClose} onCreateMesa={onCreateMesa} creating />)
    expect(screen.getByRole('button', { name: 'Creando…' })).toBeDisabled()
  })

  it('permite reactivar una ficha deshabilitada', () => {
    render(<CustomMesaModal isOpen onClose={onClose} onCreateMesa={onCreateMesa} creating={false} />)

    const chip = screen.getByRole('button', { name: /Ficha de \$1k/ })
    fireEvent.click(chip)
    expect(screen.getByRole('button', { name: 'Ficha de $1k, deshabilitada' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('(5/6)')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ficha de $1k, deshabilitada' }))
    expect(screen.getByRole('button', { name: 'Ficha de $1k, habilitada' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('(6/6)')).toBeInTheDocument()
  })

  it('bloquea la creación cuando todas las fichas están deshabilitadas', () => {
    render(<CustomMesaModal isOpen onClose={onClose} onCreateMesa={onCreateMesa} creating={false} />)

    for (const label of ['$1k', '$2k', '$5k', '$10k', '$20k', '$50k']) {
      fireEvent.click(screen.getByRole('button', { name: `Ficha de ${label}, habilitada` }))
    }

    expect(screen.getByText('Debe haber al menos 1 ficha habilitada')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear mesa' })).toBeDisabled()
  })

  it('envía la configuración seleccionada y reinicia al cerrar', () => {
    render(<CustomMesaModal isOpen onClose={onClose} onCreateMesa={onCreateMesa} creating={false} />)

    fireEvent.change(screen.getByLabelText(/nombre de la mesa/i), { target: { value: 'Mesa Final' } })
    fireEvent.click(screen.getByRole('button', { name: '4' }))
    fireEvent.click(screen.getByRole('button', { name: '$100.000' }))
    fireEvent.click(screen.getByRole('button', { name: '$10.000' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ficha de $1k, habilitada' }))
    fireEvent.click(screen.getByRole('button', { name: 'Crear mesa' }))

    expect(onCreateMesa).toHaveBeenCalledWith({
      tableName: 'Mesa Final',
      maxPlayers: 4,
      minEntry: 10_000_000,
      minPique: 1_000_000,
      disabledChips: [100_000],
      isCustom: true,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onClose).toHaveBeenCalled()
    expect(screen.getByLabelText(/nombre de la mesa/i)).toHaveValue('')
  })

  it('marca aria-pressed en las opciones seleccionadas', () => {
    render(<CustomMesaModal isOpen onClose={onClose} onCreateMesa={onCreateMesa} creating={false} />)

    const five = screen.getByRole('button', { name: '5' })
    fireEvent.click(five)
    expect(five).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '7' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('no envía si el nombre solo tiene espacios', () => {
    render(<CustomMesaModal isOpen onClose={onClose} onCreateMesa={onCreateMesa} creating={false} />)

    fireEvent.change(screen.getByLabelText(/nombre de la mesa/i), { target: { value: '   ' } })
    expect(screen.getByRole('button', { name: 'Crear mesa' })).toBeDisabled()
  })
})
