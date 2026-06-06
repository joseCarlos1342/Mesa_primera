describe('verifyTurnstile', () => {
  const originalSecret = process.env.TURNSTILE_SECRET_KEY

  afterEach(() => {
    process.env.TURNSTILE_SECRET_KEY = originalSecret
    jest.restoreAllMocks()
    Reflect.deleteProperty(globalThis, 'fetch')
    jest.resetModules()
  })

  it('rejects whitespace-only token when secret key is configured', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret-key'

    const fetchSpy = jest.fn()
    ;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = fetchSpy as unknown as typeof fetch
    const { verifyTurnstile } = await import('@/lib/security/turnstile')

    const formData = new FormData()
    formData.append('cf-turnstile-response', '   ')

    const result = await verifyTurnstile(formData)

    expect(result).toEqual({
      success: false,
      error: 'Verificación de seguridad requerida. Recarga la página e intenta de nuevo.',
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects non-string token values as missing verification', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret-key'

    const fetchSpy = jest.fn()
    ;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = fetchSpy as unknown as typeof fetch
    const { verifyTurnstile } = await import('@/lib/security/turnstile')

    const formData = new FormData()
    formData.append('cf-turnstile-response', new File(['token'], 'token.txt'))

    await expect(verifyTurnstile(formData)).resolves.toEqual({
      success: false,
      error: 'Verificación de seguridad requerida. Recarga la página e intenta de nuevo.',
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('skips verification when secret key is not configured', async () => {
    process.env.TURNSTILE_SECRET_KEY = '   '

    const fetchSpy = jest.fn()
    ;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = fetchSpy as unknown as typeof fetch
    const { verifyTurnstile } = await import('@/lib/security/turnstile')

    const formData = new FormData()
    formData.append('cf-turnstile-response', 'valid-token')

    await expect(verifyTurnstile(formData)).resolves.toEqual({ success: true })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('trims secret key before calling siteverify', async () => {
    process.env.TURNSTILE_SECRET_KEY = ' secret-with-space\n'

    const fetchMock = jest.fn().mockResolvedValue({
        json: async () => ({ success: true }),
      } as Response)
    ;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch

    const { verifyTurnstile } = await import('@/lib/security/turnstile')

    const formData = new FormData()
    formData.append('cf-turnstile-response', 'valid-token')

    const result = await verifyTurnstile(formData)

    expect(result).toEqual({ success: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [, requestInit] = fetchMock.mock.calls[0]
    const body = requestInit?.body as URLSearchParams

    expect(body.get('secret')).toBe('secret-with-space')
  })

  it('returns a safe error when Cloudflare rejects the token', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret-key'
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)

    const fetchMock = jest.fn().mockResolvedValue({
      json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
    } as Response)
    ;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch
    const { verifyTurnstile } = await import('@/lib/security/turnstile')

    const formData = new FormData()
    formData.append('cf-turnstile-response', 'invalid-token')

    await expect(verifyTurnstile(formData)).resolves.toEqual({
      success: false,
      error: 'Verificación de seguridad fallida. Recarga la página e intenta de nuevo.',
    })
    expect(warnSpy).toHaveBeenCalledWith('[TURNSTILE] Verification failed:', ['invalid-input-response'])
  })
})
