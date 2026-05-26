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
})
