/**
 * @jest-environment node
 */
import { sendBroadcast } from '../admin-broadcast'
import { createClient } from '@/utils/supabase/server'

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
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
            eq: jest.fn((field: string) => {
              if (field === 'id') {
                return { single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }) }
              }
              return Promise.resolve({ data: [{ id: 'player-1' }], error: null })
            }),
          }),
        }
      }

      return {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { id: `${table}-1` }, error: null }),
          }),
        }),
      }
    }),
  }
}

describe('sendBroadcast', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('rechaza título vacío antes de insertar', async () => {
    const supabase = createAdminSupabaseMock()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(sendBroadcast({ type: 'security', title: '   ', body: 'Mensaje válido' })).rejects.toThrow(
      'El título es obligatorio'
    )

    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('rechaza cuerpo vacío antes de insertar', async () => {
    const supabase = createAdminSupabaseMock()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(sendBroadcast({ type: 'security', title: 'Título válido', body: '   ' })).rejects.toThrow(
      'El mensaje es obligatorio'
    )

    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('rechaza contenido demasiado largo', async () => {
    const supabase = createAdminSupabaseMock()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(
      sendBroadcast({ type: 'security', title: 'x'.repeat(121), body: 'Mensaje válido' })
    ).rejects.toThrow('El título es demasiado largo')

    await expect(
      sendBroadcast({ type: 'security', title: 'Título válido', body: 'x'.repeat(5001) })
    ).rejects.toThrow('El mensaje es demasiado largo')
  })
})
