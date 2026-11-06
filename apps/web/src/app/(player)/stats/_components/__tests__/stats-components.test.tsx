import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Leaderboard } from '../Leaderboard'
import { StatsClient } from '../StatsClient'
import { StatsShell } from '../StatsShell'
import { StatsTabs } from '../StatsTabs'
import { StatsTabContext, useStatsTab } from '../stats-tab-context'
import { getLeaderboard } from '@/app/actions/stats'
import { claimBonus } from '@/app/actions/bonus'
import confetti from 'canvas-confetti'

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt ?? ''} />,
}))

jest.mock('@/utils/avatars', () => ({
  getAvatarSvg: jest.fn((avatarId?: string | null) => avatarId === 'avatar-ok' ? <svg data-testid="stats-avatar" /> : null),
}))

jest.mock('@/app/actions/stats', () => ({
  getLeaderboard: jest.fn(),
}))

jest.mock('@/app/actions/bonus', () => ({
  claimBonus: jest.fn(),
}))

jest.mock('canvas-confetti', () => jest.fn())

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

const baseBonusStatus = {
  period: '2026-06',
  monthly_rake_cents: 20_000,
  tiers: [
    { id: 1, name: 'Bronce', min_rake_cents: 10_000, bonus_amount_cents: 2_500, unlocked: true, claimed: false },
    { id: 2, name: 'Plata', min_rake_cents: 50_000, bonus_amount_cents: 10_000, unlocked: false, claimed: false },
    { id: 3, name: 'Oro', min_rake_cents: 100_000, bonus_amount_cents: 25_000, unlocked: true, claimed: true },
  ],
}

const mockClaimBonus = claimBonus as jest.MockedFunction<typeof claimBonus>
const mockConfetti = confetti as jest.MockedFunction<typeof confetti>

