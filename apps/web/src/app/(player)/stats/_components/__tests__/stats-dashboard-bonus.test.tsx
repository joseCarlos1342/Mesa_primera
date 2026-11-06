import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StatsDashboard } from '../stats-dashboard'
import { claimBonus } from '@/app/actions/bonus'

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt ?? ''} />,
}))

jest.mock('@/app/actions/bonus', () => ({
  claimBonus: jest.fn(),
}))

jest.mock('canvas-confetti', () => jest.fn())

const stats = {
  games_played: 5,
  games_won: 2,
  current_streak: 1,
  best_streak: 3,
  primeras_count: 1,
  chivos_count: 0,
  segundas_count: 0,
  total_won_cents: 200000,
  total_lost_cents: 100000,
  total_rake_paid_cents: 5000000,
}

describe('StatsDashboard bonus claim', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('muestra al jugador el error devuelto al reclamar un bono', async () => {
    ;(claimBonus as jest.Mock).mockResolvedValue({
      error: 'Aún no alcanzas el umbral para este bono',
    })

    render(
      <StatsDashboard
        stats={stats}
        bonusStatus={{
          period: '2026-05',
          monthly_rake_cents: 5000000,
          tiers: [
            {
              id: 1,
              name: 'Bronce',
              min_rake_cents: 5000000,
              bonus_amount_cents: 500000,
              unlocked: true,
              claimed: false,
            },
          ],
        }}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /reclamar/i }))

    expect(await screen.findByText('Aún no alcanzas el umbral para este bono')).toBeVisible()
  })
})
