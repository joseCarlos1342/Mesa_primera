import { registerPlayer, loginWithPin } from '../auth-actions'
import { createClient } from '@/utils/supabase/server'

jest.mock('@/lib/security/turnstile', () => ({
  verifyTurnstile: jest.fn().mockResolvedValue({
    success: false,
    error: 'Verificación de seguridad fallida. Recarga la página e intenta de nuevo.',
  }),
}))

jest.mock('@/app/actions/anti-fraud', () => ({
  enforceRateLimiting: jest.fn(),
}))

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

function buildFormData(fields: Record<string, string>) {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value)
  }
  return formData
}

describe('turnstile blocks auth actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('bloquea registerPlayer antes de crear cliente Supabase', async () => {
    const result = await registerPlayer(null, buildFormData({
      phone: '3205802918',
      fullName: 'Jose Carlos',
      nickname: 'Chepe',
      avatarId: 'as-oros',
    }))

    expect(result).toEqual({
      error: 'Verificación de seguridad fallida. Recarga la página e intenta de nuevo.',
    })
    expect(createClient).not.toHaveBeenCalled()
  })

  it('bloquea loginWithPin antes de llamar a signInWithPassword', async () => {
    const result = await loginWithPin(null, buildFormData({
      phone: '3205802918',
      pin: '123456',
    }))

    expect(result).toEqual({
      error: 'Verificación de seguridad fallida. Recarga la página e intenta de nuevo.',
    })
    expect(createClient).not.toHaveBeenCalled()
  })
})
