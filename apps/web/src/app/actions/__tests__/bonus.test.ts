import { getBonusStatus, claimBonus } from '../bonus'
import { createClient } from '@/utils/supabase/server'

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

const mockUser = { id: 'user-123' }

function buildMockSupabase(overrides: {
  user?: any
  bonusStatusData?: any
  bonusStatusError?: any
  claimData?: any
  claimError?: any
} = {}) {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: overrides.user ?? mockUser },
      }),
    },
    rpc: jest.fn().mockImplementation((name: string) => {
      if (name === 'get_bonus_status') {
        return Promise.resolve({
          data: overrides.bonusStatusData ?? {
            period: '2026-04',
            monthly_rake_cents: 7500000,
            tiers: [
              { id: 1, name: 'Bronce', min_rake_cents: 5000000, bonus_amount_cents: 500000, unlocked: true, claimed: false },
              { id: 2, name: 'Plata', min_rake_cents: 10000000, bonus_amount_cents: 1000000, unlocked: false, claimed: false },
            ],
          },
          error: overrides.bonusStatusError ?? null,
        })
      }
      if (name === 'claim_bonus') {
        return Promise.resolve({
          data: overrides.claimData ?? {
            success: true,
            claim_id: 'claim-abc',
            bonus_amount_cents: 500000,
            balance_after: 1500000,
          },
          error: overrides.claimError ?? null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    }),
  }
}

describe('Bonus Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getBonusStatus', () => {
    it('devuelve null si el usuario no está autenticado', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
        },
        rpc: jest.fn(),
      }
      ;(createClient as any).mockReset()
      ;(createClient as any).mockResolvedValue(mockSupabase)

      const result = await getBonusStatus()
      expect(result).toBeNull()
      expect(mockSupabase.rpc).not.toHaveBeenCalled()
    })

    it('devuelve el estado del bono con tiers y rake mensual', async () => {
      const mock = buildMockSupabase()
      ;(createClient as any).mockResolvedValue(mock)

      const result = await getBonusStatus()
      expect(result).not.toBeNull()
      expect(result!.period).toBe('2026-04')
      expect(result!.monthly_rake_cents).toBe(7500000)
      expect(result!.tiers).toHaveLength(2)
      expect(result!.tiers[0].unlocked).toBe(true)
      expect(result!.tiers[0].claimed).toBe(false)
    })

    it('devuelve null si la RPC falla', async () => {
      const mock = buildMockSupabase({ bonusStatusError: { message: 'DB error' } })
      ;(createClient as any).mockResolvedValue(mock)

      const result = await getBonusStatus()
      expect(result).toBeNull()
    })
  })

  describe('claimBonus', () => {
    it('devuelve error si el usuario no está autenticado', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
        },
        rpc: jest.fn(),
      }
      ;(createClient as any).mockResolvedValue(mockSupabase)

      const result = await claimBonus(1)
      expect(result).toEqual({ error: 'No autenticado' })
      expect(mockSupabase.rpc).not.toHaveBeenCalled()
    })

    it('reclama un bono exitosamente', async () => {
      const mock = buildMockSupabase()
      ;(createClient as any).mockResolvedValue(mock)

      const result = await claimBonus(1)
      expect(result.success).toBe(true)
      expect(result.bonus_amount_cents).toBe(500000)
      expect(result.balance_after).toBe(1500000)
      expect(mock.rpc).toHaveBeenCalledWith('claim_bonus', { p_tier_id: 1 })
    })

    it('devuelve error si la RPC retorna error', async () => {
      const mock = buildMockSupabase({
        claimData: { error: 'Este bono ya fue reclamado este mes' },
      })
      ;(createClient as any).mockResolvedValue(mock)

      const result = await claimBonus(1)
      expect(result.error).toBe('Este bono ya fue reclamado este mes')
    })

    it('devuelve error si hay error de red/DB', async () => {
      const mock = buildMockSupabase({
        claimData: null,
        claimError: { message: 'connection timeout' },
      })
      ;(createClient as any).mockResolvedValue(mock)

      const result = await claimBonus(1)
      expect(result.error).toBe('connection timeout')
    })
  })
})
