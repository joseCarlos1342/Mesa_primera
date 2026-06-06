const cookieSet = jest.fn()
const cookieGet = jest.fn()
const cookieDelete = jest.fn()
const createClient = jest.fn()
const createAdminClient = jest.fn()
const enforceRateLimiting = jest.fn()
const enforceSessionPolicy = jest.fn()
const generateRegistrationOptions = jest.fn()
const verifyRegistrationResponse = jest.fn()
const generateAuthenticationOptions = jest.fn()
const verifyAuthenticationResponse = jest.fn()

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({ set: cookieSet, get: cookieGet, delete: cookieDelete })),
}))

jest.mock('@/utils/supabase/server', () => ({
  createClient: (...args: unknown[]) => createClient(...args),
  createAdminClient: (...args: unknown[]) => createAdminClient(...args),
}))

jest.mock('@/app/actions/anti-fraud', () => ({
  enforceRateLimiting: (...args: unknown[]) => enforceRateLimiting(...args),
}))

jest.mock('../auth-actions-helpers', () => ({
  enforceSessionPolicy: (...args: unknown[]) => enforceSessionPolicy(...args),
}))

jest.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: (...args: unknown[]) => generateRegistrationOptions(...args),
  verifyRegistrationResponse: (...args: unknown[]) => verifyRegistrationResponse(...args),
  generateAuthenticationOptions: (...args: unknown[]) => generateAuthenticationOptions(...args),
  verifyAuthenticationResponse: (...args: unknown[]) => verifyAuthenticationResponse(...args),
}))

type QueryResult = { data?: unknown; error?: { message: string } | null }

function query(result: QueryResult) {
  const chain: Record<string, unknown> = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    not: jest.fn(() => chain),
    update: jest.fn(() => chain),
    upsert: jest.fn(() => Promise.resolve(result)),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
    then: (resolve: (value: QueryResult) => void) => Promise.resolve(result).then(resolve),
  }
  return chain
}

function clientWithUser(user: unknown, verifyOtp = jest.fn(async () => ({ error: null }))) {
  return {
    auth: {
      getUser: jest.fn(async () => ({ data: { user } })),
      verifyOtp,
    },
  }
}

function adminClientWithFrom(from: jest.Mock) {
  return {
    from,
    auth: {
      admin: {
        updateUser: jest.fn(async () => ({ data: { user: {} }, error: null })),
        generateLink: jest.fn(async () => ({ data: { properties: { hashed_token: 'hash-1' } }, error: null })),
      },
    },
  }
}

type AdminTestClient = ReturnType<typeof adminClientWithFrom>

