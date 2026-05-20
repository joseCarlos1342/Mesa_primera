import { AuthError } from '@supabase/supabase-js'
import { registerAdmin } from '../auth-actions'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

function buildFormData(fields: Record<string, string>) {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value)
  }
  return formData
}

describe('registerAdmin signUp', () => {
  const originalToken = process.env.ADMIN_INVITE_TOKEN

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.ADMIN_INVITE_TOKEN = 'invite-ok'
  })

  afterAll(() => {
    process.env.ADMIN_INVITE_TOKEN = originalToken
  })

  it('crea admin y redirige a login', async () => {
    const supabase = {
      auth: {
        signUp: jest.fn().mockResolvedValue({
          data: { user: { id: 'admin-1' } },
          error: null,
        }),
      },
    }
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await registerAdmin(null, buildFormData({
      inviteToken: 'invite-ok',
      email: 'admin@mesa.test',
      password: 'SecureP4ss!',
      fullName: 'Admin Mesa',
    }))

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'admin@mesa.test',
      password: 'SecureP4ss!',
      options: {
        data: {
          full_name: 'Admin Mesa',
          role: 'admin',
        },
      },
    })
    expect(redirect).toHaveBeenCalledWith('/login/admin')
  })

  it('rechaza token inválido sin tocar Supabase', async () => {
    const result = await registerAdmin(null, buildFormData({
      inviteToken: 'bad-token',
      email: 'admin@mesa.test',
      password: 'SecureP4ss!',
      fullName: 'Admin Mesa',
    }))

    expect(result).toEqual({ error: 'Token de invitación inválido o no configurado.' })
    expect(createClient).not.toHaveBeenCalled()
  })

  it('propaga el AuthError controlado de signUp', async () => {
    const supabase = {
      auth: {
        signUp: jest.fn().mockResolvedValue({
          data: { user: null },
          error: new AuthError('User already registered', 422),
        }),
      },
    }
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    const result = await registerAdmin(null, buildFormData({
      inviteToken: 'invite-ok',
      email: 'admin@mesa.test',
      password: 'SecureP4ss!',
      fullName: 'Admin Mesa',
    }))

    expect(result).toEqual({ error: 'User already registered' })
    expect(redirect).not.toHaveBeenCalled()
  })
})
