import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { PlayerControls } from '../PlayerControls'
import { ResponsiveDataView, type ColumnDef } from '../ResponsiveDataView'
import { RulesEditor } from '../RulesEditor'
import { TableControls } from '../TableControls'
import { kickPlayer, setGameStatus } from '@/app/actions/admin-tables'
import { updateRulebook } from '@/app/actions/admin-settings'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/app/actions/admin-tables', () => ({
  kickPlayer: jest.fn(),
  setGameStatus: jest.fn(),
}))

jest.mock('@/app/actions/admin-settings', () => ({
  updateRulebook: jest.fn(),
}))

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockKickPlayer = kickPlayer as jest.MockedFunction<typeof kickPlayer>
const mockSetGameStatus = setGameStatus as jest.MockedFunction<typeof setGameStatus>
const mockUpdateRulebook = updateRulebook as jest.MockedFunction<typeof updateRulebook>

type Row = { id: string; name: string; amount: number; status: string }

const columns: ColumnDef<Row>[] = [
  { key: 'name', header: 'Jugador', render: (row) => row.name },
  { key: 'amount', header: 'Monto', align: 'right', render: (row) => `$${row.amount}` },
  { key: 'status', header: 'Estado', hideCardLabel: true, cardFullWidth: true, render: (row) => row.status },
]

describe('admin controls and data view', () => {
  const refresh = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    window.confirm = jest.fn(() => true)
    window.alert = jest.fn()
    mockUseRouter.mockReturnValue({ refresh } as unknown as ReturnType<typeof useRouter>)
    mockKickPlayer.mockResolvedValue({ success: true })
    mockSetGameStatus.mockResolvedValue({ success: true })
    mockUpdateRulebook.mockResolvedValue({ success: true })
  })

  it('renderiza tabla, cards mobile, header/footer y clases por fila', () => {
    render(
      <ResponsiveDataView
        columns={columns}
        data={[{ id: '1', name: 'Ana', amount: 5000, status: 'aprobado' }]}
        keyExtractor={(row) => row.id}
        header={<div>Filtros activos</div>}
        footer={<div>Total: 1</div>}
        rowClassName={(row) => (row.status === 'aprobado' ? 'row-ok' : '')}
        cardClassName={(row) => `card-${row.id}`}
      />,
    )

    expect(screen.getByText('Filtros activos')).toBeInTheDocument()
    expect(screen.getByText('Total: 1')).toBeInTheDocument()
    expect(screen.getAllByText('Ana')).toHaveLength(2)
    expect(screen.getAllByText('$5000')).toHaveLength(2)
    expect(screen.getAllByText('aprobado')).toHaveLength(2)
    expect(screen.getByRole('row', { name: /ana/i })).toHaveClass('row-ok')
  })

  it('renderiza empty state y card custom cuando corresponde', () => {
    const { rerender } = render(
      <ResponsiveDataView
        columns={columns}
        data={[]}
        keyExtractor={(row) => row.id}
        emptyMessage="No hay datos"
        emptyIcon={<span data-testid="empty-icon">icon</span>}
      />,
    )

    expect(screen.getAllByText('No hay datos')).toHaveLength(2)
    expect(screen.getAllByTestId('empty-icon')).toHaveLength(2)

    rerender(
      <ResponsiveDataView
        columns={columns}
        data={[{ id: '2', name: 'Luis', amount: 3000, status: 'pendiente' }]}
        keyExtractor={(row) => row.id}
        renderCard={(row) => <article>Card custom {row.name}</article>}
      />,
    )

    expect(screen.getByText('Card custom Luis')).toBeInTheDocument()
  })

  it('expulsa jugador confirmado y reporta errores', async () => {
    const { rerender } = render(<PlayerControls gameId="game-1" playerId="player-1" />)

    fireEvent.click(screen.getByTitle('Expulsar jugador'))

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('expulsar'))
    await waitFor(() => expect(mockKickPlayer).toHaveBeenCalledWith('game-1', 'player-1'))
    expect(refresh).toHaveBeenCalled()

    mockKickPlayer.mockRejectedValueOnce(new Error('Room cerrada'))
    rerender(<PlayerControls gameId="game-2" playerId="player-2" />)
    fireEvent.click(screen.getByTitle('Expulsar jugador'))

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Error al expulsar: Room cerrada'))
  })

  it('pausa, reanuda y cierra sala con los argumentos correctos', async () => {
    const { rerender } = render(<TableControls gameId="game-1" currentStatus="playing" />)

    fireEvent.click(screen.getByRole('button', { name: /pausar/i }))
    await waitFor(() => expect(mockSetGameStatus).toHaveBeenCalledWith('game-1', 'paused', 'Pausado por administrador.'))

    rerender(<TableControls gameId="game-1" currentStatus="paused" />)
    fireEvent.click(screen.getByRole('button', { name: /reanudar/i }))
    await waitFor(() => expect(mockSetGameStatus).toHaveBeenCalledWith('game-1', 'playing', undefined))

    fireEvent.click(screen.getByRole('button', { name: /cerrar sala/i }))
    await waitFor(() => expect(mockSetGameStatus).toHaveBeenCalledWith('game-1', 'closed_by_admin', undefined))
  })

  it('cancela cierre de sala y muestra error de cambio de estado', async () => {
    ;(window.confirm as jest.Mock).mockReturnValueOnce(false)
    render(<TableControls gameId="game-1" currentStatus="playing" />)

    fireEvent.click(screen.getByRole('button', { name: /cerrar sala/i }))
    expect(mockSetGameStatus).not.toHaveBeenCalled()

    mockSetGameStatus.mockRejectedValueOnce(new Error('No permitido'))
    fireEvent.click(screen.getByRole('button', { name: /pausar/i }))

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Error al cambiar estado: No permitido'))
  })

  it('edita y guarda reglas, deshabilitando cuando no hay cambios', async () => {
    render(<RulesEditor initialContent="Regla inicial" />)

    const button = screen.getByRole('button', { name: /guardar cambios/i })
    expect(button).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText('Escribe el reglamento en formato Markdown...'), {
      target: { value: 'Regla nueva' },
    })

    expect(button).toBeEnabled()
    fireEvent.click(button)

    await waitFor(() => expect(mockUpdateRulebook).toHaveBeenCalledWith('Regla nueva'))
    expect(window.alert).toHaveBeenCalledWith('Reglamento guardado exitosamente.')
    expect(refresh).toHaveBeenCalled()
  })

  it('muestra error al guardar reglas', async () => {
    mockUpdateRulebook.mockRejectedValueOnce(new Error('Markdown invalido'))
    render(<RulesEditor initialContent="Regla inicial" />)

    fireEvent.change(screen.getByPlaceholderText('Escribe el reglamento en formato Markdown...'), {
      target: { value: 'Regla rota' },
    })
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }))

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Error guardando el reglamento: Markdown invalido'))
  })
})
