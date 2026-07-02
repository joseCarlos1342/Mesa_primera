import {
  appendSupportMessage,
  closeSupportTicket,
  createSupportTicket,
  getSupportAttachmentUrl,
  getSupportTicket,
  getSupportTicketHistory,
  listAllTickets,
  listUserTickets,
  uploadSupportAttachment,
} from '../support'
import { createClient } from '@/utils/supabase/server'

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

const user = { id: 'user-123' }

function buildAuth(authUser: { id: string } | null = user) {
  return {
    getUser: jest.fn().mockResolvedValue({ data: { user: authUser } }),
  }
}

function queuedSupabase(options: {
  tables?: Record<string, unknown[]>
  rpc?: jest.Mock
  storage?: unknown
  authUser?: { id: string } | null
} = {}) {
  const authUser = Object.prototype.hasOwnProperty.call(options, 'authUser') ? options.authUser! : user

  return {
    auth: buildAuth(authUser),
    rpc: options.rpc ?? jest.fn().mockResolvedValue({ data: false, error: null }),
    storage: options.storage,
    from: jest.fn((table: string) => {
      const query = options.tables?.[table]?.shift()
      if (!query) throw new Error(`Unexpected support query: ${table}`)
      return query
    }),
  }
}

describe('support actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('rechaza crear tickets sin usuario autenticado', async () => {
    const supabase = queuedSupabase({ authUser: null })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(createSupportTicket('ticket-1', 'Hola soporte')).resolves.toEqual({ error: 'No autenticado' })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('valida mensajes vacíos antes de crear el ticket', async () => {
    const supabase = queuedSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(createSupportTicket('ticket-1', '   ')).resolves.toEqual({ error: 'El mensaje no puede estar vacío' })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('rechaza crear tickets con mensajes demasiado largos', async () => {
    const supabase = queuedSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(createSupportTicket('ticket-1', 'x'.repeat(5001))).resolves.toEqual({
      error: 'El mensaje es demasiado largo',
    })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('crea ticket de soporte con preview truncado y primer mensaje', async () => {
    const ticketInsert = jest.fn().mockResolvedValue({ error: null })
    const single = jest.fn().mockResolvedValue({ data: { id: 'message-1' }, error: null })
    const select = jest.fn().mockReturnValue({ single })
    const messageInsert = jest.fn().mockReturnValue({ select })
    const supabase = queuedSupabase({
      tables: {
        support_tickets: [{ insert: ticketInsert }],
        support_messages: [{ insert: messageInsert }],
      },
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    const message = `${'x'.repeat(120)}   `
    await expect(createSupportTicket('ticket-1', message)).resolves.toEqual({
      data: { ticket_id: 'ticket-1', message_id: 'message-1' },
    })
    expect(ticketInsert).toHaveBeenCalledWith(expect.objectContaining({
      id: 'ticket-1',
      user_id: 'user-123',
      status: 'pending',
      last_message_from: 'player',
      last_message_preview: 'x'.repeat(100),
      message_count: 1,
    }))
    expect(messageInsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-123',
      ticket_id: 'ticket-1',
      message: 'x'.repeat(120),
      from_admin: false,
      is_resolved: false,
    }))
  })

  it('propaga errores al crear el ticket inicial antes de insertar mensajes', async () => {
    const ticketInsert = jest.fn().mockResolvedValue({ error: { message: 'DB sin disponibilidad' } })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      tables: {
        support_tickets: [{ insert: ticketInsert }],
      },
    }))

    await expect(createSupportTicket('ticket-1', 'Hola soporte')).resolves.toEqual({
      error: 'DB sin disponibilidad',
    })
  })

  it('propaga errores al insertar el primer mensaje del ticket', async () => {
    const ticketInsert = jest.fn().mockResolvedValue({ error: null })
    const single = jest.fn().mockResolvedValue({ data: null, error: { message: 'No se guardo el mensaje' } })
    const select = jest.fn().mockReturnValue({ single })
    const messageInsert = jest.fn().mockReturnValue({ select })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      tables: {
        support_tickets: [{ insert: ticketInsert }],
        support_messages: [{ insert: messageInsert }],
      },
    }))

    await expect(createSupportTicket('ticket-1', 'Hola soporte')).resolves.toEqual({
      error: 'No se guardo el mensaje',
    })
  })

  it('agrega mensajes usando la RPC atomica y conserva el rol devuelto', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: { success: true, message_id: 'message-2', from: 'admin' }, error: null })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ rpc }))

    await expect(appendSupportMessage('ticket-1', ' Respuesta admin ')).resolves.toEqual({
      data: { message_id: 'message-2', from: 'admin' },
    })
    expect(rpc).toHaveBeenNthCalledWith(1, 'is_admin')
    expect(rpc).toHaveBeenNthCalledWith(2, 'append_support_message', {
      p_ticket_id: 'ticket-1',
      p_message: 'Respuesta admin',
      p_from_admin: true,
    })
  })

  it('propaga errores funcionales de append_support_message', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: false, error: null })
      .mockResolvedValueOnce({ data: { success: false, error: 'Ticket cerrado' }, error: null })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ rpc }))

    await expect(appendSupportMessage('ticket-1', 'Mensaje')).resolves.toEqual({ error: 'Ticket cerrado' })
  })

  it('rechaza agregar mensajes vacios antes de consultar permisos', async () => {
    const supabase = queuedSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(appendSupportMessage('ticket-1', '   ')).resolves.toEqual({
      error: 'El mensaje no puede estar vacío',
    })
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('propaga errores tecnicos de append_support_message', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: false, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'RPC caida' } })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ rpc }))

    await expect(appendSupportMessage('ticket-1', 'Mensaje')).resolves.toEqual({ error: 'RPC caida' })
  })

  it('usa error desconocido cuando append_support_message no devuelve payload util', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: false, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ rpc }))

    await expect(appendSupportMessage('ticket-1', 'Mensaje')).resolves.toEqual({ error: 'Error desconocido' })
  })

  it('usa rol admin por defecto cuando append_support_message omite from', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: { success: true, message_id: 'message-3' }, error: null })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ rpc }))

    await expect(appendSupportMessage('ticket-1', 'Mensaje')).resolves.toEqual({
      data: { message_id: 'message-3', from: 'admin' },
    })
  })

  it('rechaza agregar mensajes demasiado largos antes de llamar la RPC', async () => {
    const supabase = queuedSupabase()
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(appendSupportMessage('ticket-1', 'x'.repeat(5001))).resolves.toEqual({
      error: 'El mensaje es demasiado largo',
    })
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('cierra ticket y usa player como rol por defecto si la RPC no devuelve rol', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: false, error: null })
      .mockResolvedValueOnce({ data: { success: true }, error: null })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ rpc }))

    await expect(closeSupportTicket('ticket-1')).resolves.toEqual({ data: { closed_by_role: 'player' } })
    expect(rpc).toHaveBeenNthCalledWith(2, 'close_support_ticket', {
      p_ticket_id: 'ticket-1',
      p_role: 'player',
    })
  })

  it('cierra ticket como admin cuando el caller tiene permisos y la RPC omite rol', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: { success: true }, error: null })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ rpc }))

    await expect(closeSupportTicket('ticket-1')).resolves.toEqual({ data: { closed_by_role: 'admin' } })
    expect(rpc).toHaveBeenNthCalledWith(2, 'close_support_ticket', {
      p_ticket_id: 'ticket-1',
      p_role: 'admin',
    })
  })

  it('propaga errores tecnicos al cerrar tickets', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: false, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'No se pudo cerrar' } })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ rpc }))

    await expect(closeSupportTicket('ticket-1')).resolves.toEqual({ error: 'No se pudo cerrar' })
  })

  it('usa error desconocido cuando close_support_ticket no devuelve payload util', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: false, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ rpc }))

    await expect(closeSupportTicket('ticket-1')).resolves.toEqual({ error: 'Error desconocido' })
  })

  it('obtiene un ticket por id', async () => {
    const ticket = { id: 'ticket-1', user_id: 'user-123', status: 'pending' }
    const single = jest.fn().mockResolvedValue({ data: ticket, error: null })
    const eq = jest.fn().mockReturnValue({ single })
    const select = jest.fn().mockReturnValue({ eq })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      tables: { support_tickets: [{ select }] },
    }))

    await expect(getSupportTicket('ticket-1')).resolves.toEqual({ data: ticket })
    expect(eq).toHaveBeenCalledWith('id', 'ticket-1')
  })

  it('propaga errores al obtener un ticket por id', async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: { message: 'Ticket no visible' } })
    const eq = jest.fn().mockReturnValue({ single })
    const select = jest.fn().mockReturnValue({ eq })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      tables: { support_tickets: [{ select }] },
    }))

    await expect(getSupportTicket('ticket-1')).resolves.toEqual({ error: 'Ticket no visible' })
  })

  it('obtiene historial de mensajes y adjuntos de un ticket', async () => {
    const messages = [{ id: 'message-1', ticket_id: 'ticket-1', message: 'Hola' }]
    const attachments = [{ id: 'attachment-1', ticket_id: 'ticket-1', file_name: 'proof.png' }]
    const messageOrder = jest.fn().mockResolvedValue({ data: messages, error: null })
    const messageEq = jest.fn().mockReturnValue({ order: messageOrder })
    const messageSelect = jest.fn().mockReturnValue({ eq: messageEq })
    const attachmentOrder = jest.fn().mockResolvedValue({ data: attachments, error: null })
    const attachmentEq = jest.fn().mockReturnValue({ order: attachmentOrder })
    const attachmentSelect = jest.fn().mockReturnValue({ eq: attachmentEq })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      tables: {
        support_messages: [{ select: messageSelect }],
        support_attachments: [{ select: attachmentSelect }],
      },
    }))

    await expect(getSupportTicketHistory('ticket-1')).resolves.toEqual({
      data: { messages, attachments },
    })
    expect(messageEq).toHaveBeenCalledWith('ticket_id', 'ticket-1')
    expect(attachmentEq).toHaveBeenCalledWith('ticket_id', 'ticket-1')
  })

  it('devuelve listas vacias cuando el historial no tiene mensajes ni adjuntos', async () => {
    const messageOrder = jest.fn().mockResolvedValue({ data: null, error: null })
    const messageEq = jest.fn().mockReturnValue({ order: messageOrder })
    const messageSelect = jest.fn().mockReturnValue({ eq: messageEq })
    const attachmentOrder = jest.fn().mockResolvedValue({ data: null, error: null })
    const attachmentEq = jest.fn().mockReturnValue({ order: attachmentOrder })
    const attachmentSelect = jest.fn().mockReturnValue({ eq: attachmentEq })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      tables: {
        support_messages: [{ select: messageSelect }],
        support_attachments: [{ select: attachmentSelect }],
      },
    }))

    await expect(getSupportTicketHistory('ticket-1')).resolves.toEqual({
      data: { messages: [], attachments: [] },
    })
  })

  it('propaga errores de mensajes al obtener historial', async () => {
    const messageOrder = jest.fn().mockResolvedValue({ data: null, error: { message: 'Historial no disponible' } })
    const messageEq = jest.fn().mockReturnValue({ order: messageOrder })
    const messageSelect = jest.fn().mockReturnValue({ eq: messageEq })
    const attachmentOrder = jest.fn().mockResolvedValue({ data: [], error: null })
    const attachmentEq = jest.fn().mockReturnValue({ order: attachmentOrder })
    const attachmentSelect = jest.fn().mockReturnValue({ eq: attachmentEq })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      tables: {
        support_messages: [{ select: messageSelect }],
        support_attachments: [{ select: attachmentSelect }],
      },
    }))

    await expect(getSupportTicketHistory('ticket-1')).resolves.toEqual({ error: 'Historial no disponible' })
  })

  it('lista tickets del usuario autenticado por updated_at descendente', async () => {
    const tickets = [{ id: 'ticket-1', user_id: 'user-123', status: 'pending' }]
    const order = jest.fn().mockResolvedValue({ data: tickets, error: null })
    const eq = jest.fn().mockReturnValue({ order })
    const select = jest.fn().mockReturnValue({ eq })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      tables: { support_tickets: [{ select }] },
    }))

    await expect(listUserTickets()).resolves.toEqual({ data: tickets })
    expect(eq).toHaveBeenCalledWith('user_id', 'user-123')
    expect(order).toHaveBeenCalledWith('updated_at', { ascending: false })
  })

  it('devuelve lista vacia cuando el usuario no tiene tickets', async () => {
    const order = jest.fn().mockResolvedValue({ data: null, error: null })
    const eq = jest.fn().mockReturnValue({ order })
    const select = jest.fn().mockReturnValue({ eq })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      tables: { support_tickets: [{ select }] },
    }))

    await expect(listUserTickets()).resolves.toEqual({ data: [] })
  })

  it('propaga errores al listar tickets del usuario', async () => {
    const order = jest.fn().mockResolvedValue({ data: null, error: { message: 'No se pudo listar' } })
    const eq = jest.fn().mockReturnValue({ order })
    const select = jest.fn().mockReturnValue({ eq })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      tables: { support_tickets: [{ select }] },
    }))

    await expect(listUserTickets()).resolves.toEqual({ error: 'No se pudo listar' })
  })

  it('lista tickets admin filtrando por estado cuando se solicita', async () => {
    const tickets = [{ id: 'ticket-1', status: 'pending', user: { username: 'rivera' } }]
    const eq = jest.fn().mockResolvedValue({ data: tickets, error: null })
    const order = jest.fn().mockReturnValue({ eq })
    const select = jest.fn().mockReturnValue({ order })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      tables: { support_tickets: [{ select }] },
    }))

    await expect(listAllTickets('pending')).resolves.toEqual({ data: tickets })
    expect(select).toHaveBeenCalledWith('*, user:profiles(username, full_name, avatar_url)')
    expect(order).toHaveBeenCalledWith('updated_at', { ascending: false })
    expect(eq).toHaveBeenCalledWith('status', 'pending')
  })

  it('lista todos los tickets admin sin filtro de estado', async () => {
    const tickets = [{ id: 'ticket-1', status: 'attended', user: { username: 'ana' } }]
    const order = jest.fn().mockResolvedValue({ data: tickets, error: null })
    const select = jest.fn().mockReturnValue({ order })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      tables: { support_tickets: [{ select }] },
    }))

    await expect(listAllTickets()).resolves.toEqual({ data: tickets })
    expect(order).toHaveBeenCalledWith('updated_at', { ascending: false })
  })

  it('propaga errores al listar tickets admin', async () => {
    const order = jest.fn().mockResolvedValue({ data: null, error: { message: 'Vista no disponible' } })
    const select = jest.fn().mockReturnValue({ order })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      tables: { support_tickets: [{ select }] },
    }))

    await expect(listAllTickets()).resolves.toEqual({ error: 'Vista no disponible' })
  })

  it('rechaza adjuntos con tipo de archivo no permitido', async () => {
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase())
    const formData = new FormData()
    formData.append('file', new File(['x'], 'proof.txt', { type: 'text/plain' }))

    await expect(uploadSupportAttachment('ticket-1', formData)).resolves.toEqual({
      error: 'Tipo de archivo no permitido. Solo imágenes (JPG, PNG, WebP, GIF) y PDF.',
    })
  })

  it('rechaza subida de adjuntos sin archivo', async () => {
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase())

    await expect(uploadSupportAttachment('ticket-1', new FormData())).resolves.toEqual({
      error: 'No se proporcionó archivo',
    })
  })

  it('rechaza adjuntos cuando el ticket no existe', async () => {
    const ticketSingle = jest.fn().mockResolvedValue({ data: null, error: { message: 'missing' } })
    const ticketEq = jest.fn().mockReturnValue({ single: ticketSingle })
    const ticketSelect = jest.fn().mockReturnValue({ eq: ticketEq })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      tables: { support_tickets: [{ select: ticketSelect }] },
    }))
    const formData = new FormData()
    formData.append('file', new File(['image'], 'proof.png', { type: 'image/png' }))

    await expect(uploadSupportAttachment('ticket-1', formData)).resolves.toEqual({ error: 'Ticket no encontrado' })
  })

  it('rechaza adjuntos permitidos que superan 10 MB', async () => {
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase())
    const formData = new FormData()
    const largeFile = new File(['x'], 'large.png', { type: 'image/png' })
    Object.defineProperty(largeFile, 'size', { value: 10 * 1024 * 1024 + 1 })
    formData.append('file', largeFile)

    await expect(uploadSupportAttachment('ticket-1', formData)).resolves.toEqual({
      error: 'El archivo no puede superar 10 MB',
    })
  })

  it('rechaza adjuntos cuando el ticket pertenece a otro usuario y no es admin', async () => {
    const ticketSingle = jest.fn().mockResolvedValue({
      data: { id: 'ticket-1', status: 'pending', user_id: 'other-user', attachment_count: 0 },
      error: null,
    })
    const ticketEq = jest.fn().mockReturnValue({ single: ticketSingle })
    const ticketSelect = jest.fn().mockReturnValue({ eq: ticketEq })
    const rpc = jest.fn().mockResolvedValue({ data: false, error: null })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      rpc,
      tables: { support_tickets: [{ select: ticketSelect }] },
    }))
    const formData = new FormData()
    formData.append('file', new File(['image'], 'proof.png', { type: 'image/png' }))

    await expect(uploadSupportAttachment('ticket-1', formData)).resolves.toEqual({ error: 'No autorizado' })
  })

  it('rechaza adjuntos para tickets finalizados', async () => {
    const ticketSingle = jest.fn().mockResolvedValue({
      data: { id: 'ticket-1', status: 'finalized', user_id: 'user-123', attachment_count: 0 },
      error: null,
    })
    const ticketEq = jest.fn().mockReturnValue({ single: ticketSingle })
    const ticketSelect = jest.fn().mockReturnValue({ eq: ticketEq })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      tables: { support_tickets: [{ select: ticketSelect }] },
    }))
    const formData = new FormData()
    formData.append('file', new File(['image'], 'proof.png', { type: 'image/png' }))

    await expect(uploadSupportAttachment('ticket-1', formData)).resolves.toEqual({
      error: 'El ticket está finalizado',
    })
  })

  it('propaga errores de storage al subir adjuntos', async () => {
    const ticketSingle = jest.fn().mockResolvedValue({
      data: { id: 'ticket-1', status: 'pending', user_id: 'user-123', attachment_count: 0 },
      error: null,
    })
    const ticketEq = jest.fn().mockReturnValue({ single: ticketSingle })
    const ticketSelect = jest.fn().mockReturnValue({ eq: ticketEq })
    const upload = jest.fn().mockResolvedValue({ error: { message: 'Storage caído' } })
    const storageFrom = jest.fn().mockReturnValue({ upload })
    const rpc = jest.fn().mockResolvedValue({ data: false, error: null })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      rpc,
      storage: { from: storageFrom },
      tables: { support_tickets: [{ select: ticketSelect }] },
    }))
    const formData = new FormData()
    formData.append('file', new File(['image'], 'proof.png', { type: 'image/png' }))

    await expect(uploadSupportAttachment('ticket-1', formData)).resolves.toEqual({ error: 'Storage caído' })
  })

  it('sube adjunto permitido, registra metadata y actualiza contador', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000)
    const ticketSingle = jest.fn().mockResolvedValue({
      data: { id: 'ticket-1', status: 'pending', user_id: 'user-123', attachment_count: 2 },
      error: null,
    })
    const ticketEq = jest.fn().mockReturnValue({ single: ticketSingle })
    const ticketSelect = jest.fn().mockReturnValue({ eq: ticketEq })
    const attachmentSingle = jest.fn().mockResolvedValue({
      data: { id: 'attachment-1', storage_path: 'user-123/ticket-1/1700000000000.png' },
      error: null,
    })
    const attachmentSelect = jest.fn().mockReturnValue({ single: attachmentSingle })
    const attachmentInsert = jest.fn().mockReturnValue({ select: attachmentSelect })
    const updateEq = jest.fn().mockResolvedValue({ error: null })
    const update = jest.fn().mockReturnValue({ eq: updateEq })
    const upload = jest.fn().mockResolvedValue({ error: null })
    const storageFrom = jest.fn().mockReturnValue({ upload })
    const rpc = jest.fn().mockResolvedValue({ data: false, error: null })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      rpc,
      storage: { from: storageFrom },
      tables: {
        support_tickets: [{ select: ticketSelect }, { update }],
        support_attachments: [{ insert: attachmentInsert }],
      },
    }))
    const formData = new FormData()
    formData.append('file', new File(['image'], 'proof.png', { type: 'image/png' }))

    await expect(uploadSupportAttachment('ticket-1', formData)).resolves.toEqual({
      data: { id: 'attachment-1', storage_path: 'user-123/ticket-1/1700000000000.png' },
    })
    expect(storageFrom).toHaveBeenCalledWith('support-attachments')
    expect(upload).toHaveBeenCalledWith('user-123/ticket-1/1700000000000.png', expect.any(File))
    expect(attachmentInsert).toHaveBeenCalledWith(expect.objectContaining({
      ticket_id: 'ticket-1',
      uploaded_by: 'user-123',
      file_name: 'proof.png',
      mime_type: 'image/png',
      size_bytes: 5,
    }))
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ attachment_count: 3 }))
    ;(Date.now as jest.Mock).mockRestore()
  })

  it('permite a un admin adjuntar archivos a tickets de otros usuarios', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1700000000001)
    const ticketSingle = jest.fn().mockResolvedValue({
      data: { id: 'ticket-1', status: 'pending', user_id: 'other-user', attachment_count: 0 },
      error: null,
    })
    const ticketEq = jest.fn().mockReturnValue({ single: ticketSingle })
    const ticketSelect = jest.fn().mockReturnValue({ eq: ticketEq })
    const attachmentSingle = jest.fn().mockResolvedValue({
      data: { id: 'attachment-2', storage_path: 'user-123/ticket-1/1700000000001.pdf' },
      error: null,
    })
    const attachmentSelect = jest.fn().mockReturnValue({ single: attachmentSingle })
    const attachmentInsert = jest.fn().mockReturnValue({ select: attachmentSelect })
    const updateEq = jest.fn().mockResolvedValue({ error: null })
    const update = jest.fn().mockReturnValue({ eq: updateEq })
    const upload = jest.fn().mockResolvedValue({ error: null })
    const storageFrom = jest.fn().mockReturnValue({ upload })
    const rpc = jest.fn().mockResolvedValue({ data: true, error: null })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      rpc,
      storage: { from: storageFrom },
      tables: {
        support_tickets: [{ select: ticketSelect }, { update }],
        support_attachments: [{ insert: attachmentInsert }],
      },
    }))
    const formData = new FormData()
    formData.append('file', new File(['pdf'], 'proof.pdf', { type: 'application/pdf' }))

    await expect(uploadSupportAttachment('ticket-1', formData)).resolves.toEqual({
      data: { id: 'attachment-2', storage_path: 'user-123/ticket-1/1700000000001.pdf' },
    })
    expect(upload).toHaveBeenCalledWith('user-123/ticket-1/1700000000001.pdf', expect.any(File))
    ;(Date.now as jest.Mock).mockRestore()
  })

  it('propaga errores al registrar metadata de adjuntos subidos', async () => {
    const ticketSingle = jest.fn().mockResolvedValue({
      data: { id: 'ticket-1', status: 'pending', user_id: 'user-123', attachment_count: 0 },
      error: null,
    })
    const ticketEq = jest.fn().mockReturnValue({ single: ticketSingle })
    const ticketSelect = jest.fn().mockReturnValue({ eq: ticketEq })
    const attachmentSingle = jest.fn().mockResolvedValue({ data: null, error: { message: 'Metadata fallida' } })
    const attachmentSelect = jest.fn().mockReturnValue({ single: attachmentSingle })
    const attachmentInsert = jest.fn().mockReturnValue({ select: attachmentSelect })
    const upload = jest.fn().mockResolvedValue({ error: null })
    const storageFrom = jest.fn().mockReturnValue({ upload })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      storage: { from: storageFrom },
      tables: {
        support_tickets: [{ select: ticketSelect }],
        support_attachments: [{ insert: attachmentInsert }],
      },
    }))
    const formData = new FormData()
    formData.append('file', new File(['image'], 'proof.png', { type: 'image/png' }))

    await expect(uploadSupportAttachment('ticket-1', formData)).resolves.toEqual({ error: 'Metadata fallida' })
  })

  it('genera URL firmada para adjuntos de soporte', async () => {
    const createSignedUrl = jest.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.test/file' }, error: null })
    const storageFrom = jest.fn().mockReturnValue({ createSignedUrl })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      storage: { from: storageFrom },
    }))

    await expect(getSupportAttachmentUrl('user-123/ticket-1/proof.png')).resolves.toEqual({
      data: 'https://signed.test/file',
    })
    expect(createSignedUrl).toHaveBeenCalledWith('user-123/ticket-1/proof.png', 3600)
  })

  it('devuelve error cuando storage no genera URL firmada', async () => {
    const createSignedUrl = jest.fn().mockResolvedValue({ data: {}, error: null })
    const storageFrom = jest.fn().mockReturnValue({ createSignedUrl })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      storage: { from: storageFrom },
    }))

    await expect(getSupportAttachmentUrl('user-123/ticket-1/proof.png')).resolves.toEqual({
      error: 'No se pudo generar URL',
    })
  })

  it('propaga errores de storage al generar URL firmada', async () => {
    const createSignedUrl = jest.fn().mockResolvedValue({ data: null, error: { message: 'URL no disponible' } })
    const storageFrom = jest.fn().mockReturnValue({ createSignedUrl })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      storage: { from: storageFrom },
    }))

    await expect(getSupportAttachmentUrl('user-123/ticket-1/proof.png')).resolves.toEqual({
      error: 'URL no disponible',
    })
  })

  it('rechaza appendSupportMessage cuando no hay usuario autenticado', async () => {
    const supabase = queuedSupabase({ authUser: null })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(appendSupportMessage('ticket-1', 'Hola soporte')).resolves.toEqual({ error: 'No autenticado' })
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('rechaza closeSupportTicket cuando no hay usuario autenticado', async () => {
    const supabase = queuedSupabase({ authUser: null })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(closeSupportTicket('ticket-1')).resolves.toEqual({ error: 'No autenticado' })
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('rechaza getSupportTicket cuando no hay usuario autenticado', async () => {
    const supabase = queuedSupabase({ authUser: null })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getSupportTicket('ticket-1')).resolves.toEqual({ error: 'No autenticado' })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('rechaza getSupportTicketHistory cuando no hay usuario autenticado', async () => {
    const supabase = queuedSupabase({ authUser: null })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getSupportTicketHistory('ticket-1')).resolves.toEqual({ error: 'No autenticado' })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('rechaza listUserTickets cuando no hay usuario autenticado', async () => {
    const supabase = queuedSupabase({ authUser: null })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(listUserTickets()).resolves.toEqual({ error: 'No autenticado' })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('rechaza listAllTickets cuando no hay usuario autenticado', async () => {
    const supabase = queuedSupabase({ authUser: null })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(listAllTickets('pending')).resolves.toEqual({ error: 'No autenticado' })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('rechaza uploadSupportAttachment cuando no hay usuario autenticado', async () => {
    const supabase = queuedSupabase({ authUser: null })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    const formData = new FormData()
    formData.append('file', new File(['image'], 'proof.png', { type: 'image/png' }))

    await expect(uploadSupportAttachment('ticket-1', formData)).resolves.toEqual({ error: 'No autenticado' })
    expect(supabase.from).not.toHaveBeenCalled()
    expect(supabase.storage).toBeUndefined()
  })

  it('rechaza getSupportAttachmentUrl cuando no hay usuario autenticado', async () => {
    const supabase = queuedSupabase({ authUser: null })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getSupportAttachmentUrl('user-123/ticket-1/proof.png')).resolves.toEqual({ error: 'No autenticado' })
    expect(supabase.storage).toBeUndefined()
  })

  it('asigna rol player por defecto cuando appendSupportMessage omite from y el caller no es admin', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: false, error: null })
      .mockResolvedValueOnce({ data: { success: true, message_id: 'message-player' }, error: null })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ rpc }))

    await expect(appendSupportMessage('ticket-1', 'Mensaje del jugador')).resolves.toEqual({
      data: { message_id: 'message-player', from: 'player' },
    })
    expect(rpc).toHaveBeenNthCalledWith(2, 'append_support_message', {
      p_ticket_id: 'ticket-1',
      p_message: 'Mensaje del jugador',
      p_from_admin: false,
    })
  })

  it('usa extension bin cuando el archivo adjunto no tiene extension', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1700000000002)
    const ticketSingle = jest.fn().mockResolvedValue({
      data: { id: 'ticket-1', status: 'pending', user_id: 'user-123', attachment_count: 0 },
      error: null,
    })
    const ticketEq = jest.fn().mockReturnValue({ single: ticketSingle })
    const ticketSelect = jest.fn().mockReturnValue({ eq: ticketEq })
    const attachmentSingle = jest.fn().mockResolvedValue({
      data: { id: 'attachment-bin', storage_path: 'user-123/ticket-1/1700000000002.bin' },
      error: null,
    })
    const attachmentSelect = jest.fn().mockReturnValue({ single: attachmentSingle })
    const attachmentInsert = jest.fn().mockReturnValue({ select: attachmentSelect })
    const updateEq = jest.fn().mockResolvedValue({ error: null })
    const update = jest.fn().mockReturnValue({ eq: updateEq })
    const upload = jest.fn().mockResolvedValue({ error: null })
    const storageFrom = jest.fn().mockReturnValue({ upload })
    const rpc = jest.fn().mockResolvedValue({ data: false, error: null })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({
      rpc,
      storage: { from: storageFrom },
      tables: {
        support_tickets: [{ select: ticketSelect }, { update }],
        support_attachments: [{ insert: attachmentInsert }],
      },
    }))
    const formData = new FormData()
    formData.append('file', new File(['x'], '', { type: 'image/png' }))

    await expect(uploadSupportAttachment('ticket-1', formData)).resolves.toEqual({
      data: { id: 'attachment-bin', storage_path: 'user-123/ticket-1/1700000000002.bin' },
    })
    expect(upload).toHaveBeenCalledWith('user-123/ticket-1/1700000000002.bin', expect.any(File))
    ;(Date.now as jest.Mock).mockRestore()
  })
})
