/**
 * @jest-environment node
 */
import { requestWithdrawal } from '../withdrawals'
import { createClient } from '@/utils/supabase/server'

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

const user = { id: 'user-123' }

describe('requestWithdrawal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('rechaza si no hay sesión', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    })

    await expect(requestWithdrawal(50000, 'Banco XYZ')).resolves.toEqual({
      error: 'No authenticated',
    })
  })

  it('rechaza monto que no es múltiplo de $1.000 COP', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { id: 'w-1', balance_cents: 10000000 }, error: null }),
        }),
      })),
    })

    await expect(requestWithdrawal(500, 'Banco XYZ')).resolves.toEqual({
      error: 'El monto debe ser múltiplo de $1.000 COP',
    })
  })

  it('rechaza detalles bancarios vacíos antes de insertar', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { id: 'w-1', balance_cents: 10000000 }, error: null }),
        }),
      })),
    })

    await expect(requestWithdrawal(50000, '   ')).resolves.toEqual({
      error: 'Los detalles bancarios son obligatorios',
    })
  })

  it('rechaza detalles bancarios demasiado largos', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { id: 'w-1', balance_cents: 10000000 }, error: null }),
        }),
      })),
    })

    await expect(requestWithdrawal(50000, 'x'.repeat(1001))).resolves.toEqual({
      error: 'Los detalles bancarios son demasiado largos',
    })
  })
})