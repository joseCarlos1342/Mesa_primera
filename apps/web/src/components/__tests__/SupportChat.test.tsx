import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SupportChat } from '../SupportChat'
import {
  appendSupportMessage,
  closeSupportTicket,
  createSupportIssue,
  createSupportTicket,
  getSupportTicket,
  getSupportTicketHistory,
  listUserTickets,
  uploadSupportAttachment,
} from '@/app/actions/support'
import { closeIssueTicket, getPlayerIssueMessages, listIssueTicketAttachments, listPlayerIssueTickets } from '@/app/actions/admin-issues'

const socketHandlers = new Map<string, (payload: any) => void>()
const socket = {
  emit: jest.fn(),
  on: jest.fn((event: string, handler: (payload: any) => void) => {
    socketHandlers.set(event, handler)
  }),
  disconnect: jest.fn(),
}
const originalAudio = window.Audio

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => socket),
}))

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'uuid-ticket'),
}))

jest.mock('@/app/actions/support', () => ({
  createSupportTicket: jest.fn(),
  createSupportIssue: jest.fn(),
  appendSupportMessage: jest.fn(),
  closeSupportTicket: jest.fn(),
  listUserTickets: jest.fn(),
  getSupportTicketHistory: jest.fn(),
  uploadSupportAttachment: jest.fn(),
  getSupportAttachmentUrl: jest.fn(),
  getSupportTicket: jest.fn(),
}))

