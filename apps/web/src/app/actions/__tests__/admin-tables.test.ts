/**
 * @jest-environment node
 */
import { createTable } from '../admin-tables'
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

describe('createTable', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('rechaza nombre vacío antes de crear cliente Supabase', async () => {
    await expect(createTable({ name: '   ' })).rejects.toThrow('El nombre de la mesa es requerido')

    expect(createClient).not.toHaveBeenCalled()
  })

  it('rechaza nombres demasiado largos antes de crear cliente Supabase', async () => {
    await expect(createTable({ name: 'x'.repeat(81) })).rejects.toThrow('El nombre de la mesa es demasiado largo')

    expect(createClient).not.toHaveBeenCalled()
  })

  it('rechaza capacidad fuera de rango antes de crear cliente Supabase', async () => {
    await expect(createTable({ name: 'Mesa válida', max_players: 99 })).rejects.toThrow(
      'La capacidad debe estar entre 3 y 7 jugadores'
    )

    expect(createClient).not.toHaveBeenCalled()
  })
})
