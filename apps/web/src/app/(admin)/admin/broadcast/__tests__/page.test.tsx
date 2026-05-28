import { act } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AdminBroadcastPage from '../page'
import { sendBroadcast } from '@/app/actions/admin-broadcast'

jest.mock('@/app/actions/admin-broadcast', () => ({
  sendBroadcast: jest.fn(),
}))

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, initial, animate, exit, transition, layoutId, ...props }: React.HTMLAttributes<HTMLDivElement> & {
      initial?: unknown
      animate?: unknown
      exit?: unknown
      transition?: unknown
      layoutId?: string
    }) => <div {...props}>{children}</div>,
  },
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
}))

const mockSendBroadcast = sendBroadcast as jest.MockedFunction<typeof sendBroadcast>

describe('AdminBroadcastPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.spyOn(window, 'confirm').mockReturnValue(true)
    jest.spyOn(window, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('renderiza formulario, preview inicial y enlace al historial', () => {
    render(<AdminBroadcastPage />)

    expect(screen.getByRole('heading', { name: /sistema de broadcast/i })).toBeInTheDocument()
    expect(screen.getByText('Tu título de impacto')).toBeInTheDocument()
    expect(screen.getByText(/Aquí se mostrará el cuerpo del mensaje/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /detalles/i })).toHaveAttribute('href', '/admin/broadcast/history')
    expect(screen.getByRole('button', { name: /ejecutar/i })).toBeDisabled()
  })

  it('actualiza tipo y preview y cancela sin enviar si el admin no confirma', () => {
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false)
    render(<AdminBroadcastPage />)

    fireEvent.click(screen.getByRole('button', { name: /promoción/i }))
    fireEvent.change(screen.getByPlaceholderText('Ej: Nuevo Gran Torneo el viernes...'), { target: { value: 'Bono de bienvenida' } })
    fireEvent.change(screen.getByPlaceholderText(/Escribe los detalles aquí/), { target: { value: 'Duplicamos tu primera recarga.' } })
    fireEvent.click(screen.getByRole('button', { name: /ejecutar/i }))

    expect(screen.getByText('Promoción / Bono')).toBeInTheDocument()
    expect(screen.getByText('Bono de bienvenida')).toBeInTheDocument()
    expect(screen.getAllByText('Duplicamos tu primera recarga.')).toHaveLength(2)
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Confirmas el envío masivo'))
    expect(mockSendBroadcast).not.toHaveBeenCalled()
  })

  it('envia el broadcast confirmado, muestra exito y limpia el formulario despues del timeout', async () => {
    mockSendBroadcast.mockResolvedValue({ success: true, broadcastId: 'broadcast-1', audienceCount: 42 })
    render(<AdminBroadcastPage />)

    fireEvent.click(screen.getByRole('button', { name: /mantenimiento/i }))
    fireEvent.change(screen.getByPlaceholderText('Ej: Nuevo Gran Torneo el viernes...'), { target: { value: 'Ventana tecnica' } })
    fireEvent.change(screen.getByPlaceholderText(/Escribe los detalles aquí/), { target: { value: 'Pausaremos el lobby a medianoche.' } })
    fireEvent.click(screen.getByRole('button', { name: /ejecutar/i }))

    await waitFor(() => expect(mockSendBroadcast).toHaveBeenCalledWith({
      title: 'Ventana tecnica',
      body: 'Pausaremos el lobby a medianoche.',
      type: 'maintenance',
    }))
    expect(await screen.findByText('Broadcast Exitoso')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()

    act(() => {
      jest.advanceTimersByTime(5000)
    })

    await waitFor(() => expect(screen.queryByText('Broadcast Exitoso')).not.toBeInTheDocument())
    expect(screen.getByPlaceholderText('Ej: Nuevo Gran Torneo el viernes...')).toHaveValue('')
    expect(screen.getByText('Tu título de impacto')).toBeInTheDocument()
  })

  it('informa errores de envio y desbloquea el boton', async () => {
    mockSendBroadcast.mockRejectedValue(new Error('push offline'))
    render(<AdminBroadcastPage />)

    fireEvent.change(screen.getByPlaceholderText('Ej: Nuevo Gran Torneo el viernes...'), { target: { value: 'Alerta' } })
    fireEvent.change(screen.getByPlaceholderText(/Escribe los detalles aquí/), { target: { value: 'Reintentar luego.' } })
    fireEvent.click(screen.getByRole('button', { name: /ejecutar/i }))

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Error al enviar broadcast: push offline'))
    expect(screen.getByRole('button', { name: /ejecutar/i })).not.toBeDisabled()
  })
})
