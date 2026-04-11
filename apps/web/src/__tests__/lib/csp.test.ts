import { buildContentSecurityPolicy } from '@/lib/security/csp'

describe('buildContentSecurityPolicy', () => {
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