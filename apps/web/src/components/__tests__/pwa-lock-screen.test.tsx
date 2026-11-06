import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PwaLockScreen } from '../pwa-lock-screen'

describe('PwaLockScreen', () => {
  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('renderiza el diálogo con título y botón de desbloqueo', () => {
    render(<PwaLockScreen onUnlock={jest.fn().mockResolvedValue(true)} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('heading', { name: 'Primera Riverada los 4 Ases' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Desbloquear' })).toBeInTheDocument()
    // Bloquea el scroll del documento mientras está montado.
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('muestra "Verificando…" mientras desbloquea y no muestra error al tener éxito', async () => {
    let resolveUnlock: (v: boolean) => void = () => {}
    const onUnlock = jest.fn(() => new Promise<boolean>((resolve) => { resolveUnlock = resolve }))

    render(<PwaLockScreen onUnlock={onUnlock} />)

    fireEvent.click(screen.getByRole('button', { name: 'Desbloquear' }))
    expect(await screen.findByRole('button', { name: 'Verificando…' })).toBeInTheDocument()

    await act(async () => {
      resolveUnlock(true)
    })

    await waitFor(() => expect(screen.getByRole('button', { name: 'Desbloquear' })).toBeInTheDocument())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('muestra un error role=alert cuando el desbloqueo no verifica', async () => {
    render(<PwaLockScreen onUnlock={jest.fn().mockResolvedValue(false)} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Desbloquear' }))
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo verificar/i)
  })

  it('muestra un error cuando onUnlock lanza una excepción', async () => {
    render(<PwaLockScreen onUnlock={jest.fn().mockRejectedValue(new Error('biometric failed'))} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Desbloquear' }))
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo verificar/i)
  })
})
