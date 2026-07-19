import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { CreateTableModal } from '../CreateTableModal'
import { createCustomTable, createTable } from '@/app/actions/admin-tables'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/app/actions/admin-tables', () => ({
  createTable: jest.fn(),
  createCustomTable: jest.fn(),
}))

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockCreateTable = createTable as jest.MockedFunction<typeof createTable>
const mockCreateCustomTable = createCustomTable as jest.MockedFunction<typeof createCustomTable>

const getChipButton = (label: string) => screen.getAllByRole('button', { name: label }).at(-1)!

describe('CreateTableModal', () => {
  const refresh = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    window.alert = jest.fn()
    mockUseRouter.mockReturnValue({ refresh } as unknown as ReturnType<typeof useRouter>)
    mockCreateTable.mockResolvedValue({ success: true })
    mockCreateCustomTable.mockResolvedValue({ success: true })
  })

  it('abre, cierra y crea mesa comun con nombre y jugadores', async () => {
    render(<CreateTableModal />)

    fireEvent.click(screen.getByRole('button', { name: /crear mesa/i }))
    expect(screen.getByText('NUEVA MESA')).toBeInTheDocument()
    expect(screen.getByText('Mesa Común')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Ej: Mesa #3, Mesa #4...'), { target: { value: 'Mesa #3' } })
    fireEvent.click(screen.getByRole('button', { name: '5' }))
    fireEvent.click(screen.getByRole('button', { name: /confirmar creación/i }))

    await waitFor(() => expect(mockCreateTable).toHaveBeenCalledWith({ name: 'Mesa #3', max_players: 5 }))
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('NUEVA MESA')).not.toBeInTheDocument()
  })

  it('cierra el modal desde el botón de cierre sin crear mesa', () => {
    render(<CreateTableModal />)

    fireEvent.click(screen.getByRole('button', { name: /crear mesa/i }))
    expect(screen.getByText('NUEVA MESA')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button')[0])

    expect(screen.queryByText('NUEVA MESA')).not.toBeInTheDocument()
    expect(mockCreateTable).not.toHaveBeenCalled()
    expect(mockCreateCustomTable).not.toHaveBeenCalled()
  })

  it('crea mesa personalizada con entrada, pique y fichas deshabilitadas', async () => {
    render(<CreateTableModal />)

    fireEvent.click(screen.getByRole('button', { name: /crear mesa/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Personalizada' }))
    fireEvent.change(screen.getByPlaceholderText('Ej: Mesa VIP, Premium...'), { target: { value: 'Mesa VIP' } })
    fireEvent.click(screen.getByRole('button', { name: '4' }))
    fireEvent.click(screen.getByRole('button', { name: '$200K' }))
    fireEvent.click(screen.getAllByRole('button', { name: '$20K' })[0])
    fireEvent.click(getChipButton('$1K'))
    fireEvent.click(getChipButton('$2K'))

    expect(screen.getByText('(4/6)')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /confirmar creación/i }))

    await waitFor(() => expect(mockCreateCustomTable).toHaveBeenCalledWith({
      name: 'Mesa VIP',
      max_players: 4,
      min_entry_cents: 20000000,
      min_pique_cents: 2000000,
      disabled_chips: [100000, 200000],
    }))
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('permite volver de una mesa personalizada a una común', () => {
    render(<CreateTableModal />)

    fireEvent.click(screen.getByRole('button', { name: /crear mesa/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Personalizada' }))
    expect(screen.getByPlaceholderText('Ej: Mesa VIP, Premium...')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Común' }))

    expect(screen.getByPlaceholderText('Ej: Mesa #3, Mesa #4...')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Ej: Mesa VIP, Premium...')).not.toBeInTheDocument()
  })

  it('convierte montos personalizados en COP a centavos al crear una mesa', async () => {
    render(<CreateTableModal />)

    fireEvent.click(screen.getByRole('button', { name: /crear mesa/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Personalizada' }))
    fireEvent.change(screen.getByPlaceholderText('Ej: Mesa VIP, Premium...'), { target: { value: 'Mesa Evento' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: /otro saldo mínimo/i }), { target: { value: '750000' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: /otro pique mínimo/i }), { target: { value: '15000' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar creación/i }))

    await waitFor(() => expect(mockCreateCustomTable).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Mesa Evento',
      min_entry_cents: 75_000_000,
      min_pique_cents: 1_500_000,
    })))
  })

  it('muestra errores inline y no envía una mesa cuando el pique supera la entrada', () => {
    render(<CreateTableModal />)

    fireEvent.click(screen.getByRole('button', { name: /crear mesa/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Personalizada' }))
    fireEvent.change(screen.getByPlaceholderText('Ej: Mesa VIP, Premium...'), { target: { value: 'Mesa inválida' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: /otro saldo mínimo/i }), { target: { value: '10000' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: /otro pique mínimo/i }), { target: { value: '15000' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar creación/i }))

    expect(screen.getByText('El saldo mínimo debe ser mayor o igual al pique mínimo.')).toBeInTheDocument()
    expect(mockCreateCustomTable).not.toHaveBeenCalled()
  })

  it('muestra validación inline cuando el monto personalizado no es múltiplo de $1.000 COP', () => {
    render(<CreateTableModal />)

    fireEvent.click(screen.getByRole('button', { name: /crear mesa/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Personalizada' }))
    fireEvent.change(screen.getByPlaceholderText('Ej: Mesa VIP, Premium...'), { target: { value: 'Mesa inválida' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: /otro saldo mínimo/i }), { target: { value: '10500' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar creación/i }))

    expect(screen.getByText('El monto debe ser múltiplo de $1.000 COP.')).toBeInTheDocument()
    expect(mockCreateCustomTable).not.toHaveBeenCalled()
  })

  it('impide deshabilitar todas las fichas y muestra mensaje minimo', () => {
    render(<CreateTableModal />)

    fireEvent.click(screen.getByRole('button', { name: /crear mesa/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Personalizada' }))

    for (const label of ['$1K', '$2K', '$5K', '$10K', '$20K']) {
      fireEvent.click(getChipButton(label))
    }

    expect(screen.getByText('(1/6)')).toBeInTheDocument()
    expect(screen.getByText('Debe haber al menos 1 ficha habilitada.')).toBeInTheDocument()
    expect(getChipButton('$50K')).toBeDisabled()
  })

  it('permite volver a habilitar una ficha deshabilitada', () => {
    render(<CreateTableModal />)

    fireEvent.click(screen.getByRole('button', { name: /crear mesa/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Personalizada' }))

    fireEvent.click(getChipButton('$1K'))
    expect(screen.getByText('(5/6)')).toBeInTheDocument()

    fireEvent.click(getChipButton('$1K'))
    expect(screen.getByText('(6/6)')).toBeInTheDocument()
    expect(screen.queryByText('Debe haber al menos 1 ficha habilitada.')).not.toBeInTheDocument()
  })

  it('muestra el error de creación dentro del modal y lo mantiene abierto', async () => {
    mockCreateTable.mockRejectedValueOnce(new Error('Nombre duplicado'))
    render(<CreateTableModal />)

    fireEvent.click(screen.getByRole('button', { name: /crear mesa/i }))
    fireEvent.change(screen.getByPlaceholderText('Ej: Mesa #3, Mesa #4...'), { target: { value: 'Mesa repetida' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar creación/i }))

    await waitFor(() => expect(screen.getByText('No se pudo crear la mesa. Intenta nuevamente.')).toBeInTheDocument())
    expect(window.alert).not.toHaveBeenCalled()
    expect(screen.getByText('NUEVA MESA')).toBeInTheDocument()
  })

  it('separa el contenedor visual del scroll para que el scrollbar no rompa el border-radius', () => {
    const { container } = render(<CreateTableModal />)
    fireEvent.click(screen.getByRole('button', { name: /crear mesa/i }))

    // El contenedor externo (con border-radius) NO debe tener overflow-y-auto.
    const roundedContainer = container.querySelector('div.rounded-\\[2\\.5rem\\]') as HTMLElement
    expect(roundedContainer).not.toBeNull()
    expect(roundedContainer.className).toMatch(/overflow-hidden/)
    expect(roundedContainer.className).not.toMatch(/overflow-y-auto/)

    // Debe existir un wrapper interno con overflow-y-auto para el scroll.
    const scrollContainer = container.querySelector('div.overflow-y-auto') as HTMLElement
    expect(scrollContainer).not.toBeNull()
    // El wrapper de scroll NO debe tener el border-radius del contenedor visual.
    expect(scrollContainer.className).not.toMatch(/rounded-\\[2\\.5rem\\]/)
  })
})