jest.mock('@/app/actions/admin-issues', () => ({
  listPlayerIssueTickets: jest.fn(),
  getPlayerIssueMessages: jest.fn(),
  listIssueTicketAttachments: jest.fn(),
  closeIssueTicket: jest.fn(),
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

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => { resolve = promiseResolve })
  return { promise, resolve }
}

describe('SupportChat', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    socketHandlers.clear()
    Element.prototype.scrollIntoView = jest.fn()
    ;(listUserTickets as jest.Mock).mockResolvedValue({ data: [] })
    ;(listPlayerIssueTickets as jest.Mock).mockResolvedValue({ data: [] })
    ;(getPlayerIssueMessages as jest.Mock).mockResolvedValue({ data: [] })
    ;(listIssueTicketAttachments as jest.Mock).mockResolvedValue({ data: [] })
    ;(getSupportTicketHistory as jest.Mock).mockResolvedValue(defaultHistory)
    ;(getSupportTicket as jest.Mock).mockResolvedValue({ data: { status: 'pending' } })
    ;(createSupportTicket as jest.Mock).mockResolvedValue({ data: { ticket_id: 'uuid-ticket', message_id: 'msg-new' } })
    ;(createSupportIssue as jest.Mock).mockResolvedValue({ data: { ticket_id: 'issue-ticket', message_id: 'issue-message' } })
    ;(appendSupportMessage as jest.Mock).mockResolvedValue({ data: { message_id: 'msg-next', from: 'player' } })
    ;(closeSupportTicket as jest.Mock).mockResolvedValue({ data: { closed_by_role: 'player' } })
    ;(uploadSupportAttachment as jest.Mock).mockResolvedValue({
      data: { id: 'attachment-1', file_name: 'evidencia.png' },
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
    Object.defineProperty(window, 'Audio', { configurable: true, writable: true, value: originalAudio })
  })

  it('permite reportar un depósito no acreditado desde el centro de ayuda', async () => {
    render(<SupportChat userId="user-1" />)
    act(() => window.dispatchEvent(new CustomEvent('open-support-chat')))
    fireEvent.click(screen.getByRole('button', { name: /reportar un problema/i }))
    fireEvent.click(screen.getByRole('button', { name: /depósito no acreditado/i }))
    fireEvent.change(screen.getByLabelText('ID de transacción'), { target: { value: 'deposit-123' } })
    fireEvent.change(screen.getByLabelText('Observaciones del error'), { target: { value: 'El saldo no se actualizó.' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar reporte/i }))

    await waitFor(() => expect(createSupportIssue).toHaveBeenCalledWith(expect.objectContaining({
      category: 'deposit_missing',
      transactionReference: 'deposit-123',
      message: 'El saldo no se actualizó.',
    })))
  })

  it('conserva el formulario y muestra un error cuando no se puede registrar un reclamo', async () => {
    ;(createSupportIssue as jest.Mock).mockResolvedValueOnce({ error: 'No se pudo validar la referencia' })
    render(<SupportChat userId="user-1" />)
    act(() => window.dispatchEvent(new CustomEvent('open-support-chat')))
    await screen.findByText('Centro de Ayuda')
    fireEvent.click(screen.getByRole('button', { name: /reportar un problema/i }))
    fireEvent.click(screen.getByRole('button', { name: /depósito no acreditado/i }))
    fireEvent.change(screen.getByLabelText('ID de transacción'), { target: { value: 'deposit-1' } })
    fireEvent.change(screen.getByLabelText('Observaciones del error'), { target: { value: 'Sigue sin acreditarse' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar reporte/i }))

    expect(await screen.findByText('No se pudo validar la referencia')).toBeInTheDocument()
    expect(screen.getByLabelText('Observaciones del error')).toHaveValue('Sigue sin acreditarse')
  })

  it('permite revisar y cerrar un reclamo abierto del jugador', async () => {
    const issue = {
      id: 'issue-1', user_id: 'user-1', category: 'table_error', description: 'La mesa quedó bloqueada',
      transaction_reference: null, table_reference: 'room-1', occurred_at: '2026-07-16T10:00:00.000Z',
      status: 'open', resolution_notes: null, created_at: '2026-07-16T10:00:00.000Z', updated_at: '2026-07-16T10:00:00.000Z',
    }
    ;(listPlayerIssueTickets as jest.Mock).mockResolvedValue({ data: [issue] })
    ;(getPlayerIssueMessages as jest.Mock).mockResolvedValue({ data: [{ id: 'issue-message-1', ticket_id: 'issue-1', message: 'Estamos revisando la mesa.', from_admin: true, created_at: '2026-07-16T10:05:00.000Z' }] })
    ;(closeIssueTicket as jest.Mock).mockResolvedValue({ data: undefined })

    render(<SupportChat userId="user-1" />)
    act(() => window.dispatchEvent(new Event('open-support-chat')))
    await screen.findByText('Centro de Ayuda')
    fireEvent.click(screen.getByRole('button', { name: /mis reclamos/i }))
    fireEvent.click(await screen.findByRole('button', { name: /table error/i }))
    await act(async () => { await Promise.resolve() })

    expect(await screen.findByText('Estamos revisando la mesa.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar caso' }))

    await waitFor(() => expect(closeIssueTicket).toHaveBeenCalledWith('issue-1'))
    expect(await screen.findByText('El caso fue cerrado por el jugador.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cerrar caso' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /mis reclamos/i }))
    expect(await screen.findByRole('button', { name: /table error/i })).toBeInTheDocument()
  })

  it('mantiene las acciones ocultas para un reclamo resuelto', async () => {
    const resolvedIssue = {
      id: 'issue-2', user_id: 'user-1', category: 'deposit_missing', description: 'Depósito resuelto',
      transaction_reference: 'deposit-1', table_reference: null, occurred_at: '2026-07-16T10:00:00.000Z',
      status: 'resolved', resolution_notes: 'Acreditado', created_at: '2026-07-16T10:00:00.000Z', updated_at: '2026-07-16T10:00:00.000Z',
    }
    ;(listPlayerIssueTickets as jest.Mock).mockResolvedValue({ data: [resolvedIssue] })

    render(<SupportChat userId="user-1" />)
    act(() => window.dispatchEvent(new Event('open-support-chat')))
    await screen.findByText('Centro de Ayuda')
    fireEvent.click(screen.getByRole('button', { name: /mis reclamos/i }))
    fireEvent.click(await screen.findByRole('button', { name: /deposit missing/i }))
    await act(async () => { await Promise.resolve() })

    expect(await screen.findByText('Depósito resuelto')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cerrar caso' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Seleccionar imagen')).not.toBeInTheDocument()
  })

  it('envía la referencia de mesa sin referencia financiera al reportar un error de juego', async () => {
    render(<SupportChat userId="user-1" />)
    act(() => window.dispatchEvent(new Event('open-support-chat')))
    await screen.findByText('Centro de Ayuda')
    fireEvent.click(screen.getByRole('button', { name: /reportar un problema/i }))
    fireEvent.click(screen.getByRole('button', { name: /error en mesa o partida/i }))
    fireEvent.change(screen.getByLabelText('ID de mesa'), { target: { value: 'room-7' } })
    fireEvent.change(screen.getByLabelText('Observaciones del error'), { target: { value: 'La mano no avanzó' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar reporte/i }))

    await waitFor(() => expect(createSupportIssue).toHaveBeenCalledWith(expect.objectContaining({
      category: 'table_error', tableReference: 'room-7', transactionReference: undefined,
    })))
  })

  it('reporta la categoría otro sin asociar referencias financieras ni de mesa', async () => {
    render(<SupportChat userId="user-1" />)
    act(() => window.dispatchEvent(new Event('open-support-chat')))
    await screen.findByText('Centro de Ayuda')
    fireEvent.click(screen.getByRole('button', { name: /reportar un problema/i }))
    fireEvent.click(screen.getByRole('button', { name: /otro problema/i }))

    expect(screen.queryByLabelText('ID de transacción')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('ID de mesa')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Observaciones del error'), { target: { value: 'Necesito ayuda con otro caso' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar reporte/i }))

    await waitFor(() => expect(createSupportIssue).toHaveBeenCalledWith({
      category: 'other',
      message: 'Necesito ayuda con otro caso',
      transactionReference: undefined,
      tableReference: undefined,
      occurredAt: expect.any(String),
    }))
    expect(await screen.findByText('Necesito ayuda con otro caso')).toBeInTheDocument()
    await waitFor(() => expect(getPlayerIssueMessages).toHaveBeenCalledWith('issue-ticket'))
  })

  it('carga historial y estado cuando recibe un ticket embebido', async () => {
    const { unmount } = render(<SupportChat userId="user-1" embedded ticketId="ticket-1" />)

    expect(await screen.findByText('Necesito ayuda con mi mesa')).toBeInTheDocument()
    expect(screen.getByText('Ya revisamos tu solicitud')).toBeInTheDocument()
    expect(getSupportTicketHistory).toHaveBeenCalledWith('ticket-1')
    expect(getSupportTicket).toHaveBeenCalledWith('ticket-1')
    expect(socket.emit).toHaveBeenCalledWith('support:join', 'ticket-1')
    unmount()
    expect(socket.emit).toHaveBeenCalledWith('support:leave', 'ticket-1')
    expect(socket.disconnect).toHaveBeenCalled()
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

  it('abre tickets archivados desde la lista sin habilitar nuevas respuestas', async () => {
    ;(listUserTickets as jest.Mock).mockResolvedValue({
      data: [{
        id: 'ticket-final',
        last_message_preview: 'Consulta ya archivada',
        created_at: '2026-05-24T10:00:00.000Z',
        status: 'finalized',
      }],
    })
    ;(getSupportTicket as jest.Mock).mockResolvedValue({ data: { status: 'finalized' } })

    render(<SupportChat userId="user-1" />)
    act(() => window.dispatchEvent(new Event('open-support-chat')))
    fireEvent.click(await screen.findByRole('button', { name: /consulta ya archivada/i }))

    await screen.findByText('Necesito ayuda con mi mesa')
    expect(await screen.findByText('Consulta Finalizada')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/escrib/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /nueva solicitud/i })).toBeInTheDocument()
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

  it('evita duplicar mensajes mientras el envío anterior sigue pendiente', async () => {
    const pendingAppend = deferred<{ data: { message_id: string; from: 'player' } }>()
    ;(appendSupportMessage as jest.Mock).mockReturnValueOnce(pendingAppend.promise)
    render(<SupportChat userId="user-1" embedded ticketId="ticket-1" />)

    await screen.findByText('Necesito ayuda con mi mesa')
    const input = screen.getByPlaceholderText('Escribe tu consulta...')
    fireEvent.change(input, { target: { value: 'Enviar una sola vez' } })
    const form = input.closest('form')!
    fireEvent.submit(form)
    fireEvent.submit(form)

    expect(appendSupportMessage).toHaveBeenCalledTimes(1)
    expect(screen.getAllByText('Enviar una sola vez')).toHaveLength(1)
    expect(input).toBeDisabled()

    pendingAppend.resolve({ data: { message_id: 'msg-pending', from: 'player' } })
    await waitFor(() => expect(input).toBeEnabled())
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

  it('incorpora para admin mensajes player modernos sin duplicar los propios', async () => {
    render(<SupportChat userId="user-1" embedded isAdmin ticketId="ticket-1" />)

    await screen.findByText('Necesito ayuda con mi mesa')
    await act(async () => {
      socketHandlers.get('support:message-created')?.({
        ticketId: 'ticket-1', messageId: 'player-msg', message: 'Respuesta del jugador',
        from: 'player', timestamp: '2026-05-24T10:10:00.000Z',
      })
      socketHandlers.get('support:message-created')?.({
        ticketId: 'ticket-1', messageId: 'admin-msg', message: 'Eco del administrador',
        from: 'admin', timestamp: '2026-05-24T10:11:00.000Z',
      })
    })

    expect(screen.getByText('Respuesta del jugador')).toBeInTheDocument()
    expect(screen.queryByText('Eco del administrador')).not.toBeInTheDocument()
  })

  it('ignora mensajes propios y notifica mensajes remotos cuando el chat flotante está cerrado', async () => {
    const play = jest.fn(() => Promise.reject(new DOMException('Autoplay blocked', 'NotAllowedError')))
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
    await waitFor(() => {
      expect(getSupportTicketHistory).toHaveBeenCalledTimes(2)
      expect(getSupportTicket).toHaveBeenCalledTimes(2)
    })
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
    expect(socket.emit).toHaveBeenCalledWith('support:ticket-finalized', {
      ticketId: 'ticket-1',
      closedByRole: 'player',
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
    render(<SupportChat userId="user-1" ticketId="ticket-1" />)

    act(() => window.dispatchEvent(new Event('open-support-chat')))
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
    ;(getSupportTicket as jest.Mock).mockImplementation((ticketId: string) => Promise.resolve(
      ticketId === 'ticket-1' ? { data: { status: 'finalized' } } : { data: null }
    ))
    ;(getSupportTicketHistory as jest.Mock).mockImplementation((ticketId: string) => Promise.resolve(
      ticketId === 'ticket-1' ? defaultHistory : { data: { messages: [], attachments: [] } }
    ))
    render(<SupportChat userId="user-1" ticketId="ticket-1" />)

    await act(async () => {
      window.dispatchEvent(new Event('open-support-chat'))
    })
    expect(await screen.findByText('Consulta Finalizada')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /nueva solicitud/i }))

    await waitFor(() => {
      expect(getSupportTicketHistory).toHaveBeenCalledWith('uuid-ticket')
      expect(getSupportTicket).toHaveBeenCalledWith('uuid-ticket')
    })
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

  it('no envia createSupportTicket cuando falla y no emite ticket-created', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    ;(getSupportTicketHistory as jest.Mock).mockResolvedValue({ data: { messages: [], attachments: [] } })
    ;(createSupportTicket as jest.Mock).mockResolvedValueOnce({ error: 'DB caída' })

    render(<SupportChat userId="user-1" embedded />)
    fireEvent.change(screen.getByPlaceholderText('Escribe tu consulta...'), {
      target: { value: 'Tengo un problema' },
    })
    fireEvent.click(screen.getByRole('button', { name: '' }))

    await waitFor(() => expect(createSupportTicket).toHaveBeenCalledWith('user-1', 'Tengo un problema'))
    expect(consoleError).toHaveBeenCalledWith('Failed to create ticket:', 'DB caída')
    expect(socket.emit).not.toHaveBeenCalledWith('support:ticket-created', expect.anything())
    consoleError.mockRestore()
  })

  it('no emite message-created cuando appendSupportMessage falla en mensaje posterior', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    ;(appendSupportMessage as jest.Mock).mockResolvedValueOnce({ error: 'RPC caída' })

    render(<SupportChat userId="user-1" embedded ticketId="ticket-1" />)
    await screen.findByText('Necesito ayuda con mi mesa')
    fireEvent.change(screen.getByPlaceholderText('Escribe tu consulta...'), {
      target: { value: 'Segundo mensaje' },
    })
    fireEvent.click(screen.getByRole('button', { name: '' }))

    await waitFor(() => expect(appendSupportMessage).toHaveBeenCalledWith('ticket-1', 'Segundo mensaje'))
    expect(socket.emit).not.toHaveBeenCalledWith('support:message-created', expect.objectContaining({ message: 'Segundo mensaje' }))
    expect(consoleError).toHaveBeenCalledWith('Failed to send message:', 'RPC caída')
    consoleError.mockRestore()
  })

  it('ignora mensajes socket de otros tickets', async () => {
    render(<SupportChat userId="user-1" embedded ticketId="ticket-1" />)
    await screen.findByText('Necesito ayuda con mi mesa')

    await act(async () => {
      socketHandlers.get('support:message-created')?.({
        ticketId: 'other-ticket',
        messageId: 'msg-other',
        message: 'Mensaje de otro ticket',
        from: 'admin',
        timestamp: '2026-05-24T10:12:00.000Z',
      })
    })

    expect(screen.queryByText('Mensaje de otro ticket')).not.toBeInTheDocument()
  })

  it('usa fallback de uuid y Date.now cuando el socket no envia messageId ni timestamp', async () => {
    const { v4 } = require('uuid')
    ;(v4 as jest.Mock).mockReturnValueOnce('fallback-uuid')

    render(<SupportChat userId="user-1" embedded ticketId="ticket-1" />)
    await screen.findByText('Necesito ayuda con mi mesa')

    await act(async () => {
      socketHandlers.get('support:message-created')?.({
        ticketId: 'ticket-1',
        message: 'Sin IDs',
        from: 'admin',
      })
    })

    expect(screen.getByText('Sin IDs')).toBeInTheDocument()
    expect(screen.getByText('Sin IDs').closest('div')?.parentElement).toBeInTheDocument()
  })

  it('reproduce audio de notificacion legacy cuando el chat flotante esta cerrado', async () => {
    const play = jest.fn(() => Promise.resolve())
    const audioMock = jest.fn(() => ({ volume: 0.5, play }))
    Object.defineProperty(window, 'Audio', { configurable: true, value: audioMock })

    render(<SupportChat userId="user-1" ticketId="ticket-1" />)
    await waitFor(() => expect(socketHandlers.has('support:message')).toBe(true))

    await act(async () => {
      socketHandlers.get('support:message')?.({
        userId: 'user-1',
        ticketId: 'ticket-1',
        message: 'Legacy notificacion',
      })
    })

    expect(audioMock).toHaveBeenCalledWith('/sounds/notification.mp3')
    expect(play).toHaveBeenCalled()
  })

  it('no procesa adjuntos sin archivo o sin ticketId activo', async () => {
    ;(getSupportTicketHistory as jest.Mock).mockResolvedValue({ data: { messages: [], attachments: [] } })
    ;(getSupportTicket as jest.Mock).mockResolvedValue({ data: { status: 'pending' } })

    render(<SupportChat userId="user-1" embedded />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [] } })

    await waitFor(() => {
      expect(uploadSupportAttachment).not.toHaveBeenCalled()
    })
  })

  it('no cierra un ticket finalizado', async () => {
    ;(getSupportTicket as jest.Mock).mockResolvedValue({ data: { status: 'finalized' } })

    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    render(<SupportChat userId="user-1" ticketId="ticket-1" />)
    await act(async () => {
      window.dispatchEvent(new Event('open-support-chat'))
    })

    await screen.findByText('Consulta Finalizada')
    // No hay botón de cerrar visible porque está finalizado
    expect(screen.queryByTitle('Cerrar consulta')).not.toBeInTheDocument()
    expect(closeSupportTicket).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('no envia mensaje cuando input esta vacio o esta enviando', async () => {
    render(<SupportChat userId="user-1" embedded ticketId="ticket-1" />)
    await screen.findByText('Necesito ayuda con mi mesa')
    const submitBtn = screen.getByRole('button', { name: '' })
    expect(submitBtn).toBeDisabled()
  })

  it('maneja preview de ticket largo con elipsis y preview nulo con fallback', async () => {
    ;(listUserTickets as jest.Mock).mockResolvedValue({
      data: [
        {
          id: 'ticket-long',
          last_message_preview: 'x'.repeat(50),
          created_at: '2026-05-24T10:00:00.000Z',
          status: 'pending',
        },
        {
          id: 'ticket-null',
          last_message_preview: null,
          created_at: '2026-06-01T10:00:00.000Z',
          status: 'attended',
        },
      ],
    })

    render(<SupportChat userId="user-1" />)
    await act(async () => {
      window.dispatchEvent(new Event('open-support-chat'))
    })

    // Ticket con preview largo (>30 chars) muestra elipsis
    expect(await screen.findByText(/x{30}\.\.\./i)).toBeInTheDocument()
    // Ticket con preview nulo usa fallback "Consulta" y muestra su fecha
    expect(screen.getByText('6/1/2026')).toBeInTheDocument()
  })
})
