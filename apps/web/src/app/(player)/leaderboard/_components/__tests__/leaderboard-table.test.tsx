import { render, screen, within } from '@testing-library/react'
import { LeaderboardTable } from '../leaderboard-table'

jest.mock('@/utils/avatars', () => ({
  getAvatarSvg: jest.fn((avatarId?: string | null) => avatarId === 'avatar-ok' ? <svg data-testid="leaderboard-avatar" /> : null),
}))

describe('LeaderboardTable', () => {
  it('muestra estado vacio cuando no hay datos suficientes', () => {
    render(<LeaderboardTable data={[]} category="top_ganadores" />)

    expect(screen.getByText('Aún no hay suficientes datos para esta categoría.')).toBeInTheDocument()
  })

  it('formatea dinero y destaca el top 3 del ranking', () => {
    render(
      <LeaderboardTable
        category="top_ganadores"
        data={[
          { user_id: 'u1', username: 'Oro', avatar_url: 'avatar-ok', score: 12345 },
          { user_id: 'u2', username: 'Plata', avatar_url: null, score: 8000 },
          { user_id: 'u3', username: 'Bronce', avatar_url: null, score: 5000 },
          { user_id: 'u4', username: 'Cuarto', avatar_url: null, score: 1000 },
        ]}
      />,
    )

    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(5)
    expect(within(rows[1]).getByText('1')).toBeInTheDocument()
    expect(within(rows[2]).getByText('2')).toBeInTheDocument()
    expect(within(rows[3]).getByText('3')).toBeInTheDocument()
    expect(within(rows[4]).getByText('4')).toBeInTheDocument()
    expect(screen.getByText('Oro')).toHaveClass('text-lg')
    expect(screen.getByTestId('leaderboard-avatar')).toBeInTheDocument()
    expect(screen.getByText(/123,45/)).toBeInTheDocument()
  })

  it('formatea categorias de racha, cantos especiales y puntuacion generica', () => {
    const { rerender } = render(
      <LeaderboardTable data={[{ user_id: 'u1', username: 'Rachero', avatar_url: null, score: 6 }]} category="mejor_racha" />,
    )

    expect(screen.getByText('6 victorias seguidas')).toBeInTheDocument()

    rerender(<LeaderboardTable data={[{ user_id: 'u1', username: 'Maestro', avatar_url: null, score: 4 }]} category="maestro_primera" />)
    expect(screen.getByText('4 cantos especiales')).toBeInTheDocument()

    rerender(<LeaderboardTable data={[{ user_id: 'u1', username: 'Puntos', avatar_url: null, score: 99 }]} category="total_ganadas" />)
    expect(screen.getByText('99')).toBeInTheDocument()
  })
})
