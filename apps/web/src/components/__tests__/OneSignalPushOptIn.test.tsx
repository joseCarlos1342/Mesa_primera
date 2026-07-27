import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { OneSignalPushOptIn } from '../OneSignalPushOptIn'

type MockOneSignal = {
  init: jest.Mock<Promise<void>, [Record<string, unknown>]>
  login: jest.Mock<Promise<void>, [string]>
  Notifications: {
    isPushSupported: jest.Mock<boolean, []>
    permissionNative: NotificationPermission
    requestPermission: jest.Mock<Promise<void>, []>
  }
  User: {
    PushSubscription: {
      optedIn: boolean
      optIn: jest.Mock<Promise<void>, []>
    }
  }
}

function createClient({ supported = true, permission = 'default' as NotificationPermission } = {}): MockOneSignal {
  return {
    init: jest.fn().mockResolvedValue(undefined),
    login: jest.fn().mockResolvedValue(undefined),
    Notifications: {
      isPushSupported: jest.fn().mockReturnValue(supported),
      permissionNative: permission,
      requestPermission: jest.fn().mockResolvedValue(undefined),
    },
    User: {
      PushSubscription: {
        optedIn: false,
        optIn: jest.fn().mockResolvedValue(undefined),
      },
    },
  }
}

function renderWithAppId(userId = 'player-1', compact = false) {
  process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID = ' app-id-123 '
  return render(<OneSignalPushOptIn userId={userId} compact={compact} />)
}

async function initialize(client: MockOneSignal) {
  const callback = window.OneSignalDeferred?.at(-1)
  if (!callback) throw new Error('OneSignalDeferred no registró el inicializador')
  await act(async () => {
    await callback(client)
  })
}

describe('OneSignalPushOptIn', () => {
  const originalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
    delete window.OneSignalDeferred
    document.querySelectorAll('script[data-onesignal-sdk]').forEach((script) => script.remove())
  })

  afterEach(() => {
    if (originalAppId === undefined) delete process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
    else process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID = originalAppId
    delete window.OneSignalDeferred
    document.querySelectorAll('script[data-onesignal-sdk]').forEach((script) => script.remove())
  })

  it('no inicializa OneSignal sin usuario o app id', () => {
    const { rerender } = render(<OneSignalPushOptIn userId="" />)
    expect(window.OneSignalDeferred).toBeUndefined()

    rerender(<OneSignalPushOptIn userId="player-1" />)
    expect(window.OneSignalDeferred).toBeUndefined()
  })

  it('registra el cliente, inicia sesión y añade el SDK una sola vez', async () => {
    const client = createClient({ supported: false })
    renderWithAppId()

    expect(window.OneSignalDeferred).toHaveLength(1)
    const script = document.querySelector('script[data-onesignal-sdk]')
    expect(script).toHaveAttribute('src', 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js')
    expect(client.init).not.toHaveBeenCalled()

    await initialize(client)

    expect(client.init).toHaveBeenCalledWith({
      appId: 'app-id-123',
      serviceWorkerPath: '/sw.js',
      serviceWorkerParam: { scope: '/' },
    })
    expect(client.login).toHaveBeenCalledWith('player-1')
    expect(screen.queryByRole('button', { name: /activar notificaciones/i })).not.toBeInTheDocument()
  })

  it('no duplica el script si el SDK ya está cargado', () => {
    const existingScript = document.createElement('script')
    existingScript.dataset.onesignalSdk = 'true'
    document.head.appendChild(existingScript)

    renderWithAppId()

    expect(document.querySelectorAll('script[data-onesignal-sdk]')).toHaveLength(1)
    expect(window.OneSignalDeferred).toHaveLength(1)
  })

  it('muestra el CTA compacto solo con push soportado y permiso pendiente', async () => {
    const client = createClient()
    renderWithAppId('player-1', true)
    await initialize(client)

    const button = await screen.findByRole('button', { name: 'Activar notificaciones push' })
    expect(button).toHaveClass('h-10')
    expect(button).not.toHaveTextContent('Activar avisos')
  })

  it('solicita permiso y activa la suscripción', async () => {
    const client = createClient()
    client.Notifications.requestPermission.mockImplementation(async () => {
      client.Notifications.permissionNative = 'granted'
    })
    renderWithAppId()
    await initialize(client)

    fireEvent.click(await screen.findByRole('button', { name: 'Activar notificaciones push' }))

    await waitFor(() => expect(client.User.PushSubscription.optIn).toHaveBeenCalledTimes(1))
    expect(client.Notifications.requestPermission).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Activar notificaciones push' })).not.toBeInTheDocument()
  })

  it('libera el estado ocupado aunque la activación falle', async () => {
    const client = createClient()
    client.User.PushSubscription.optIn.mockRejectedValue(new Error('push unavailable'))
    renderWithAppId()
    await initialize(client)

    const button = await screen.findByRole('button', { name: 'Activar notificaciones push' })
    fireEvent.click(button)

    await waitFor(() => expect(button).not.toBeDisabled())
    expect(screen.getByText('Activar avisos')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('No fue posible activar las notificaciones')

    client.User.PushSubscription.optIn.mockResolvedValueOnce(undefined)
    fireEvent.click(button)
    await waitFor(() => expect(client.User.PushSubscription.optIn).toHaveBeenCalledTimes(2))
    expect(client.Notifications.requestPermission).toHaveBeenCalledTimes(2)
  })

  it('muestra el error y no intenta suscribirse si se rechaza el permiso', async () => {
    const client = createClient()
    client.Notifications.requestPermission.mockRejectedValue(new Error('permission denied'))
    renderWithAppId()
    await initialize(client)

    fireEvent.click(await screen.findByRole('button', { name: 'Activar notificaciones push' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible activar las notificaciones')
    expect(client.User.PushSubscription.optIn).not.toHaveBeenCalled()
  })

  it('ignora un fallo de inicialización sin renderizar un CTA falso', async () => {
    const client = createClient()
    client.init.mockRejectedValue(new Error('SDK unavailable'))
    renderWithAppId()

    await initialize(client)

    expect(screen.queryByRole('button', { name: /activar notificaciones/i })).not.toBeInTheDocument()
  })
})
