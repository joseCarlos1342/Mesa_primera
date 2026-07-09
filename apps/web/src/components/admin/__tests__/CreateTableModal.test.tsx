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

  it('muestra error de creacion y mantiene modal abierto', async () => {
    mockCreateTable.mockRejectedValueOnce(new Error('Nombre duplicado'))
    render(<CreateTableModal />)

    fireEvent.click(screen.getByRole('button', { name: /crear mesa/i }))
    fireEvent.change(screen.getByPlaceholderText('Ej: Mesa #3, Mesa #4...'), { target: { value: 'Mesa repetida' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar creación/i }))

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Error al crear mesa: Nombre duplicado'))
    expect(screen.getByText('NUEVA MESA')).toBeInTheDocument()
  })
})
