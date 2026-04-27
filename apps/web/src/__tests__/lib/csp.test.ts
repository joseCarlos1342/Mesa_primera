import { buildContentSecurityPolicy } from '@/lib/security/csp'

describe('buildContentSecurityPolicy', () => {
  const originalGameServerUrl = process.env.GAME_SERVER_URL
  const originalSocketUrl = process.env.SOCKET_URL

  beforeEach(() => {
    process.env.GAME_SERVER_URL = 'https://vps24726.cubepath.net'
    process.env.SOCKET_URL = 'https://vps24726.cubepath.net'
  })

  afterEach(() => {
    process.env.GAME_SERVER_URL = originalGameServerUrl
    process.env.SOCKET_URL = originalSocketUrl
  })

  it('uses a nonce in production instead of unsafe script directives', () => {
    const csp = buildContentSecurityPolicy({
      nonce: 'test-nonce',
      isDevelopment: false,
    })

    expect(csp).toContain(
      "script-src 'self' 'nonce-test-nonce' 'strict-dynamic' https://static.cloudflareinsights.com"
    )
    expect(csp).toContain(
      "style-src 'self' https://fonts.googleapis.com 'nonce-test-nonce'"
    )
    expect(csp).not.toContain("'unsafe-inline'")
    expect(csp).not.toContain("'unsafe-eval'")
    expect(csp).toContain('https://vps24726.cubepath.net')
    expect(csp).toContain('wss://vps24726.cubepath.net')
    expect(csp).not.toContain('vps23830.cubepath.net')
    expect(csp).toContain('https://*.basemaps.cartocdn.com')
  })

  it('allows Carto tile domain in img-src for MapLibre map tiles', () => {
    const csp = buildContentSecurityPolicy({
      nonce: 'test-nonce',
      isDevelopment: false,
    })
    expect(csp).toMatch(/img-src.*https:\/\/\*\.basemaps\.cartocdn\.com/)
  })

  it('allows Carto tile domain in connect-src for MapLibre tile requests', () => {
    const csp = buildContentSecurityPolicy({
      nonce: 'test-nonce',
      isDevelopment: false,
    })
    expect(csp).toMatch(/connect-src.*https:\/\/\*\.basemaps\.cartocdn\.com/)
  })

  it('allows Carto root domain for style.json fetches', () => {
    const csp = buildContentSecurityPolicy({
      nonce: 'test-nonce',
      isDevelopment: false,
    })
    expect(csp).toMatch(/connect-src.*https:\/\/basemaps\.cartocdn\.com/)
  })

  it('allows unsafe-eval only in development', () => {
    const csp = buildContentSecurityPolicy({
      nonce: 'test-nonce',
      isDevelopment: true,
    })

    expect(csp).toContain("'unsafe-eval'")
    expect(csp).toContain(
      "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'"
    )
  })
})