import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Leaderboard } from '../Leaderboard'
import { StatsClient } from '../StatsClient'
import { StatsShell } from '../StatsShell'
import { StatsTabs } from '../StatsTabs'
import { StatsTabContext } from '../stats-tab-context'
import { getLeaderboard } from '@/app/actions/stats'

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: {
    div: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, layoutId: _layoutId, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => (
      <div {...props}>{children}</div>
    ),
  },
}))

jest.mock('@/utils/avatars', () => ({
  getAvatarSvg: jest.fn((avatarId?: string | null) => avatarId === 'avatar-ok' ? <svg data-testid="stats-avatar" /> : null),
}))

jest.mock('@/app/actions/stats', () => ({
  getLeaderboard: jest.fn(),
}))

jest.mock('../stats-dashboard', () => ({
  StatsDashboard: ({ stats, bonusStatus }: { stats: { games_played: number }, bonusStatus: { current_tier?: string } | null }) => (
    <section data-testid="stats-dashboard">
      <span>Partidas: {stats.games_played}</span>
      <span>Tier: {bonusStatus?.current_tier ?? 'sin-bono'}</span>
    </section>
  ),
}))

jest.mock('../Leaderboard', () => ({
  Leaderboard: ({ entries, category }: { entries: { username: string }[], category: string }) => (
    <section data-testid="stats-leaderboard">
      <span>Categoría: {category}</span>
      {entries.map((entry) => <span key={entry.username}>{entry.username}</span>)}
    </section>
  ),
}))

const initialStats = {
  user_id: 'user-1',
  games_played: 12,
  games_won: 8,
  current_streak: 2,
  best_streak: 5,
  primeras_count: 1,
  chivos_count: 2,
  segundas_count: 3,
  total_won_cents: 150000,
  total_lost_cents: 40000,
  total_rake_paid_cents: 7000,
  last_game_at: '2026-06-01T00:00:00.000Z',
}

const initialLeaderboard = [
  { user_id: 'u1', username: 'Campeon', avatar_url: null, score: 20 },
]

describe('stats shell and client components', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getLeaderboard as jest.Mock).mockResolvedValue([
      { user_id: 'u2', username: 'Rachero', avatar_url: null, score: 9 },
    ])
  })

  it('StatsTabs marca la pestaña activa y notifica cambios', () => {
    const onChange = jest.fn()
    render(<StatsTabs activeTab="personal" onChange={onChange} />)

    expect(screen.getByRole('button', { name: 'Mis Stats' })).toHaveClass('text-black')
    fireEvent.click(screen.getByRole('button', { name: 'Ranking Global' }))

    expect(onChange).toHaveBeenCalledWith('global')
  })

  it('StatsShell renderiza header, tabs, children y cambia el contexto a global', () => {
    render(
      <StatsShell>
        <StatsTabContext.Consumer>
          {({ activeTab }) => <span>Tab actual: {activeTab}</span>}
        </StatsTabContext.Consumer>
      </StatsShell>,
    )

    expect(screen.getByText('Salón de la Fama')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Estadísticas' })).toBeInTheDocument()
    expect(screen.getByText('Tab actual: personal')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ranking Global' }))

    expect(screen.getByText('Tab actual: global')).toBeInTheDocument()
    expect(screen.getByText('Los datos se actualizan en tiempo real al finalizar cada ronda')).toBeInTheDocument()
  })

  it('StatsClient muestra dashboard personal con stats y bono inicial', () => {
    render(
      <StatsTabContext.Provider value={{ activeTab: 'personal', setActiveTab: jest.fn() }}>
        <StatsClient initialStats={initialStats} initialLeaderboard={initialLeaderboard} initialBonusStatus={{ current_tier: 'oro' } as any} />
      </StatsTabContext.Provider>,
    )

    expect(screen.getByTestId('stats-dashboard')).toBeInTheDocument()
    expect(screen.getByText('Partidas: 12')).toBeInTheDocument()
    expect(screen.getByText('Tier: oro')).toBeInTheDocument()
  })

  it('StatsClient muestra estado sin actividad cuando no hay stats personales', () => {
    render(
      <StatsTabContext.Provider value={{ activeTab: 'personal', setActiveTab: jest.fn() }}>
        <StatsClient initialStats={null} initialLeaderboard={initialLeaderboard} initialBonusStatus={null} />
      </StatsTabContext.Provider>,
    )

    expect(screen.getByText('Sin actividad registrada')).toBeInTheDocument()
    expect(screen.getByText(/Aún no has participado/)).toBeInTheDocument()
  })

  it('StatsClient usa el ranking inicial y carga otra categoria bajo demanda', async () => {
    render(
      <StatsTabContext.Provider value={{ activeTab: 'global', setActiveTab: jest.fn() }}>
        <StatsClient initialStats={initialStats} initialLeaderboard={initialLeaderboard} initialBonusStatus={null} />
      </StatsTabContext.Provider>,
    )

    expect(screen.getByText('Categoría: total_ganadas')).toBeInTheDocument()
    expect(screen.getByText('Campeon')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Rachas' }))

    await waitFor(() => expect(getLeaderboard).toHaveBeenCalledWith('mejor_racha'))
    expect(await screen.findByText('Categoría: mejor_racha')).toBeInTheDocument()
    expect(screen.getByText('Rachero')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Partidas' }))

    expect(screen.getByText('Categoría: total_ganadas')).toBeInTheDocument()
    expect(screen.getByText('Campeon')).toBeInTheDocument()
  })
})

describe('Leaderboard visual ranking component', () => {
  it('muestra estado vacio cuando no hay entradas', () => {
    const ActualLeaderboard = jest.requireActual('../Leaderboard').Leaderboard as typeof Leaderboard
    render(<ActualLeaderboard entries={[]} category="total_ganadas" />)

    expect(screen.getByText('Buscando leyendas...')).toBeInTheDocument()
  })

  it('renderiza ranking con avatar, fallback anonimo y label por categoria', () => {
    const ActualLeaderboard = jest.requireActual('../Leaderboard').Leaderboard as typeof Leaderboard
    render(
      <ActualLeaderboard
        category="maestro_primera"
        entries={[
          { user_id: 'u1', username: 'Especialista', avatar_url: 'avatar-ok', score: 5 },
          { user_id: 'u2', username: null, avatar_url: null, score: 2 },
        ]}
      />,
    )

    expect(screen.getByText('Especialista')).toBeInTheDocument()
    expect(screen.getByText('Anónimo')).toBeInTheDocument()
    expect(screen.getByTestId('stats-avatar')).toBeInTheDocument()
    expect(screen.getAllByText('Especiales')).toHaveLength(2)
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1)
  })
})
