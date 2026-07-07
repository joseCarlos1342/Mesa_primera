/**
 * @jest-environment node
 */
import { updateRulebook } from '../admin-settings'
import { createClient } from '@/utils/supabase/server'

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('../admin-audit', () => ({
  logAdminAction: jest.fn(),
}))

function createAdminSupabaseMock() {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null }),
    },
    from: jest.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
            }),
          }),
        }
      }

      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { value: { content: 'Reglas actuales' } }, error: null }),
          }),
        }),
        upsert: jest.fn().mockResolvedValue({ error: null }),
      }
    }),
  }
}

describe('updateRulebook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('rechaza contenido vacío antes de consultar DB', async () => {
    const supabase = createAdminSupabaseMock()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(updateRulebook('   ')).rejects.toThrow('El reglamento no puede estar vacío')

    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('rechaza reglamentos demasiado largos antes de consultar DB', async () => {
    const supabase = createAdminSupabaseMock()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(updateRulebook('x'.repeat(50_001))).rejects.toThrow('El reglamento es demasiado largo')

    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('rechaza HTML crudo antes de consultar DB', async () => {
    const supabase = createAdminSupabaseMock()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(updateRulebook('# Reglas\n<script>alert(1)</script>')).rejects.toThrow(
      'El reglamento no permite HTML crudo'
    )

    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('rechaza enlaces markdown con javascript antes de consultar DB', async () => {
    const supabase = createAdminSupabaseMock()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(updateRulebook('[haz clic](javascript:alert(1))')).rejects.toThrow(
      'El reglamento contiene enlaces no permitidos'
    )

    expect(supabase.from).not.toHaveBeenCalled()
  })
})
