/**
 * @jest-environment node
 */
import { updateMyProfile } from '../profile'
import { createClient } from '@/utils/supabase/server'

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

const user = { id: 'user-123' }

function buildSupabase(overrides: Record<string, unknown> = {}) {
  const update = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user } }),
    },
    from: jest.fn((table: string) => {
      if (table === 'profiles') return { update }
      throw new Error(`Unexpected table: ${table}`)
    }),
    ...overrides,
  }
}

describe('updateMyProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('rechaza si no hay sesión autenticada', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    })

    await expect(updateMyProfile({ username: 'Ana', full_name: 'Ana Mesa' })).resolves.toEqual({
      error: 'No autenticado',
    })
  })

  it('rechaza username con caracteres inválidos antes de tocar la DB', async () => {
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(updateMyProfile({ username: '<script>', full_name: 'Ana' })).resolves.toEqual({
      error: 'Alias inválido. Solo letras, números y guión bajo. 3-20 caracteres.',
    })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('rechacha full_name con HTML antes de tocar la DB', async () => {
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(updateMyProfile({ username: 'Ana', full_name: '<b>Ana</b>' })).resolves.toEqual({
      error: 'Nombre inválido. Solo letras, espacios y guiones. 2-80 caracteres.',
    })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('actualiza username y full_name validados', async () => {
    const updateEq = jest.fn().mockResolvedValue({ error: null })
    const update = jest.fn().mockReturnValue({ eq: updateEq })
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
      from: jest.fn((table: string) => (table === 'profiles' ? { update } : null)),
    })

    const result = await updateMyProfile({ username: 'AnaMesa', full_name: 'Ana Mesa' })

    expect(result).toEqual({ success: true })
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'AnaMesa',
        full_name: 'Ana Mesa',
        updated_at: expect.any(String),
      })
    )
  })

  it('propaga errores de la DB como mensaje seguro', async () => {
    const updateEq = jest.fn().mockResolvedValue({ error: { message: 'duplicate key' } })
    const update = jest.fn().mockReturnValue({ eq: updateEq })
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
      from: jest.fn((table: string) => (table === 'profiles' ? { update } : null)),
    })

    const result = await updateMyProfile({ username: 'AnaMesa', full_name: 'Ana Mesa' })

    expect(result.success).toBeUndefined()
    expect(result.error).toBeDefined()
    expect(result.error).not.toBe('duplicate key')
  })
})