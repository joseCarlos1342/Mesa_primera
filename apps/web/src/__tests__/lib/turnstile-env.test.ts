describe('getPublicTurnstileSiteKey', () => {
  const originalEnv = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const originalRuntimeKey = window.__MESA_PRIMERA_RUNTIME_ENV__?.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  afterEach(() => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = originalEnv
    window.__MESA_PRIMERA_RUNTIME_ENV__ = {
      ...window.__MESA_PRIMERA_RUNTIME_ENV__,
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: originalRuntimeKey,
    }
    jest.resetModules()
  })

  it('uses trimmed build-time env value first', async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = '  site-key-from-env  '

    const { getPublicTurnstileSiteKey } = await import('@/lib/security/turnstile-env')

    expect(getPublicTurnstileSiteKey()).toBe('site-key-from-env')
  })

  it('falls back to runtime injected env when build-time env is empty', async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = '   '
    window.__MESA_PRIMERA_RUNTIME_ENV__ = {
      ...window.__MESA_PRIMERA_RUNTIME_ENV__,
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: ' runtime-key ',
    }

    const { getPublicTurnstileSiteKey } = await import('@/lib/security/turnstile-env')

    expect(getPublicTurnstileSiteKey()).toBe('runtime-key')
  })
})
