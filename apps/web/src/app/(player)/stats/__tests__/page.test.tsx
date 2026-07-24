import { render, screen } from '@testing-library/react'
import StatsPage from '../page'
import { StatsData, StatsLoadingSkeleton } from '../stats-data'
import { getBonusStatus } from '@/app/actions/bonus'
import { getLeaderboard, getMyStats } from '@/app/actions/stats'

jest.mock('@/app/actions/stats', () => ({
  getMyStats: jest.fn(),
  getLeaderboard: jest.fn(),
}))

jest.mock('@/app/actions/bonus', () => ({
  getBonusStatus: jest.fn(),
}))

jest.mock('../_components/StatsShell', () => ({
  StatsShell: ({ children }: { children: React.ReactNode }) => (
    <section data-testid="stats-shell">
      <h1>Shell Estadísticas</h1>
      {children}
    </section>
  ),
}))

jest.mock('../_components/StatsClient', () => ({
  StatsClient: ({ initialStats, initialLeaderboard, initialBonusStatus }: {
    initialStats: { games_played: number } | null
    initialLeaderboard: unknown[]
    initialBonusStatus: { current_tier?: string } | null
  }) => (
    <section data-testid="stats-client">
      <span>Juegos: {initialStats?.games_played ?? 0}</span>
      <span>Ranking: {initialLeaderboard.length}</span>
      <span>Bono: {initialBonusStatus?.current_tier ?? 'sin-bono'}</span>
    </section>
  ),
}))

describe('StatsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getMyStats as jest.Mock).mockResolvedValue({ games_played: 18 })
    ;(getLeaderboard as jest.Mock).mockResolvedValue([{ user_id: 'u1' }, { user_id: 'u2' }])
    ;(getBonusStatus as jest.Mock).mockResolvedValue({ current_tier: 'oro' })
  })

  it('renderiza shell y fallback inmediatamente en la pagina', () => {
    render(<StatsPage />)

    expect(screen.getByTestId('stats-shell')).toBeInTheDocument()
    expect(screen.getByText('Shell Estadísticas')).toBeInTheDocument()
    expect(document.querySelectorAll('.h-40')).toHaveLength(5)
    expect(document.querySelectorAll('.h-60')).toHaveLength(1)
  })

  it('StatsData entrega datos server-side al cliente', async () => {
    render(await StatsData())

    expect(screen.getByTestId('stats-client')).toBeInTheDocument()
    expect(screen.getByText('Juegos: 18')).toBeInTheDocument()
    expect(screen.getByText('Ranking: 2')).toBeInTheDocument()
    expect(screen.getByText('Bono: oro')).toBeInTheDocument()
    expect(getMyStats).toHaveBeenCalledTimes(1)
    expect(getLeaderboard).toHaveBeenCalledWith('total_ganadas')
    expect(getBonusStatus).toHaveBeenCalledTimes(1)
  })

  it('StatsData mantiene contrato con datos nulos o vacios', async () => {
    ;(getMyStats as jest.Mock).mockResolvedValue(null)
    ;(getLeaderboard as jest.Mock).mockResolvedValue([])
    ;(getBonusStatus as jest.Mock).mockResolvedValue(null)

    render(await StatsData())

    expect(screen.getByText('Juegos: 0')).toBeInTheDocument()
    expect(screen.getByText('Ranking: 0')).toBeInTheDocument()
    expect(screen.getByText('Bono: sin-bono')).toBeInTheDocument()
  })

  it('StatsLoadingSkeleton mantiene la estructura de carga esperada', () => {
    render(<StatsLoadingSkeleton />)

    expect(document.querySelectorAll('.h-40')).toHaveLength(5)
    expect(document.querySelectorAll('.h-60')).toHaveLength(1)
  })
})
