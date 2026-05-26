type RuntimeWindow = Window & {
  __MESA_PRIMERA_RUNTIME_ENV__?: {
    NEXT_PUBLIC_GAME_SERVER_URL?: string
  }
}

async function loadClientUrl() {
  const Client = jest.fn((url: string) => ({ url }))
  jest.doMock('@colyseus/sdk', () => ({ Client }))

  const colyseusModule = await import('../colyseus')
  return { client: colyseusModule.client as unknown as { url: string }, Client }
}

describe('colyseus client factory', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
    delete process.env.NEXT_PUBLIC_GAME_SERVER_URL
    delete process.env.GAME_SERVER_URL
    delete (window as RuntimeWindow).__MESA_PRIMERA_RUNTIME_ENV__
  })

  afterEach(() => {
    jest.dontMock('@colyseus/sdk')
    process.env = originalEnv
  })

  it('usa NEXT_PUBLIC_GAME_SERVER_URL cuando esta definido en build', async () => {
    process.env.NEXT_PUBLIC_GAME_SERVER_URL = 'https://game.example.com'

    const { client, Client } = await loadClientUrl()

    expect(Client).toHaveBeenCalledWith('https://game.example.com')
    expect(client.url).toBe('https://game.example.com')
  })

  it('usa runtime env inyectado antes del fallback por location', async () => {
    ;(window as RuntimeWindow).__MESA_PRIMERA_RUNTIME_ENV__ = {
      NEXT_PUBLIC_GAME_SERVER_URL: 'https://runtime.example.com',
    }

    const { client } = await loadClientUrl()

    expect(client.url).toBe('https://runtime.example.com')
  })

  it('construye fallback local desde window.location', async () => {
    const { client } = await loadClientUrl()

    expect(client.url).toBe('http://127.0.0.1:2567')
  })
})
