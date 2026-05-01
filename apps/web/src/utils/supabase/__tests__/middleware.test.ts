import { createServerClient } from '@supabase/ssr'

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
  return {
    NextResponse: {
      next: jest.fn(() => ({
        headers: new Map(),
        cookies: mockNextResponseCookies,
      })),
      redirect: jest.fn((url: URL) => {
        mockRedirectHeaders.clear()
        mockRedirectHeaders.set('location', url.toString())
        return {
          headers: { get: (k: string) => mockRedirectHeaders.get(k) ?? null },
          cookies: { set: jest.fn(), delete: jest.fn((n: string) => mockDeletedCookies.push(n)) },
        }
      }),
    },
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
})

describe('middleware – profile completeness enforcement', () => {
  let updateSession: typeof import('../middleware').updateSession

  beforeEach(() => {
    jest.clearAllMocks()
    mockDeletedCookies.length = 0
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
