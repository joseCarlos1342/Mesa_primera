import { createServerClient } from '@supabase/ssr'
import { getSupabaseEnvErrorMessage } from '../env'

// Mock env module
jest.mock('../env', () => ({
  getPublicSupabaseEnv: jest.fn(() => ({ url: 'http://localhost:54321', anonKey: 'test-key' })),
  getSupabaseEnvErrorMessage: jest.fn(() => null),
}))

// Mock @supabase/ssr
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}))

// Build a minimal NextResponse mock
const mockRedirectHeaders = new Map<string, string>()
const mockDeletedCookies: string[] = []
const mockNextResponseCookies = { set: jest.fn(), delete: jest.fn((n: string) => mockDeletedCookies.push(n)) }

jest.mock('next/server', () => {
  function MockNextResponse(body?: BodyInit | null, init?: ResponseInit) {
    return {
      body,
      status: init?.status,
      headers: {
        get: (key: string) => {
          const headers = init?.headers as Record<string, string> | undefined
          return headers?.[key] ?? null
        },
      },
      cookies: mockNextResponseCookies,
    }
  }

  MockNextResponse.next = jest.fn(() => ({
    headers: new Map(),
    cookies: mockNextResponseCookies,
  }))

  MockNextResponse.redirect = jest.fn((url: URL) => {
    mockRedirectHeaders.clear()
    mockRedirectHeaders.set('location', url.toString())
    return {
      headers: { get: (k: string) => mockRedirectHeaders.get(k) ?? null },
      cookies: { set: jest.fn(), delete: jest.fn((n: string) => mockDeletedCookies.push(n)) },
    }
  })

  return {
    NextResponse: MockNextResponse,
  }
})

function makeRequest(pathname: string, cookies: Record<string, string> = {}) {
  const url = new URL(`http://localhost:3000${pathname}`)
  return {
    nextUrl: { pathname, clone: () => url },
    cookies: {
      getAll: () => Object.entries(cookies).map(([name, value]) => ({ name, value })),
      get: (name: string) => cookies[name] ? { value: cookies[name] } : undefined,
      set: jest.fn(),
    },
    headers: new Headers(),
  } as any
}

type MockProfile = {
  role: string
  last_device_id: string | null
  phone?: string | null
  username?: string | null
  full_name?: string | null
  avatar_url?: string | null
  has_pin?: boolean | null
}

function mockSupabase(overrides: {
  user?: { id: string } | null
  profile?: MockProfile | null
  profileError?: boolean
  aalData?: { currentLevel: string; nextLevel: string } | null
}) {
  const {
    user = null,
    profile = null,
    profileError = false,
    aalData = null,
  } = overrides

  const supabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user }, error: user ? null : { message: 'no user' } }),
      signOut: jest.fn().mockResolvedValue({}),
      mfa: {
        getAuthenticatorAssuranceLevel: jest.fn().mockResolvedValue({ data: aalData }),
      },
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: profileError ? null : profile,
            error: profileError ? { message: 'not found' } : null,
          }),
        }),
      }),
    }),
  }

  ;(createServerClient as jest.Mock).mockReturnValue(supabase)
  return supabase
}

