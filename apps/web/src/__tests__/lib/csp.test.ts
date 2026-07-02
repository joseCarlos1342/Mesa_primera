import { buildContentSecurityPolicy, toWebSocketOrigin } from '@/lib/security/csp'

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
      "script-src 'self' 'nonce-test-nonce' 'strict-dynamic' 'unsafe-inline' https://static.cloudflareinsights.com"
    )
    expect(csp).toContain(
      "script-src-elem 'self' 'nonce-test-nonce' 'unsafe-inline' https://static.cloudflareinsights.com https://challenges.cloudflare.com https://primerariveradalos4ases.com/cdn-cgi/scripts/"
    )
    expect(csp).toContain(
      "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'"
    )
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

  it('allows local game and socket origins in development', () => {
    process.env.GAME_SERVER_URL = 'http://127.0.0.1:2567'
    process.env.SOCKET_URL = 'http://127.0.0.1:2568'

    const csp = buildContentSecurityPolicy({
      nonce: 'test-nonce',
      isDevelopment: true,
    })

    expect(csp).toContain('http://127.0.0.1:2567')
    expect(csp).toContain('ws://127.0.0.1:2567')
    expect(csp).toContain('http://127.0.0.1:2568')
    expect(csp).toContain('ws://127.0.0.1:2568')
  })

  it('falls back to the default production origins when env URLs are invalid', () => {
    process.env.GAME_SERVER_URL = 'not-a-valid-url'
    process.env.SOCKET_URL = 'http://'

    const csp = buildContentSecurityPolicy({
      nonce: 'test-nonce',
      isDevelopment: false,
    })

    expect(csp).toContain('https://vps24726.cubepath.net')
    expect(csp).toContain('wss://vps24726.cubepath.net')
    expect(csp).not.toContain('not-a-valid-url')
  })

  it('keeps non-http websocket origins unchanged', () => {
    expect(toWebSocketOrigin('wss://socket.example.test')).toBe('wss://socket.example.test')
    expect(toWebSocketOrigin('ws://localhost:2568')).toBe('ws://localhost:2568')
  })
})