describe('passkey-actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    cookieGet.mockReturnValue({ value: 'challenge-1' })
    enforceRateLimiting.mockResolvedValue({ success: true })
    enforceSessionPolicy.mockResolvedValue(undefined)
    generateRegistrationOptions.mockResolvedValue({ challenge: 'challenge-1', rp: { name: 'Mesa Primera' } })
    generateAuthenticationOptions.mockResolvedValue({ challenge: 'login-challenge', allowCredentials: [] })
    verifyRegistrationResponse.mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: {
          id: 'credential-1',
          publicKey: new Uint8Array([1, 2, 3]),
          counter: 7,
          transports: ['internal'],
        },
        credentialBackedUp: false,
      },
    })
    verifyAuthenticationResponse.mockResolvedValue({ verified: true, authenticationInfo: { newCounter: 8 } })
  })

  it('rechaza registro de passkey sin usuario autenticado', async () => {
    createClient.mockResolvedValue(clientWithUser(null))
    const { getPasskeyRegistrationOptions } = await import('../passkey-actions')

    await expect(getPasskeyRegistrationOptions()).resolves.toEqual({ error: 'No autenticado' })
    expect(generateRegistrationOptions).not.toHaveBeenCalled()
  })

  it('genera opciones de registro y guarda challenge httpOnly', async () => {
    createClient.mockResolvedValue(clientWithUser({ id: 'user-1', phone: '3001234567', user_metadata: { username: 'ana' } }))
    const { getPasskeyRegistrationOptions } = await import('../passkey-actions')

    await expect(getPasskeyRegistrationOptions()).resolves.toEqual({ options: { challenge: 'challenge-1', rp: { name: 'Mesa Primera' } } })
    expect(generateRegistrationOptions).toHaveBeenCalledWith(expect.objectContaining({
      rpName: 'Mesa Primera',
      rpID: 'localhost',
      userName: 'ana',
      authenticatorSelection: expect.objectContaining({ userVerification: 'required' }),
    }))
    expect(cookieSet).toHaveBeenCalledWith('webauthn_challenge', 'challenge-1', expect.objectContaining({ httpOnly: true, maxAge: 120 }))
  })

  it('verifica registro, consume challenge y guarda credencial confiable', async () => {
    createClient.mockResolvedValue(clientWithUser({ id: 'user-1', phone: '3001234567', user_metadata: {} }))
    const from = jest.fn(() => query({ error: null }))
    createAdminClient.mockResolvedValue(adminClientWithFrom(from))
    const { verifyPasskeyRegistration } = await import('../passkey-actions')

    await expect(verifyPasskeyRegistration({ id: 'credential-1' } as never, 'device-1')).resolves.toEqual({ ok: true, credentialId: 'credential-1' })
    expect(cookieDelete).toHaveBeenCalledWith('webauthn_challenge')
    expect(verifyRegistrationResponse).toHaveBeenCalledWith(expect.objectContaining({ expectedChallenge: 'challenge-1' }))
    expect(from).toHaveBeenCalledWith('user_devices')
  })

  it('rechaza registro si no hay challenge, falla la verificacion o no hay registrationInfo', async () => {
    createClient.mockResolvedValue(clientWithUser({ id: 'user-1', phone: '3001234567', user_metadata: {} }))
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    const { verifyPasskeyRegistration } = await import('../passkey-actions')

    cookieGet.mockReturnValueOnce(null)
    await expect(verifyPasskeyRegistration({ id: 'credential-1' } as never, 'device-1')).resolves.toEqual({ error: 'Challenge expirado. Intenta de nuevo.' })

    cookieGet.mockReturnValueOnce({ value: 'challenge-1' })
    verifyRegistrationResponse.mockRejectedValueOnce(new Error('bad attestation'))
    await expect(verifyPasskeyRegistration({ id: 'credential-1' } as never, 'device-1')).resolves.toEqual({ error: 'La verificación biométrica falló.' })
    expect(consoleError).toHaveBeenCalledWith('[PASSKEY] Registration verification failed:', 'bad attestation')

    cookieGet.mockReturnValueOnce({ value: 'challenge-1' })
    verifyRegistrationResponse.mockResolvedValueOnce({ verified: false })
    await expect(verifyPasskeyRegistration({ id: 'credential-1' } as never, 'device-1')).resolves.toEqual({ error: 'La verificación biométrica falló.' })
  })

  it('rechaza registro si falla el upsert de credencial', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    createClient.mockResolvedValue(clientWithUser({ id: 'user-1', phone: '3001234567', user_metadata: {} }))
    createAdminClient.mockResolvedValue(adminClientWithFrom(jest.fn(() => query({ error: { message: 'db down' } }))))
    const { verifyPasskeyRegistration } = await import('../passkey-actions')

    await expect(verifyPasskeyRegistration({ id: 'credential-1' } as never, 'device-1')).resolves.toEqual({ error: 'No se pudo guardar la credencial.' })
    expect(consoleError).toHaveBeenCalledWith('[PASSKEY] DB upsert failed:', 'db down')
  })

  it('devuelve passkey no disponible si no hay perfil para el telefono', async () => {
    createAdminClient.mockResolvedValue(adminClientWithFrom(jest.fn(() => query({ data: null, error: null }))))
    const { getPasskeyLoginOptions } = await import('../passkey-actions')

    await expect(getPasskeyLoginOptions('3001234567')).resolves.toEqual({ available: false })
    expect(enforceRateLimiting).toHaveBeenCalledWith('passkey_login_options', 10, 60)
    expect(generateAuthenticationOptions).not.toHaveBeenCalled()
  })

  it('genera opciones de login con credenciales confiables', async () => {
    const from = jest.fn((table: string) => {
      if (table === 'profiles') return query({ data: { id: 'user-1' }, error: null })
      return query({ data: [{ credential_id: 'credential-1', transports: ['internal'] }], error: null })
    })
    createAdminClient.mockResolvedValue(adminClientWithFrom(from))
    const { getPasskeyLoginOptions } = await import('../passkey-actions')

    await expect(getPasskeyLoginOptions('3001234567')).resolves.toEqual({ available: true, options: { challenge: 'login-challenge', allowCredentials: [] } })
    expect(generateAuthenticationOptions).toHaveBeenCalledWith(expect.objectContaining({
      rpID: 'localhost',
      allowCredentials: [{ id: 'credential-1', transports: ['internal'] }],
      userVerification: 'required',
    }))
    expect(cookieSet).toHaveBeenCalledWith('webauthn_challenge', 'login-challenge', expect.any(Object))
  })

  it('rechaza opciones de login por rate limit o sin dispositivos confiables', async () => {
    const { getPasskeyLoginOptions } = await import('../passkey-actions')

    enforceRateLimiting.mockResolvedValueOnce({ success: false, error: 'Demasiados intentos' })
    await expect(getPasskeyLoginOptions('3001234567')).resolves.toEqual({ error: 'Demasiados intentos' })

    enforceRateLimiting.mockResolvedValueOnce({ success: true })
    const from = jest.fn((table: string) => {
      if (table === 'profiles') return query({ data: { id: 'user-1' }, error: null })
      return query({ data: [], error: null })
    })
    createAdminClient.mockResolvedValueOnce(adminClientWithFrom(from))
    await expect(getPasskeyLoginOptions('3001234567')).resolves.toEqual({ available: false })
  })

  it('verifica login biometrico, crea sesion y aplica politica de sesion', async () => {
    const verifyOtp = jest.fn(async () => ({ error: null }))
    createClient.mockResolvedValue(clientWithUser(null, verifyOtp))
    const from = jest.fn((table: string) => {
      if (table === 'user_devices') {
        return query({ data: { user_id: 'user-1', credential_id: 'credential-1', public_key: Buffer.from([1, 2, 3]).toString('base64'), sign_count: 7 }, error: null })
      }
      return query({ data: { id: 'user-1', phone: '+573001234567' }, error: null })
    })
    const admin = adminClientWithFrom(from)
    createAdminClient.mockResolvedValue(admin)
    const { verifyPasskeyLogin } = await import('../passkey-actions')

    await expect(verifyPasskeyLogin('3001234567', { id: 'credential-1' } as never)).resolves.toEqual({ ok: true })
    expect(verifyAuthenticationResponse).toHaveBeenCalledWith(expect.objectContaining({ expectedChallenge: 'challenge-1' }))
    expect(admin.auth.admin.updateUser).toHaveBeenCalledWith('user-1', expect.objectContaining({ email_confirm: true }))
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'hash-1', type: 'magiclink' })
    expect(enforceSessionPolicy).toHaveBeenCalledWith('user-1')
  })

  it('rechaza login por rate limit, dispositivo desconocido o telefono que no coincide', async () => {
    const { verifyPasskeyLogin } = await import('../passkey-actions')

    enforceRateLimiting.mockResolvedValueOnce({ success: false, error: 'Demasiados intentos' })
    await expect(verifyPasskeyLogin('3001234567', { id: 'credential-1' } as never)).resolves.toEqual({ error: 'Demasiados intentos' })

    enforceRateLimiting.mockResolvedValueOnce({ success: true })
    createAdminClient.mockResolvedValueOnce(adminClientWithFrom(jest.fn(() => query({ data: null, error: null }))))
    await expect(verifyPasskeyLogin('3001234567', { id: 'credential-1' } as never)).resolves.toEqual({ error: 'Dispositivo no reconocido.' })

    enforceRateLimiting.mockResolvedValueOnce({ success: true })
    const from = jest.fn((table: string) => {
      if (table === 'user_devices') return query({ data: { user_id: 'user-1', credential_id: 'credential-1', public_key: Buffer.from([1, 2, 3]).toString('base64'), sign_count: 7 }, error: null })
      return query({ data: null, error: null })
    })
    createAdminClient.mockResolvedValueOnce(adminClientWithFrom(from))
    await expect(verifyPasskeyLogin('3001234567', { id: 'credential-1' } as never)).resolves.toEqual({ error: 'Dispositivo no coincide con el teléfono.' })
  })

  it('rechaza login si falla verificacion biometrica o devuelve unverified', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    const from = jest.fn((table: string) => {
      if (table === 'user_devices') return query({ data: { user_id: 'user-1', credential_id: 'credential-1', public_key: Buffer.from([1, 2, 3]).toString('base64'), sign_count: 7 }, error: null })
      return query({ data: { id: 'user-1', phone: '+573001234567' }, error: null })
    })
    createAdminClient.mockResolvedValue(adminClientWithFrom(from))
    const { verifyPasskeyLogin } = await import('../passkey-actions')

    verifyAuthenticationResponse.mockRejectedValueOnce(new Error('bad assertion'))
    await expect(verifyPasskeyLogin('3001234567', { id: 'credential-1' } as never)).resolves.toEqual({ error: 'La verificación biométrica falló.' })
    expect(consoleError).toHaveBeenCalledWith('[PASSKEY] Authentication verification failed:', 'bad assertion')

    verifyAuthenticationResponse.mockResolvedValueOnce({ verified: false })
    await expect(verifyPasskeyLogin('3001234567', { id: 'credential-1' } as never)).resolves.toEqual({ error: 'La verificación biométrica falló.' })
  })

  it('rechaza login si no puede crear o verificar la sesion magic link', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    const from = jest.fn((table: string) => {
      if (table === 'user_devices') return query({ data: { user_id: 'user-1', credential_id: 'credential-1', public_key: Buffer.from([1, 2, 3]).toString('base64'), sign_count: 7 }, error: null })
      return query({ data: { id: 'user-1', phone: '+573001234567' }, error: null })
    })
    const admin = adminClientWithFrom(from)
    admin.auth.admin.generateLink = jest.fn(async () => ({ data: null, error: { message: 'link failed' } })) as unknown as AdminTestClient['auth']['admin']['generateLink']
    createAdminClient.mockResolvedValueOnce(admin)
    const { verifyPasskeyLogin } = await import('../passkey-actions')

    await expect(verifyPasskeyLogin('3001234567', { id: 'credential-1' } as never)).resolves.toEqual({ error: 'Error al crear sesión. Intenta con SMS.' })
    expect(consoleError).toHaveBeenCalledWith('[PASSKEY] generateLink failed:', 'link failed')

    const verifyOtp = jest.fn(async () => ({ error: { message: 'otp failed' } })) as unknown as ReturnType<typeof clientWithUser>['auth']['verifyOtp']
    createClient.mockResolvedValueOnce(clientWithUser(null, verifyOtp))
    createAdminClient.mockResolvedValueOnce(adminClientWithFrom(from))
    await expect(verifyPasskeyLogin('3001234567', { id: 'credential-1' } as never)).resolves.toEqual({ error: 'Error al crear sesión. Intenta con SMS.' })
    expect(consoleError).toHaveBeenCalledWith('[PASSKEY] Token exchange failed:', 'otp failed')
  })

  it('rechaza login biometrico sin challenge vigente', async () => {
    cookieGet.mockReturnValue(null)
    const { verifyPasskeyLogin } = await import('../passkey-actions')

    await expect(verifyPasskeyLogin('3001234567', { id: 'credential-1' } as never)).resolves.toEqual({ error: 'Challenge expirado. Intenta de nuevo.' })
  })
})
