/**
 * @jest-environment node
 */
import { lookupUserByPhone, transferToPlayer } from '@/app/actions/transfer'
import { createClient } from '@/utils/supabase/server'

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('Transfer Server Actions', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.resetAllMocks()

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    }

    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  describe('lookupUserByPhone', () => {
    it('returns error when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
      const result = await lookupUserByPhone('+573001234567')
      expect(result).toEqual({ error: 'No autenticado' })
    })

    it('returns error for invalid phone format', async () => {
      const result = await lookupUserByPhone('abc')
      expect(result).toEqual({ error: 'Número de teléfono inválido' })
    })

    it('returns error when phone too short', async () => {
      const result = await lookupUserByPhone('123')
      expect(result).toEqual({ error: 'Número de teléfono inválido' })
    })

    it('returns user data on successful lookup', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: { found: true, user_id: 'user-2', username: 'TestPlayer', avatar_url: '/avatar.png', level: 5 },
        error: null,
      })

      const result = await lookupUserByPhone('+573001234567')
      expect(mockSupabase.rpc).toHaveBeenCalledWith('lookup_user_by_phone', { p_phone: '+573001234567' })
      expect(result).toEqual({
        user: { id: 'user-2', username: 'TestPlayer', avatar_url: '/avatar.png', level: 5 },
      })
    })

    it('returns error when phone not registered', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: { found: false, error: 'Número no registrado' },
        error: null,
      })

      const result = await lookupUserByPhone('+573009999999')
      expect(result).toEqual({ error: 'Número no registrado' })
    })

    it('returns error on RPC failure', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
      })

      const result = await lookupUserByPhone('+573001234567')
      expect(result).toEqual({ error: 'Error al buscar usuario' })
    })
  })

  describe('transferToPlayer', () => {
    it('returns error when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
      const result = await transferToPlayer('recipient-id', 50000)
      expect(result).toEqual({ error: 'No autenticado' })
    })

    it('returns error for invalid recipient UUID', async () => {
      const result = await transferToPlayer('not-a-uuid', 50000)
      expect(result.error).toBeTruthy()
    })

    it('returns error for amount below minimum', async () => {
      const result = await transferToPlayer('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 5000)
      expect(result).toEqual({ error: 'El monto mínimo es $100' })
    })

    it('returns success on valid transfer', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: {
          reference_id: 'ref-123',
          sender_balance_after: 450000,
          recipient_name: 'PlayerTwo',
          amount_cents: 50000,
        },
        error: null,
      })

      const recipientId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'
      const result = await transferToPlayer(recipientId, 50000)

      expect(mockSupabase.rpc).toHaveBeenCalledWith('transfer_between_players', {
        p_recipient_id: recipientId,
        p_amount_cents: 50000,
      })
      expect(result).toEqual({
        success: true,
        referenceId: 'ref-123',
        senderBalanceAfter: 450000,
        recipientName: 'PlayerTwo',
        amountCents: 50000,
      })
    })

    it('returns error from RPC rejection', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: { error: 'Saldo insuficiente' },
        error: null,
      })

      const result = await transferToPlayer('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 50000)
      expect(result).toEqual({ error: 'Saldo insuficiente' })
    })

    it('returns error on RPC failure', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'connection refused' },
      })

      const result = await transferToPlayer('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 50000)
      expect(result).toEqual({ error: 'Error al procesar la transferencia' })
    })
  })
})
