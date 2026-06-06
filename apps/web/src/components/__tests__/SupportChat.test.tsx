import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SupportChat } from '../SupportChat'
import {
  appendSupportMessage,
  closeSupportTicket,
  createSupportTicket,
  getSupportTicket,
  getSupportTicketHistory,
  listUserTickets,
  uploadSupportAttachment,
} from '@/app/actions/support'

const socketHandlers = new Map<string, (payload: any) => void>()
const socket = {
  emit: jest.fn(),
  on: jest.fn((event: string, handler: (payload: any) => void) => {
    socketHandlers.set(event, handler)
  }),
  disconnect: jest.fn(),
}

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => socket),
}))

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'uuid-ticket'),
}))

jest.mock('@/app/actions/support', () => ({
  createSupportTicket: jest.fn(),
  appendSupportMessage: jest.fn(),
  closeSupportTicket: jest.fn(),
  listUserTickets: jest.fn(),
  getSupportTicketHistory: jest.fn(),
  uploadSupportAttachment: jest.fn(),
  getSupportAttachmentUrl: jest.fn(),
  getSupportTicket: jest.fn(),
}))

const defaultHistory = {
  data: {
    messages: [
      {
        id: 'msg-1',
        ticket_id: 'ticket-1',
        message: 'Necesito ayuda con mi mesa',
        from_admin: false,
        created_at: '2026-05-24T10:00:00.000Z',
      },
      {
        id: 'msg-2',
        ticket_id: 'ticket-1',
        message: 'Ya revisamos tu solicitud',
        from_admin: true,
        created_at: '2026-05-24T10:05:00.000Z',
      },
    ],
    attachments: [],
  },
}

