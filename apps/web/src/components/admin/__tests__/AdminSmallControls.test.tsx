import { act, fireEvent, render, screen } from '@testing-library/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { DashboardAutoRefresh } from '../DashboardAutoRefresh'
import { DashboardWarnings } from '../DashboardWarnings'
import { DeleteTableButton } from '../DeleteTableButton'
import { TableActiveToggle } from '../TableActiveToggle'
import { UserSearch } from '../UserSearch'
import { deleteTable, toggleTableActive } from '@/app/actions/admin-tables'

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

jest.mock('@/app/actions/admin-tables', () => ({
  deleteTable: jest.fn(),
  toggleTableActive: jest.fn(),
}))

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>
const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>
const mockDeleteTable = deleteTable as jest.MockedFunction<typeof deleteTable>
const mockToggleTableActive = toggleTableActive as jest.MockedFunction<typeof toggleTableActive>

describe('admin small controls', () => {
  const replace = jest.fn()
  const refresh = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
    window.confirm = jest.fn(() => true)
    window.alert = jest.fn()
    mockUseRouter.mockReturnValue({ replace, refresh } as unknown as ReturnType<typeof useRouter>)
    mockUsePathname.mockReturnValue('/admin/users')
    mockUseSearchParams.mockReturnValue(new URLSearchParams('page=2&q=ana') as unknown as ReturnType<typeof useSearchParams>)
    mockDeleteTable.mockResolvedValue({ success: true })
    mockToggleTableActive.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renderiza warnings degradados y no renderiza si no hay warnings', () => {
    const { rerender, container } = render(<DashboardWarnings warnings={['wallets timeout', 'redis down']} />)

    expect(screen.getByText('2 fuentes degradadas')).toBeInTheDocument()
    expect(screen.getByText(/wallets timeout/)).toBeInTheDocument()
    expect(screen.getByText(/redis down/)).toBeInTheDocument()

    rerender(<DashboardWarnings warnings={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('actualiza etiqueta temporal y refresca el dashboard por intervalo', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-05-25T12:00:00Z'))
    render(<DashboardAutoRefresh fetchedAt="2026-05-25T11:59:50Z" />)

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    expect(screen.getByText('HACE 11s')).toBeInTheDocument()

    act(() => {
      jest.advanceTimersByTime(29_000)
    })

    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('debouncea busqueda de usuarios preservando params existentes', () => {
    jest.useFakeTimers()
    render(<UserSearch />)

    const input = screen.getByPlaceholderText('Buscar nombre o teléfono...')
    expect(input).toHaveValue('ana')

    fireEvent.change(input, { target: { value: 'carlos' } })

    act(() => {
      jest.advanceTimersByTime(299)
    })
    expect(replace).not.toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(1)
    })

    expect(replace).toHaveBeenLastCalledWith('/admin/users?page=2&q=carlos')
  })

  it('activa y desactiva mesa con confirmacion', async () => {
    render(<TableActiveToggle tableId="table-1" isActive={false} />)

    fireEvent.click(screen.getByTitle('Activar mesa'))

    expect(window.confirm).toHaveBeenCalledWith('¿Activar esta mesa?')
    await screen.findByTitle('Activar mesa')
    expect(mockToggleTableActive).toHaveBeenCalledWith('table-1', true)
    expect(refresh).toHaveBeenCalled()
  })

  it('elimina mesa confirmada y muestra error si falla', async () => {
    const { rerender } = render(<DeleteTableButton tableId="table-1" size="sm" />)

    fireEvent.click(screen.getByRole('button'))

    expect(window.confirm).toHaveBeenCalledWith('¿Eliminar configuración de mesa?')
    await screen.findByRole('button')
    expect(mockDeleteTable).toHaveBeenCalledWith('table-1')
    expect(refresh).toHaveBeenCalled()

    mockDeleteTable.mockRejectedValueOnce(new Error('No permitido'))
    rerender(<DeleteTableButton tableId="table-2" />)
    fireEvent.click(screen.getByRole('button'))

    await screen.findByRole('button')
    expect(window.alert).toHaveBeenCalledWith('Error: No permitido')
  })

  it('rendera DashboardWarnings en singular cuando hay una sola fuente degradada', () => {
    render(<DashboardWarnings warnings={['redis down']} />)

    expect(screen.getByText('1 fuente degradada')).toBeInTheDocument()
    expect(screen.queryByText('1 fuentes degradadas')).not.toBeInTheDocument()
  })

  it('desactiva mesa activa con confirmacion y refresca', async () => {
    render(<TableActiveToggle tableId="table-1" isActive={true} />)

    fireEvent.click(screen.getByTitle('Desactivar mesa'))

    expect(window.confirm).toHaveBeenCalledWith('¿Desactivar esta mesa?')
    await screen.findByTitle('Desactivar mesa')
    expect(mockToggleTableActive).toHaveBeenCalledWith('table-1', false)
    expect(refresh).toHaveBeenCalled()
  })

  it('muestra alert de error cuando toggleTableActive falla', async () => {
    mockToggleTableActive.mockRejectedValueOnce(new Error('Servidor caído'))

    render(<TableActiveToggle tableId="table-1" isActive={false} />)

    fireEvent.click(screen.getByTitle('Activar mesa'))

    await screen.findByTitle('Activar mesa')
    expect(window.alert).toHaveBeenCalledWith('Error al activar: Servidor caído')
  })

  it('no togglea la mesa cuando el usuario cancela la confirmacion', () => {
    window.confirm = jest.fn(() => false)

    render(<TableActiveToggle tableId="table-1" isActive={true} />)

    fireEvent.click(screen.getByTitle('Desactivar mesa'))

    expect(window.confirm).toHaveBeenCalledWith('¿Desactivar esta mesa?')
    expect(mockToggleTableActive).not.toHaveBeenCalled()
    expect(refresh).not.toHaveBeenCalled()
  })
})
