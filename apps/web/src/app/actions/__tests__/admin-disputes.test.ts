/**
 * @jest-environment node
 */
import { createDispute } from '../admin-disputes'
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

describe('createDispute', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('rechaza prioridad inválida antes de crear cliente Supabase', async () => {
    await expect(
      createDispute({
        title: 'Caso válido',
        description: 'Descripción válida',
        priority: 'urgent' as never,
        evidence_snapshot: [],
      })
    ).resolves.toEqual({ error: 'Prioridad inválida' })

    expect(createClient).not.toHaveBeenCalled()
  })

  it('rechaza título demasiado largo antes de crear cliente Supabase', async () => {
    await expect(
      createDispute({
        title: 'x'.repeat(121),
        description: 'Descripción válida',
        priority: 'medium',
        evidence_snapshot: [],
      })
    ).resolves.toEqual({ error: 'El título es demasiado largo' })

    expect(createClient).not.toHaveBeenCalled()
  })

  it('rechaza descripción demasiado larga antes de crear cliente Supabase', async () => {
    await expect(
      createDispute({
        title: 'Caso válido',
        description: 'x'.repeat(5001),
        priority: 'medium',
        evidence_snapshot: [],
      })
    ).resolves.toEqual({ error: 'La descripción es demasiado larga' })

    expect(createClient).not.toHaveBeenCalled()
  })
})
