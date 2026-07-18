import { getAdminReplaysSummary } from '../replays'
import { createClient } from '@/utils/supabase/server'

jest.mock('@/utils/supabase/server', () => ({ createClient: jest.fn() }))

function adminSupabase(rpcResult: { data: unknown; error: { message: string } | null }) {
  return {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { role: 'admin' } }) }) }),
    }),
    rpc: jest.fn().mockResolvedValue(rpcResult),
  }
}

describe('getAdminReplaysSummary', () => {
  it('convierte el summary global desde la RPC protegida', async () => {
    const supabase = adminSupabase({
      data: [{ total_games_with_replay: '500', total_replay_rake_cents: '12500000', total_unique_replay_players: '80' }],
      error: null,
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getAdminReplaysSummary()).resolves.toEqual({
      totalGamesWithReplay: 500,
      totalReplayRakeCents: 12500000,
      totalUniqueReplayPlayers: 80,
    })
    expect(supabase.rpc).toHaveBeenCalledWith('get_admin_replays_summary')
  })

  it('no convierte un error de la RPC en métricas cero', async () => {
    ;(createClient as jest.Mock).mockResolvedValue(adminSupabase({ data: null, error: { message: 'database error' } }))
    await expect(getAdminReplaysSummary()).resolves.toBeNull()
  })
})