describe('middleware – device-kick exemption for admin MFA pages', () => {
  let updateSession: typeof import('../middleware').updateSession

  beforeEach(() => {
    jest.clearAllMocks()
    mockDeletedCookies.length = 0
    ;(getSupabaseEnvErrorMessage as jest.Mock).mockReturnValue(null)
  })

  beforeAll(async () => {
    ;({ updateSession } = await import('../middleware'))
  })

  it('kicks a player on dashboard when device cookie mismatches', async () => {
    mockSupabase({
      user: { id: 'u1' },
      profile: { role: 'player', last_device_id: 'device-B', phone: '+573001111111', username: 'testuser', full_name: 'Test User', avatar_url: 'avatar1', has_pin: true },
    })

    const req = makeRequest('/dashboard', { session_device_id: 'device-A' })
    const res = await updateSession(req)

    // Should redirect to /login/player?kicked=true
    expect(res.headers.get('location')).toContain('/login/player')
    expect(res.headers.get('location')).toContain('kicked=true')
    expect(mockDeletedCookies).toContain('session_device_id')
  })

  it('returns 500 when Supabase public env is missing', async () => {
    ;(getSupabaseEnvErrorMessage as jest.Mock).mockReturnValue('Missing Supabase env')

    const req = makeRequest('/dashboard')
    const res = await updateSession(req)

    expect(res).toMatchObject({ status: 500 })
    expect(createServerClient).not.toHaveBeenCalled()
  })

  it('allows static files without auth redirects', async () => {
    mockSupabase({ user: null })

    const req = makeRequest('/manifest.json')
    const res = await updateSession(req)

    const location = res.headers?.get('location') ?? ''
    expect(location).toBe('')
  })

  it('redirects unauthenticated private routes to player login', async () => {
    mockSupabase({ user: null })

    const req = makeRequest('/dashboard')
    const res = await updateSession(req)

    expect(res.headers.get('location')).toContain('/login/player')
  })

  it('keeps unauthenticated public and SEO pages accessible', async () => {
    mockSupabase({ user: null })

    const publicRes = await updateSession(makeRequest('/privacy'))
    const seoRes = await updateSession(makeRequest('/primera-riverada-los-4-ases'))

    expect(publicRes.headers?.get('location') ?? '').toBe('')
    expect(seoRes.headers?.get('location') ?? '').toBe('')
  })

  it('applies Supabase cookie writes to request and response with inactivity maxAge', async () => {
    let cookieBridge: { setAll: (cookies: Array<{ name: string; value: string; options?: Record<string, unknown> }>) => void } | null = null
    ;(createServerClient as jest.Mock).mockImplementation((_url, _key, options) => {
      cookieBridge = options.cookies
      return {
        auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      }
    })

    const req = makeRequest('/login/player')
    await updateSession(req)
    cookieBridge!.setAll([{ name: 'sb-token', value: 'abc', options: { path: '/' } }])

    expect(req.cookies.set).toHaveBeenCalledWith('sb-token', 'abc')
    expect(mockNextResponseCookies.set).toHaveBeenCalledWith('sb-token', 'abc', expect.objectContaining({
      path: '/',
      maxAge: 604800,
    }))
  })

  it('does NOT kick an admin on /login/admin/mfa even if device cookie mismatches', async () => {
    mockSupabase({
      user: { id: 'admin1' },
      profile: { role: 'admin', last_device_id: 'device-B', phone: null, username: 'admin1', full_name: 'Admin', avatar_url: 'avatar_admin', has_pin: true },
      aalData: { currentLevel: 'aal1', nextLevel: 'aal2' },
    })

    const req = makeRequest('/login/admin/mfa', { session_device_id: 'device-A' })
    const res = await updateSession(req)

    // Should NOT redirect to kicked page
    const location = res.headers?.get('location') ?? ''
    expect(location).not.toContain('kicked=true')
  })

  it('does NOT kick an admin on /login/admin/mfa/setup even if device cookie mismatches', async () => {
    mockSupabase({
      user: { id: 'admin2' },
      profile: { role: 'admin', last_device_id: 'device-B', phone: null, username: 'admin2', full_name: 'Admin2', avatar_url: 'avatar_admin2', has_pin: true },
      aalData: { currentLevel: 'aal1', nextLevel: 'aal1' },
    })

    const req = makeRequest('/login/admin/mfa/setup', { session_device_id: 'device-A' })
    const res = await updateSession(req)

    const location = res.headers?.get('location') ?? ''
    expect(location).not.toContain('kicked=true')
  })

  it('redirects non-admin users away from admin paths', async () => {
    mockSupabase({
      user: { id: 'u1' },
      profile: { role: 'player', last_device_id: null, phone: '+573001111111', username: 'player', full_name: 'Player', avatar_url: 'avatar', has_pin: true },
    })

    const res = await updateSession(makeRequest('/admin'))

    expect(res.headers.get('location')).toBe('http://localhost:3000/')
  })

  it('forces admin MFA setup when no second factor is enrolled', async () => {
    mockSupabase({
      user: { id: 'admin1' },
      profile: { role: 'admin', last_device_id: null, phone: null, username: 'admin', full_name: 'Admin', avatar_url: 'avatar', has_pin: true },
      aalData: { currentLevel: 'aal1', nextLevel: 'aal1' },
    })

    const res = await updateSession(makeRequest('/admin'))

    expect(res.headers.get('location')).toContain('/login/admin/mfa/setup')
  })

  it('forces admin MFA verification when aal2 is required but not current', async () => {
    mockSupabase({
      user: { id: 'admin1' },
      profile: { role: 'admin', last_device_id: null, phone: null, username: 'admin', full_name: 'Admin', avatar_url: 'avatar', has_pin: true },
      aalData: { currentLevel: 'aal1', nextLevel: 'aal2' },
    })

    const res = await updateSession(makeRequest('/admin'))

    expect(res.headers.get('location')).toContain('/login/admin/mfa')
  })

  it('redirects authenticated admins away from player-only routes', async () => {
    mockSupabase({
      user: { id: 'admin1' },
      profile: { role: 'admin', last_device_id: null, phone: null, username: 'admin', full_name: 'Admin', avatar_url: 'avatar', has_pin: true },
      aalData: { currentLevel: 'aal2', nextLevel: 'aal2' },
    })

    const res = await updateSession(makeRequest('/dashboard'))

    expect(res.headers.get('location')).toContain('/admin')
  })

  it('redirects authenticated admins from auth pages to admin dashboard', async () => {
    mockSupabase({
      user: { id: 'admin1' },
      profile: { role: 'admin', last_device_id: null, phone: null, username: 'admin', full_name: 'Admin', avatar_url: 'avatar', has_pin: true },
      aalData: { currentLevel: 'aal2', nextLevel: 'aal2' },
    })

    const res = await updateSession(makeRequest('/login/player'))

    expect(res.headers.get('location')).toContain('/admin')
  })

  it('keeps authenticated admins on admin password recovery page', async () => {
    mockSupabase({
      user: { id: 'admin1' },
      profile: { role: 'admin', last_device_id: null, phone: null, username: 'admin', full_name: 'Admin', avatar_url: 'avatar', has_pin: true },
      aalData: { currentLevel: 'aal2', nextLevel: 'aal2' },
    })

    const res = await updateSession(makeRequest('/login/admin/password'))

    expect(res.headers?.get('location') ?? '').toBe('')
  })
})