describe('StatsTabs', () => {
  it('marca la pestaña activa y notifica cambios al hacer clic', () => {
    const onChange = jest.fn()
    render(<StatsTabs activeTab="personal" onChange={onChange} />)

    const personal = screen.getByRole('tab', { name: 'Mis números' })
    const global = screen.getByRole('tab', { name: 'Ranking' })
    expect(personal).toHaveAttribute('aria-selected', 'true')
    expect(global).toHaveAttribute('aria-selected', 'false')

    fireEvent.click(global)
    expect(onChange).toHaveBeenCalledWith('global')
  })

  it('marca global como activa y permite volver a personales', () => {
    const onChange = jest.fn()
    render(<StatsTabs activeTab="global" onChange={onChange} />)

    expect(screen.getByRole('tab', { name: 'Ranking' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(screen.getByRole('tab', { name: 'Mis números' }))

    expect(onChange).toHaveBeenCalledWith('personal')
  })

  it('cambia de pestaña con las flechas del teclado', () => {
    const onChange = jest.fn()
    render(<StatsTabs activeTab="personal" onChange={onChange} />)

    const personal = screen.getByRole('tab', { name: 'Mis números' })
    fireEvent.keyDown(personal, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith('global')

    fireEvent.keyDown(personal, { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenCalledWith('global')
  })

  it('ignora teclas que no son flechas', () => {
    const onChange = jest.fn()
    render(<StatsTabs activeTab="global" onChange={onChange} />)

    const global = screen.getByRole('tab', { name: 'Ranking' })
    fireEvent.keyDown(global, { key: 'Enter' })
    expect(onChange).not.toHaveBeenCalled()

    // Desde "global" las flechas devuelven a "personal".
    fireEvent.keyDown(global, { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenCalledWith('personal')
  })
})

describe('stats shell and client components', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getLeaderboard as jest.Mock).mockResolvedValue([
      { user_id: 'u2', username: 'Rachero', avatar_url: null, score: 9 },
    ])
  })

  it('StatsShell renderiza header, tabs, children y cambia el contexto a global', () => {
    render(
      <StatsShell>
        <StatsTabContext.Consumer>
          {({ activeTab }) => <span>Tab actual: {activeTab}</span>}
        </StatsTabContext.Consumer>
      </StatsShell>,
    )

    expect(screen.getByRole('heading', { name: 'Estadísticas' })).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'Vista de estadísticas' })).toBeInTheDocument()
    expect(screen.getByText('Tab actual: personal')).toBeInTheDocument()
    expect(screen.getByText('Los datos se actualizan al terminar cada ronda.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Ranking' }))

    expect(screen.getByText('Tab actual: global')).toBeInTheDocument()
  })

  it('useStatsTab expone el valor actual del proveedor', () => {
    function StatsTabProbe() {
      const { activeTab, setActiveTab } = useStatsTab()

      return (
        <button type="button" onClick={() => setActiveTab('personal')}>
          Tab hook: {activeTab}
        </button>
      )
    }

    const setActiveTab = jest.fn()

    render(
      <StatsTabContext.Provider value={{ activeTab: 'global', setActiveTab }}>
        <StatsTabProbe />
      </StatsTabContext.Provider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Tab hook: global' }))

    expect(setActiveTab).toHaveBeenCalledWith('personal')
  })

  it('useStatsTab expone el contexto default fuera del proveedor', () => {
    function DefaultStatsTabProbe() {
      const { activeTab, setActiveTab } = useStatsTab()

      return (
        <button type="button" onClick={() => setActiveTab('global')}>
          Tab default: {activeTab}
        </button>
      )
    }

    render(<DefaultStatsTabProbe />)

    fireEvent.click(screen.getByRole('button', { name: 'Tab default: personal' }))

    expect(screen.getByRole('button', { name: 'Tab default: personal' })).toBeInTheDocument()
  })

  it('StatsClient muestra dashboard personal con stats y bono inicial', () => {
    render(
      <StatsTabContext.Provider value={{ activeTab: 'personal', setActiveTab: jest.fn() }}>
        <StatsClient initialStats={initialStats} initialLeaderboard={initialLeaderboard} initialBonusStatus={{ current_tier: 'oro' } as never} />
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
    expect(screen.getByRole('link', { name: 'Ver mesas' })).toHaveAttribute('href', '/lobby')
  })

  it('StatsClient usa el ranking inicial y carga otra categoria bajo demanda', async () => {
    render(
      <StatsTabContext.Provider value={{ activeTab: 'global', setActiveTab: jest.fn() }}>
        <StatsClient initialStats={initialStats} initialLeaderboard={initialLeaderboard} initialBonusStatus={null} />
      </StatsTabContext.Provider>,
    )

    // Grupo de categorías con aria-pressed.
    const partidas = screen.getByRole('button', { name: 'Partidas' })
    expect(partidas).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Categoría: total_ganadas')).toBeInTheDocument()
    expect(screen.getByText('Campeon')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Rachas' }))

    await waitFor(() => expect(getLeaderboard).toHaveBeenCalledWith('mejor_racha'))
    expect(await screen.findByText('Categoría: mejor_racha')).toBeInTheDocument()
    expect(screen.getByText('Rachero')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rachas' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Partidas' }))

    expect(screen.getByText('Categoría: total_ganadas')).toBeInTheDocument()
    expect(screen.getByText('Campeon')).toBeInTheDocument()
  })
})

describe('Leaderboard visual ranking component', () => {
  it('muestra estado vacio cuando no hay entradas', () => {
    const ActualLeaderboard = jest.requireActual('../Leaderboard').Leaderboard as typeof Leaderboard
    render(<ActualLeaderboard entries={[]} category="total_ganadas" />)

    expect(screen.getByText('Todavía no hay ranking')).toBeInTheDocument()
  })

  it('renderiza ranking como lista ordenada con avatar, fallback anonimo y label por categoria', () => {
    const ActualLeaderboard = jest.requireActual('../Leaderboard').Leaderboard as typeof Leaderboard
    render(
      <ActualLeaderboard
        category="maestro_primera"
        entries={[
          { user_id: 'u1', username: 'Especialista', avatar_url: 'avatar-ok', score: 5 },
          // Nombre nulo a propósito: la UI debe mostrar "Anónimo".
          { user_id: 'u2', username: null as unknown as string, avatar_url: null, score: 2 },
        ]}
      />,
    )

    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getByText('Especialista')).toBeInTheDocument()
    expect(screen.getByText('Anónimo')).toBeInTheDocument()
    expect(screen.getByTestId('stats-avatar')).toBeInTheDocument()
    expect(screen.getAllByText('Especiales')).toHaveLength(2)
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('resalta y etiqueta la fila del jugador actual con "Tú"', () => {
    const ActualLeaderboard = jest.requireActual('../Leaderboard').Leaderboard as typeof Leaderboard
    render(
      <ActualLeaderboard
        category="total_ganadas"
        currentUserId="u2"
        entries={[
          { user_id: 'u1', username: 'Campeon', avatar_url: null, score: 20 },
          { user_id: 'u2', username: 'Yo Mismo', avatar_url: null, score: 7 },
        ]}
      />,
    )

    expect(screen.getByText('Tú')).toBeInTheDocument()
    expect(screen.getByText('Yo Mismo').closest('li')).toHaveAttribute('aria-current', 'true')
    expect(screen.getAllByText('Partidas').length).toBeGreaterThanOrEqual(2)
  })

  it('usa la etiqueta "Mejor racha" y distingue podio de posiciones altas', () => {
    const ActualLeaderboard = jest.requireActual('../Leaderboard').Leaderboard as typeof Leaderboard
    render(
      <ActualLeaderboard
        category="mejor_racha"
        entries={[
          { user_id: 'u1', username: 'Uno', avatar_url: null, score: 9 },
          { user_id: 'u2', username: 'Dos', avatar_url: null, score: 8 },
          { user_id: 'u3', username: 'Tres', avatar_url: null, score: 7 },
          { user_id: 'u4', username: 'Cuatro', avatar_url: null, score: 6 },
        ]}
      />,
    )

    // Etiqueta por categoría "mejor_racha".
    expect(screen.getAllByText('Mejor racha').length).toBe(4)
    // Hay un cuarto puesto (fuera del podio).
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('Cuatro')).toBeInTheDocument()
  })
})

describe('StatsDashboard real bonus behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renderiza métricas sin bono y evita división por cero en win rate', () => {
    const ActualStatsDashboard = jest.requireActual('../stats-dashboard').StatsDashboard

    render(<ActualStatsDashboard stats={{ ...initialStats, games_played: 0, games_won: 0 }} bonusStatus={null} />)

    expect(screen.getByText('Partidas')).toBeInTheDocument()
    expect(screen.getByText('Victorias')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByText('0 victorias')).toBeInTheDocument()
    expect(screen.getByText('Jugadas especiales')).toBeInTheDocument()
    // La sección de manos especiales siempre se muestra, el bono no.
    expect(screen.getByRole('heading', { name: 'Manos especiales' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Bono del mes' })).not.toBeInTheDocument()
  })

  it('muestra las manos especiales con sus cartas e importes', () => {
    const ActualStatsDashboard = jest.requireActual('../stats-dashboard').StatsDashboard

    render(<ActualStatsDashboard stats={initialStats} bonusStatus={null} />)

    expect(screen.getByRole('heading', { name: 'Manos especiales' })).toBeInTheDocument()
    expect(screen.getByText('Segunda')).toBeInTheDocument()
    expect(screen.getByText('Chivo')).toBeInTheDocument()
    expect(screen.getByText('Primera')).toBeInTheDocument()
    // Puntos no aparece (se filtra).
    expect(screen.queryByText('Puntos')).not.toBeInTheDocument()
    // Se renderizan cartas (PlayingCard -> next/image mockeada).
    expect(screen.getAllByRole('presentation', { hidden: true }).length).toBeGreaterThan(0)
  })

  it('muestra tiers reclamables, reclamados y bloqueados con progreso mensual y periodo formateado', () => {
    const ActualStatsDashboard = jest.requireActual('../stats-dashboard').StatsDashboard

    render(<ActualStatsDashboard stats={initialStats} bonusStatus={baseBonusStatus} />)

    expect(screen.getByRole('heading', { name: 'Bono del mes' })).toBeInTheDocument()
    // formatPeriod('2026-06') => "junio de 2026" (es-CO).
    expect(screen.getByText(/junio de 2026/i)).toBeInTheDocument()
    expect(screen.getByText('Disponible')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40')
    expect(screen.getByText('Bronce')).toBeInTheDocument()
    expect(screen.getByText('Plata')).toBeInTheDocument()
    expect(screen.getByText('Oro')).toBeInTheDocument()
    expect(screen.getByText('Reclamado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reclamar/i })).toBeInTheDocument()
  })

  it('muestra error cuando claimBonus rechaza el reclamo', async () => {
    const ActualStatsDashboard = jest.requireActual('../stats-dashboard').StatsDashboard
    mockClaimBonus.mockResolvedValueOnce({ error: 'Bono ya reclamado' })

    render(<ActualStatsDashboard stats={initialStats} bonusStatus={baseBonusStatus} />)
    fireEvent.click(screen.getByRole('button', { name: /reclamar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Bono ya reclamado')
    expect(mockConfetti).not.toHaveBeenCalled()
  })

  it('marca tier como reclamado, dispara celebración y la oculta luego', async () => {
    jest.useFakeTimers()
    const ActualStatsDashboard = jest.requireActual('../stats-dashboard').StatsDashboard
    mockClaimBonus.mockResolvedValueOnce({ success: true })

    render(<ActualStatsDashboard stats={initialStats} bonusStatus={baseBonusStatus} />)
    fireEvent.click(screen.getByRole('button', { name: /reclamar/i }))

    expect(await screen.findByText('¡Bono Bronce!')).toBeInTheDocument()
    expect(screen.getByText('+$25')).toBeInTheDocument()
    // La celebración se anuncia con role="status".
    expect(screen.getByRole('status')).toHaveTextContent('¡Bono Bronce!')
    expect(mockConfetti).toHaveBeenCalled()

    await waitFor(() => {
      expect(screen.getAllByText('Reclamado')).toHaveLength(2)
    })

    act(() => {
      jest.advanceTimersByTime(4_000)
    })

    await waitFor(() => {
      expect(screen.queryByText('¡Bono Bronce!')).not.toBeInTheDocument()
    })
    jest.useRealTimers()
  })

  it('respeta prefers-reduced-motion y no dispara confetti', async () => {
    const ActualStatsDashboard = jest.requireActual('../stats-dashboard').StatsDashboard
    mockClaimBonus.mockResolvedValueOnce({ success: true })
    const matchMedia = jest.fn().mockReturnValue({ matches: true })
    Object.defineProperty(window, 'matchMedia', { writable: true, configurable: true, value: matchMedia })

    render(<ActualStatsDashboard stats={initialStats} bonusStatus={baseBonusStatus} />)
    fireEvent.click(screen.getByRole('button', { name: /reclamar/i }))

    expect(await screen.findByText('¡Bono Bronce!')).toBeInTheDocument()
    expect(mockConfetti).not.toHaveBeenCalled()

    // @ts-expect-error limpiamos el mock de matchMedia.
    delete window.matchMedia
  })

  it('muestra el periodo sin formatear cuando no cumple el patrón YYYY-MM', () => {
    const ActualStatsDashboard = jest.requireActual('../stats-dashboard').StatsDashboard

    render(<ActualStatsDashboard stats={initialStats} bonusStatus={{ ...baseBonusStatus, period: 'Temporada alta' }} />)

    expect(screen.getByText('Temporada alta')).toBeInTheDocument()
  })

  it('muestra el mensaje de progreso inicial cuando el avance es bajo', () => {
    const ActualStatsDashboard = jest.requireActual('../stats-dashboard').StatsDashboard

    render(<ActualStatsDashboard stats={initialStats} bonusStatus={{ ...baseBonusStatus, monthly_rake_cents: 1_000 }} />)

    // nextTier = "Plata" (bloqueado, min 50.000). 1.000 / 50.000 => 2% < 30%.
    expect(screen.getByText('Cada mesa te acerca a tu bono.')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2')
  })

  it('muestra el mensaje de recta final cuando el avance es alto', () => {
    const ActualStatsDashboard = jest.requireActual('../stats-dashboard').StatsDashboard

    render(<ActualStatsDashboard stats={initialStats} bonusStatus={{ ...baseBonusStatus, monthly_rake_cents: 45_000 }} />)

    // 45.000 / 50.000 => 90% >= 70%.
    expect(screen.getByText('Ya casi lo tienes.')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '90')
  })

  it('no muestra barra de progreso cuando todos los tiers están desbloqueados', () => {
    const ActualStatsDashboard = jest.requireActual('../stats-dashboard').StatsDashboard
    const allUnlocked = {
      period: '2026-07',
      monthly_rake_cents: 120_000,
      tiers: [
        { id: 1, name: 'Bronce', min_rake_cents: 10_000, bonus_amount_cents: 2_500, unlocked: true, claimed: true },
        { id: 2, name: 'Plata', min_rake_cents: 50_000, bonus_amount_cents: 10_000, unlocked: true, claimed: false },
      ],
    }

    render(<ActualStatsDashboard stats={initialStats} bonusStatus={allUnlocked} />)

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.getByText('Disponible')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reclamar/i })).toBeInTheDocument()
  })
})
