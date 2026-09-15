import { fireEvent, render, screen } from '@testing-library/react'
import DemoTablePage from '../page'
import { DemoTablePreview } from '../table-preview'

const notFound = jest.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
})

jest.mock('next/navigation', () => ({
  notFound: () => notFound(),
}))

jest.mock('@/components/game/Board', () => ({
  Board: ({ phase, players, room }: { phase: string; players: unknown[]; room: { roomId: string } }) => (
    <div data-testid="demo-board" data-phase={phase} data-player-count={players.length}>
      {room.roomId}
    </div>
  ),
}))

describe('DemoTablePage', () => {
  const originalNodeEnv = process.env.NODE_ENV

  afterEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      configurable: true,
      value: originalNodeEnv,
    })
    notFound.mockClear()
  })

  it('solo renderiza la vista de mesa en desarrollo', () => {
    Object.defineProperty(process.env, 'NODE_ENV', { configurable: true, value: 'development' })

    const page = DemoTablePage()

    expect(page).toEqual(expect.objectContaining({ type: DemoTablePreview }))
    expect(notFound).not.toHaveBeenCalled()
  })

  it('oculta la ruta en producción', () => {
    Object.defineProperty(process.env, 'NODE_ENV', { configurable: true, value: 'production' })

    expect(() => DemoTablePage()).toThrow('NEXT_NOT_FOUND')
    expect(notFound).toHaveBeenCalledTimes(1)
  })
})

describe('DemoTablePreview', () => {
  it('muestra una mesa completa y permite cambiar de escenario local', () => {
    render(<DemoTablePreview />)

    const board = screen.getByTestId('demo-board')
    expect(board).toHaveAttribute('data-phase', 'PIQUE')
    expect(board).toHaveAttribute('data-player-count', '7')
    expect(board).toHaveTextContent('visual-preview')

    fireEvent.click(screen.getByRole('button', { name: 'Descarte' }))

    expect(screen.getByTestId('demo-board')).toHaveAttribute('data-phase', 'DESCARTE')
  })
})
