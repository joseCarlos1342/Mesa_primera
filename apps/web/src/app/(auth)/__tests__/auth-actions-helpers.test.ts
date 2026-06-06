import crypto from 'crypto'
import { cookies } from 'next/headers'
import { enforceSessionPolicy } from '../auth-actions-helpers'
import { redis } from '@/utils/redis'
import { createClient } from '@/utils/supabase/server'

const cookieSet = jest.fn()

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}))

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/utils/redis', () => ({
  redis: {
    publish: jest.fn(),
  },
}))

function buildSupabase() {
  const eq = jest.fn().mockResolvedValue({ error: null })
  const update = jest.fn().mockReturnValue({ eq })
  const from = jest.fn().mockReturnValue({ update })

  return { from, update, eq }
}

describe('enforceSessionPolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(cookies as jest.Mock).mockResolvedValue({ set: cookieSet })
    jest.spyOn(crypto, 'randomUUID').mockReturnValue('device-123' as `${string}-${string}-${string}-${string}-${string}`)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('guarda el device id, actualiza el perfil y publica session_kick', async () => {
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)
    ;(redis.publish as jest.Mock).mockResolvedValue(1)

    await enforceSessionPolicy('user-123')

    expect(cookieSet).toHaveBeenCalledWith('session_device_id', 'device-123', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
    expect(supabase.from).toHaveBeenCalledWith('profiles')
    expect(supabase.update).toHaveBeenCalledWith({ last_device_id: 'device-123', is_online: true })
    expect(supabase.eq).toHaveBeenCalledWith('id', 'user-123')
    expect(redis.publish).toHaveBeenCalledWith(
      'session_kick',
      JSON.stringify({ userId: 'user-123', deviceId: 'device-123' }),
    )
  })

  it('mantiene la sesion protegida por cookie aunque Redis no publique el kick', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    const supabase = buildSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)
    ;(redis.publish as jest.Mock).mockRejectedValue(new Error('Redis offline'))

    await expect(enforceSessionPolicy('user-123')).resolves.toBeUndefined()

    expect(cookieSet).toHaveBeenCalledWith('session_device_id', 'device-123', expect.any(Object))
    expect(supabase.eq).toHaveBeenCalledWith('id', 'user-123')
    expect(warnSpy).toHaveBeenCalledWith('[SESSION_POLICY] Redis publish failed:', 'Redis offline')
  })
})