describe('middleware – profile completeness enforcement', () => {
  let updateSession: typeof import('../middleware').updateSession

  beforeEach(() => {
    jest.clearAllMocks()
    mockDeletedCookies.length = 0
    ;(getSupabaseEnvErrorMessage as jest.Mock).mockReturnValue(null)
  })

  beforeAll(async () => {
    ;({ updateSession } = await import('../middleware'))
  })

  it('redirects a player with incomplete profile (no phone) on /dashboard to /register/player/complete', async () => {
    mockSupabase({
      user: { id: 'u1' },
      profile: { role: 'player', last_device_id: null, phone: null, username: 'testuser', full_name: 'Test User', avatar_url: 'avatar1', has_pin: false },
    })

    const req = makeRequest('/dashboard')
    const res = await updateSession(req)

    expect(res.headers.get('location')).toContain('/register/player/complete')
  })

  it('redirects a player with incomplete profile (no username) on /dashboard to /register/player/complete', async () => {
    mockSupabase({
      user: { id: 'u2' },
      profile: { role: 'player', last_device_id: null, phone: '+573001111111', username: null, full_name: 'Test', avatar_url: 'av1', has_pin: false },
    })

    const req = makeRequest('/dashboard')
    const res = await updateSession(req)

    expect(res.headers.get('location')).toContain('/register/player/complete')
  })

  it('allows a player with incomplete profile to stay on /register/player/complete', async () => {
    mockSupabase({
      user: { id: 'u3' },
      profile: { role: 'player', last_device_id: null, phone: null, username: null, full_name: null, avatar_url: null, has_pin: false },
    })

    const req = makeRequest('/register/player/complete')
    const res = await updateSession(req)

    // Should NOT redirect to /register/player/complete (already there)
    const location = res.headers?.get('location') ?? ''
    expect(location).not.toContain('/register/player/complete')
  })

  it('allows a player with incomplete profile to stay on /register/player/verify', async () => {
    mockSupabase({
      user: { id: 'u4' },
      profile: { role: 'player', last_device_id: null, phone: null, username: null, full_name: null, avatar_url: null, has_pin: false },
    })

    const req = makeRequest('/register/player/verify')
    const res = await updateSession(req)

    // Should NOT redirect away from verify page
    const location = res.headers?.get('location') ?? ''
    expect(location).not.toContain('/register/player/complete')
  })

  it('redirects a player with complete profile but no PIN on /dashboard to /register/player/pin', async () => {
    mockSupabase({
      user: { id: 'u5' },
      profile: { role: 'player', last_device_id: null, phone: '+573001111111', username: 'testuser', full_name: 'Test User', avatar_url: 'avatar1', has_pin: false },
    })

    const req = makeRequest('/dashboard')
    const res = await updateSession(req)

    expect(res.headers.get('location')).toContain('/register/player/pin')
  })

  it('allows a player with complete profile but no PIN to stay on /register/player/pin', async () => {
    mockSupabase({
      user: { id: 'u6' },
      profile: { role: 'player', last_device_id: null, phone: '+573001111111', username: 'testuser', full_name: 'Test User', avatar_url: 'avatar1', has_pin: false },
    })

    const req = makeRequest('/register/player/pin')
    const res = await updateSession(req)

    // Should NOT redirect away from PIN setup page
    const location = res.headers?.get('location') ?? ''
    expect(location).not.toContain('/register/player/pin')
  })

  it('allows a player with complete profile but no PIN to stay on /register/player/biometric', async () => {
    mockSupabase({
      user: { id: 'u7' },
      profile: { role: 'player', last_device_id: null, phone: '+573001111111', username: 'testuser', full_name: 'Test User', avatar_url: 'avatar1', has_pin: false },
    })

    const req = makeRequest('/register/player/biometric')
    const res = await updateSession(req)

    // Should NOT redirect away from biometric setup page
    const location = res.headers?.get('location') ?? ''
    expect(location).not.toContain('/register/player/pin')
  })

  it('does NOT redirect a player with complete profile and PIN on /dashboard', async () => {
    mockSupabase({
      user: { id: 'u8' },
      profile: { role: 'player', last_device_id: null, phone: '+573001111111', username: 'testuser', full_name: 'Test User', avatar_url: 'avatar1', has_pin: true },
    })

    const req = makeRequest('/dashboard')
    const res = await updateSession(req)

    // Should NOT redirect to complete or pin — player is fully set up
    const location = res.headers?.get('location') ?? ''
    expect(location).not.toContain('/register/player/complete')
    expect(location).not.toContain('/register/player/pin')
  })

  it('redirects a complete player from root to dashboard', async () => {
    mockSupabase({
      user: { id: 'u8' },
      profile: { role: 'player', last_device_id: null, phone: '+573001111111', username: 'testuser', full_name: 'Test User', avatar_url: 'avatar1', has_pin: true },
    })

    const res = await updateSession(makeRequest('/'))

    expect(res.headers.get('location')).toContain('/dashboard')
  })

  it('redirects a complete player away from auth pages to dashboard', async () => {
    mockSupabase({
      user: { id: 'u8' },
      profile: { role: 'player', last_device_id: null, phone: '+573001111111', username: 'testuser', full_name: 'Test User', avatar_url: 'avatar1', has_pin: true },
    })

    const res = await updateSession(makeRequest('/login/player'))

    expect(res.headers.get('location')).toContain('/dashboard')
  })

  it('redirects a player with no profile data at all to /register/player/complete', async () => {
    mockSupabase({
      user: { id: 'u9' },
      profile: null,
      profileError: true,
    })

    const req = makeRequest('/dashboard')
    const res = await updateSession(req)

    expect(res.headers.get('location')).toContain('/register/player/complete')
  })

  it('forces incomplete-profile player on root / to /register/player/complete (bypassing dashboard redirect)', async () => {
    mockSupabase({
      user: { id: 'u10' },
      profile: { role: 'player', last_device_id: null, phone: null, username: 'testuser', full_name: 'Test User', avatar_url: 'avatar1', has_pin: false },
    })

    const req = makeRequest('/')
    const res = await updateSession(req)

    // Must redirect to complete, NOT to /dashboard
    expect(res.headers.get('location')).toContain('/register/player/complete')
  })

  it('does NOT enforce profile completeness on admin users', async () => {
    mockSupabase({
      user: { id: 'admin1' },
      profile: { role: 'admin', last_device_id: null, phone: null, username: null, full_name: 'Admin', avatar_url: null, has_pin: false },
    })

    const req = makeRequest('/admin')
    const res = await updateSession(req)

    // Admin should NOT be redirected to player registration
    const location = res.headers?.get('location') ?? ''
    expect(location).not.toContain('/register/player/complete')
    expect(location).not.toContain('/register/player/pin')
  })
})