describe('SupportChat', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    socketHandlers.clear()
    Element.prototype.scrollIntoView = jest.fn()
    ;(listUserTickets as jest.Mock).mockResolvedValue({ data: [] })
    ;(getSupportTicketHistory as jest.Mock).mockResolvedValue(defaultHistory)
    ;(getSupportTicket as jest.Mock).mockResolvedValue({ data: { status: 'pending' } })
    ;(createSupportTicket as jest.Mock).mockResolvedValue({ data: { ticket_id: 'uuid-ticket', message_id: 'msg-new' } })
    ;(appendSupportMessage as jest.Mock).mockResolvedValue({ data: { message_id: 'msg-next', from: 'player' } })
    ;(closeSupportTicket as jest.Mock).mockResolvedValue({ data: { closed_by_role: 'player' } })
    ;(uploadSupportAttachment as jest.Mock).mockResolvedValue({
      data: { id: 'attachment-1', file_name: 'evidencia.png' },
    })
  })

  it('carga historial y estado cuando recibe un ticket embebido', async () => {
    render(<SupportChat userId="user-1" embedded ticketId="ticket-1" />)

    expect(await screen.findByText('Necesito ayuda con mi mesa')).toBeInTheDocument()
    expect(screen.getByText('Ya revisamos tu solicitud')).toBeInTheDocument()
    expect(getSupportTicketHistory).toHaveBeenCalledWith('ticket-1')
    expect(getSupportTicket).toHaveBeenCalledWith('ticket-1')
    expect(socket.emit).toHaveBeenCalledWith('support:join', 'ticket-1')
  })

  it('muestra la lista de tickets del jugador y abre el historial seleccionado', async () => {
    ;(listUserTickets as jest.Mock).mockResolvedValue({
      data: [
        {
          id: 'ticket-1',
          last_message_preview: 'Consulta sobre deposito pendiente',
          created_at: '2026-05-24T10:00:00.000Z',
          status: 'attended',
        },
      ],
    })

    render(<SupportChat userId="user-1" />)

    await act(async () => {
      window.dispatchEvent(new Event('open-support-chat'))
    })

    expect(await screen.findByText(/Consulta sobre deposito/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /consulta sobre deposito/i }))

    expect(await screen.findByText('Necesito ayuda con mi mesa')).toBeInTheDocument()
    expect(getSupportTicketHistory).toHaveBeenCalledWith('ticket-1')
  })

  it('crea un ticket con el primer mensaje del jugador', async () => {
    ;(getSupportTicketHistory as jest.Mock).mockResolvedValue({ data: { messages: [], attachments: [] } })

    render(<SupportChat userId="user-1" embedded />)

    fireEvent.change(screen.getByPlaceholderText('Escribe tu consulta...'), {
      target: { value: 'Tengo un problema con la recarga' },
    })
    fireEvent.click(screen.getByRole('button', { name: '' }))

    await waitFor(() => {
      expect(createSupportTicket).toHaveBeenCalledWith('user-1', 'Tengo un problema con la recarga')
    })
    expect(socket.emit).toHaveBeenCalledWith('support:ticket-created', {
      ticketId: 'user-1',
      userId: 'user-1',
      username: 'Usuario',
      preview: 'Tengo un problema con la recarga',
    })
    expect(screen.getByText('Tengo un problema con la recarga')).toBeInTheDocument()
  })

  it('agrega mensajes posteriores y emite eventos compatibles', async () => {
    render(<SupportChat userId="user-1" embedded ticketId="ticket-1" />)

    await screen.findByText('Necesito ayuda con mi mesa')
    fireEvent.change(screen.getByPlaceholderText('Escribe tu consulta...'), {
      target: { value: 'Gracias por responder' },
    })
    fireEvent.click(screen.getByRole('button', { name: '' }))

    await waitFor(() => {
      expect(appendSupportMessage).toHaveBeenCalledWith('ticket-1', 'Gracias por responder')
    })
    expect(socket.emit).toHaveBeenCalledWith(
      'support:message-created',
      expect.objectContaining({ ticketId: 'ticket-1', message: 'Gracias por responder', from: 'player' })
    )
    expect(socket.emit).toHaveBeenCalledWith('support:message', {
      userId: 'user-1',
      message: 'Gracias por responder',
      ticketId: 'ticket-1',
    })
  })

  it('incorpora mensajes entrantes del socket del ticket activo', async () => {
    render(<SupportChat userId="user-1" embedded ticketId="ticket-1" />)

    await screen.findByText('Necesito ayuda con mi mesa')
    await act(async () => {
      socketHandlers.get('support:message-created')?.({
        ticketId: 'ticket-1',
        messageId: 'socket-msg',
        message: 'Mensaje nuevo de soporte',
        from: 'admin',
        timestamp: '2026-05-24T10:10:00.000Z',
      })
    })

    expect(screen.getByText('Mensaje nuevo de soporte')).toBeInTheDocument()
  })

  it('ignora mensajes propios y notifica mensajes remotos cuando el chat flotante está cerrado', async () => {
    const play = jest.fn(() => Promise.resolve())
    const audioMock = jest.fn(() => ({ volume: 0, play }))
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent')
    Object.defineProperty(window, 'Audio', { configurable: true, value: audioMock })

    render(<SupportChat userId="user-1" ticketId="ticket-1" />)

    await waitFor(() => expect(socketHandlers.has('support:message-created')).toBe(true))

    await act(async () => {
      socketHandlers.get('support:message-created')?.({
        ticketId: 'ticket-1',
        messageId: 'own-msg',
        message: 'Mensaje propio optimista',
        from: 'player',
        timestamp: '2026-05-24T10:10:00.000Z',
      })
      socketHandlers.get('support:message-created')?.({
        ticketId: 'ticket-1',
        messageId: 'remote-msg',
        message: 'Respuesta remota',
        from: 'admin',
        timestamp: '2026-05-24T10:11:00.000Z',
      })
    })

    expect(audioMock).toHaveBeenCalledWith('/sounds/notification.mp3')
    expect(play).toHaveBeenCalled()
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'support-notification' }))
  })

  it('actualiza estado con eventos de ticket finalizado y atendido', async () => {
    render(<SupportChat userId="user-1" embedded ticketId="ticket-1" />)

    await screen.findByText('Necesito ayuda con mi mesa')
    await act(async () => {
      socketHandlers.get('support:ticket-attended')?.({ ticketId: 'ticket-1' })
      socketHandlers.get('support:ticket-finalized')?.({ ticketId: 'ticket-1', closedByRole: 'admin' })
    })

    expect(screen.getByText('Chat Finalizado')).toBeInTheDocument()
  })

  it('procesa eventos legacy de soporte para admin y jugador', async () => {
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent')
    const { unmount } = render(<SupportChat userId="user-1" embedded isAdmin ticketId="ticket-1" />)

    await screen.findByText('Necesito ayuda con mi mesa')
    await act(async () => {
      socketHandlers.get('support:incoming')?.({ userId: 'user-1', ticketId: 'ticket-1', message: 'Legacy del jugador' })
    })
    expect(screen.getByText('Legacy del jugador')).toBeInTheDocument()

    unmount()
    socketHandlers.clear()
    render(<SupportChat userId="user-1" embedded ticketId="ticket-1" />)
    await screen.findByText('Necesito ayuda con mi mesa')
    await act(async () => {
      socketHandlers.get('support:message')?.({ userId: 'user-1', ticketId: 'ticket-1', message: 'Legacy de soporte' })
      socketHandlers.get('support:resolved')?.({ userId: 'user-1', ticketId: 'ticket-1' })
    })

    expect(screen.getByText('Legacy de soporte')).toBeInTheDocument()
    expect(screen.getByText('Chat Finalizado')).toBeInTheDocument()
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'support-notification' }))
  })

  it('sube adjuntos y muestra el mensaje de archivo', async () => {
    render(<SupportChat userId="user-1" embedded ticketId="ticket-1" />)

    await screen.findByText('Necesito ayuda con mi mesa')
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'evidencia.png', { type: 'image/png' })

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(uploadSupportAttachment).toHaveBeenCalledWith('ticket-1', expect.any(FormData))
    })
    expect(screen.getByText('📎 evidencia.png')).toBeInTheDocument()
    expect(socket.emit).toHaveBeenCalledWith('support:attachment-added', {
      ticketId: 'ticket-1',
      fileName: 'evidencia.png',
      mimeType: 'image/png',
    })
  })

  it('muestra error de adjunto como mensaje de sistema', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    ;(uploadSupportAttachment as jest.Mock).mockResolvedValueOnce({ error: 'Archivo demasiado grande' })
    render(<SupportChat userId="user-1" embedded ticketId="ticket-1" />)

    await screen.findByText('Necesito ayuda con mi mesa')
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

    fireEvent.change(fileInput, {
      target: { files: [new File(['pdf'], 'reclamo.pdf', { type: 'application/pdf' })] },
    })

    expect(await screen.findByText('Error: Archivo demasiado grande')).toBeInTheDocument()
    consoleError.mockRestore()
  })

  it('abre el chat flotante por evento global y permite cerrar la consulta', async () => {
    render(<SupportChat userId="user-1" ticketId="ticket-1" />)

    await act(async () => {
      window.dispatchEvent(new Event('open-support-chat'))
    })

    expect(await screen.findByText('Necesito ayuda con mi mesa')).toBeInTheDocument()
    fireEvent.click(screen.getByTitle('Cerrar consulta'))

    await waitFor(() => {
      expect(closeSupportTicket).toHaveBeenCalledWith('ticket-1')
    })
    expect(screen.getByText('Consulta Finalizada')).toBeInTheDocument()
  })

  it('muestra error al cerrar consulta si la accion falla', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    ;(closeSupportTicket as jest.Mock).mockResolvedValueOnce({ error: 'No se pudo cerrar' })
    render(<SupportChat userId="user-1" ticketId="ticket-1" />)

    await act(async () => {
      window.dispatchEvent(new Event('open-support-chat'))
    })
    await screen.findByText('Necesito ayuda con mi mesa')
    fireEvent.click(screen.getByTitle('Cerrar consulta'))

    await waitFor(() => expect(consoleError).toHaveBeenCalledWith('Error closing ticket:', 'No se pudo cerrar'))
    expect(screen.queryByText('Consulta Finalizada')).not.toBeInTheDocument()
  })

  it('permite abrir tickets con teclado desde la lista', async () => {
    ;(listUserTickets as jest.Mock).mockResolvedValue({
      data: [
        {
          id: 'ticket-1',
          last_message_preview: 'Consulta con teclado',
          created_at: '2026-05-24T10:00:00.000Z',
          status: 'pending',
        },
      ],
    })

    render(<SupportChat userId="user-1" />)
    await act(async () => {
      window.dispatchEvent(new Event('open-support-chat'))
    })

    const ticket = await screen.findByRole('button', { name: /consulta con teclado/i })
    fireEvent.keyDown(ticket, { key: ' ' })

    expect(await screen.findByText('Necesito ayuda con mi mesa')).toBeInTheDocument()
  })

  it('cierra el chat flotante con el boton X', async () => {
    render(<SupportChat userId="user-1" />)

    await act(async () => {
      window.dispatchEvent(new Event('open-support-chat'))
    })
    expect(await screen.findByText('Centro de Ayuda')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '' }))

    expect(screen.queryByText('Centro de Ayuda')).not.toBeInTheDocument()
  })

  it('crea una consulta desde el chat flotante no embebido', async () => {
    ;(getSupportTicketHistory as jest.Mock).mockResolvedValue({ data: { messages: [], attachments: [] } })
    render(<SupportChat userId="user-1" />)

    await act(async () => {
      window.dispatchEvent(new Event('open-support-chat'))
    })
    fireEvent.click(await screen.findByRole('button', { name: /nueva consulta/i }))
    const input = screen.getByPlaceholderText('Escriba su mensaje aquí...')
    fireEvent.change(input, {
      target: { value: 'Consulta desde flotante' },
    })
    fireEvent.submit(input.closest('form')!)

    await waitFor(() => expect(createSupportTicket).toHaveBeenCalledWith('uuid-ticket', 'Consulta desde flotante'))
    expect(socket.emit).toHaveBeenCalledWith('support:ticket-created', expect.objectContaining({
      ticketId: 'uuid-ticket',
      preview: 'Consulta desde flotante',
    }))
  })

  it('abre el selector de archivos desde el boton de adjuntar', async () => {
    const clickSpy = jest.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
    render(<SupportChat userId="user-1" embedded ticketId="ticket-1" />)

    await screen.findByText('Necesito ayuda con mi mesa')
    fireEvent.click(screen.getByTitle('Adjuntar archivo'))

    expect(clickSpy).toHaveBeenCalled()
  })

  it('inicia un nuevo ticket desde la lista flotante y desde un chat embebido finalizado', async () => {
    ;(getSupportTicket as jest.Mock).mockResolvedValue({ data: { status: 'finalized' } })
    ;(getSupportTicketHistory as jest.Mock).mockResolvedValue({ data: { messages: [], attachments: [] } })
    const { rerender } = render(<SupportChat userId="user-1" />)

    await act(async () => {
      window.dispatchEvent(new Event('open-support-chat'))
    })
    fireEvent.click(await screen.findByRole('button', { name: /nueva consulta/i }))
    expect(screen.getByText(/cómo podemos asistirle/i)).toBeInTheDocument()

    rerender(<SupportChat userId="user-1" embedded ticketId="ticket-final" />)
    expect(await screen.findByText('Chat Finalizado')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /iniciar nueva consulta/i }))
    expect(screen.getByPlaceholderText('Escribe tu consulta...')).toBeEnabled()
  })

  it('inicia nueva solicitud desde el chat flotante finalizado', async () => {
    ;(getSupportTicket as jest.Mock).mockResolvedValue({ data: { status: 'finalized' } })
    render(<SupportChat userId="user-1" ticketId="ticket-1" />)

    await act(async () => {
      window.dispatchEvent(new Event('open-support-chat'))
    })
    expect(await screen.findByText('Consulta Finalizada')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /nueva solicitud/i }))

    expect(screen.getByText(/cómo podemos asistirle/i)).toBeInTheDocument()
  })

  it('respuesta admin a ticket pendiente lo marca como atendido y emite legacy reply', async () => {
    ;(appendSupportMessage as jest.Mock).mockResolvedValue({ data: { message_id: 'admin-msg', from: 'admin' } })
    render(<SupportChat userId="user-1" embedded isAdmin ticketId="ticket-1" />)

    await screen.findByText('Necesito ayuda con mi mesa')
    fireEvent.change(screen.getByPlaceholderText('Responder al usuario...'), {
      target: { value: 'Te ayudo ahora' },
    })
    fireEvent.click(screen.getByRole('button', { name: '' }))

    await waitFor(() => expect(appendSupportMessage).toHaveBeenCalledWith('ticket-1', 'Te ayudo ahora'))
    expect(socket.emit).toHaveBeenCalledWith('support:ticket-attended', { ticketId: 'ticket-1' })
    expect(socket.emit).toHaveBeenCalledWith('support:reply', {
      userId: 'user-1',
      message: 'Te ayudo ahora',
      ticketId: 'ticket-1',
    })
  })
})
