import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { TurnstileWidget } from '../turnstile-widget'

jest.mock('next/script', () => ({
  __esModule: true,
  default: ({ onReady, onError }: { onReady?: () => void; onError?: () => void }) => (
    <button type="button" onClick={onReady} onDoubleClick={onError}>
      load-turnstile
    </button>
  ),
}))

jest.mock('@/lib/security/turnstile-env', () => ({
  getPublicTurnstileSiteKey: jest.fn(() => 'site-key-test'),
}))

describe('TurnstileWidget', () => {
  afterEach(() => {
    cleanup()
    delete window.turnstile
  })

  it('renderiza el widget con el response-field-name esperado', () => {
    const renderMock = jest.fn().mockReturnValue('widget-1')
    const removeMock = jest.fn()

    window.turnstile = {
      render: renderMock,
      reset: jest.fn(),
      remove: removeMock,
    }

    render(<TurnstileWidget />)
    fireEvent.click(screen.getByRole('button', { name: 'load-turnstile' }))

    expect(renderMock).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        sitekey: 'site-key-test',
        theme: 'dark',
        size: 'flexible',
        language: 'es',
        'response-field-name': 'cf-turnstile-response',
      }),
    )
  })

  it('muestra alerta si no existe site key pública', () => {
    const env = jest.requireMock('@/lib/security/turnstile-env') as {
      getPublicTurnstileSiteKey: jest.Mock
    }
    env.getPublicTurnstileSiteKey.mockReturnValueOnce('')

    render(<TurnstileWidget />)

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudo cargar la verificación de seguridad. Recarga la página e intenta de nuevo.',
    )
  })
})
