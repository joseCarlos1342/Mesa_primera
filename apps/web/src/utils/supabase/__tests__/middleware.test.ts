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

function mockSupabase(overrides: {
  user?: { id: string } | null
  profile?: { role: string; last_device_id: string | null } | null
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
      profile: { role: 'player', last_device_id: 'device-B' },
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
      profile: { role: 'admin', last_device_id: 'device-B' },
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
      profile: { role: 'admin', last_device_id: 'device-B' },
      aalData: { currentLevel: 'aal1', nextLevel: 'aal1' },
    })

    const req = makeRequest('/login/admin/mfa/setup', { session_device_id: 'device-A' })
    const res = await updateSession(req)

    const location = res.headers?.get('location') ?? ''
    expect(location).not.toContain('kicked=true')
  })
})
