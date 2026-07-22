import {
  appendIssueTicketMessage,
  closeIssueTicket,
  countAdminArchivedIssueTickets,
  getAdminIssueMessages,
  getAdminIssueTicket,
  getIssueTicketAttachmentUrl,
  listAdminArchivedIssueTickets,
  listAdminIssueTickets,
  listIssueTicketAttachments,
  getPlayerIssueMessages,
  listPlayerIssueTickets,
  uploadIssueTicketImage,
} from '../admin-issues'
import { createClient } from '@/utils/supabase/server'

jest.mock('@/utils/supabase/server', () => ({ createClient: jest.fn() }))

describe('listAdminIssueTickets', () => {
  it('devuelve reclamos formales para un administrador', async () => {
    const limit = jest.fn().mockResolvedValue({ data: [{ id: 'issue-1', category: 'deposit_missing' }], error: null })
    const order = jest.fn().mockReturnValue({ limit })
    const eq = jest.fn().mockReturnValue({ order })
    const select = jest.fn().mockReturnValue({ eq })
    const single = jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null })
    const roleQuery = { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single }) }) }
    const supabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      from: jest.fn((table: string) => table === 'profiles' ? roleQuery : { select }),
    }
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(listAdminIssueTickets()).resolves.toEqual({ data: [{ id: 'issue-1', category: 'deposit_missing' }] })
    expect(supabase.from).toHaveBeenCalledWith('issue_tickets')
  })

  it('bloquea la bandeja para usuarios no administradores', async () => {
    const single = jest.fn().mockResolvedValue({ data: { role: 'player' }, error: null })
    const supabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'player-1' } } }) },
      from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single }) }) }),
    }
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(listAdminIssueTickets()).resolves.toEqual({ error: 'Acceso denegado' })
  })

  it('devuelve errores seguros de archivos y conteos administrativos', async () => {
    const archivedLimit = jest.fn().mockResolvedValue({ data: null, error: { message: 'db error' } })
    const archivedOrder = jest.fn().mockReturnValue({ limit: archivedLimit })
    const archivedIn = jest.fn().mockReturnValue({ order: archivedOrder })
    const archivedSelect = jest.fn().mockReturnValue({ in: archivedIn })
    const countIn = jest.fn().mockResolvedValue({ count: null, error: null })
    const countSelect = jest.fn().mockReturnValue({ in: countIn })
    const roleSingle = jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null })
    const roleQuery = { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: roleSingle }) }) }
    const supabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      from: jest.fn((table: string) => {
        if (table === 'profiles') return roleQuery
        return { select: jest.fn((_: string, options?: { head?: boolean }) => options?.head ? countSelect() : archivedSelect()) }
      }),
    }
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(listAdminArchivedIssueTickets()).resolves.toEqual({ error: 'No fue posible cargar el archivo' })
    await expect(countAdminArchivedIssueTickets()).resolves.toEqual({ data: 0 })
    expect(archivedIn).toHaveBeenCalledWith('status', ['investigating', 'resolved', 'closed'])
    expect(countIn).toHaveBeenCalledWith('status', ['investigating', 'resolved', 'closed'])
  })

  it('rechaza la bandeja archivada cuando la sesión es anónima', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    })

    await expect(listAdminArchivedIssueTickets()).resolves.toEqual({ error: 'No autenticado' })
  })

  it('rechaza el conteo archivado para un usuario sin rol admin', async () => {
    const single = jest.fn().mockResolvedValue({ data: { role: 'player' }, error: null })
    const supabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'player-1' } } }) },
      from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single }) }) }),
    }
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(countAdminArchivedIssueTickets()).resolves.toEqual({ error: 'Acceso denegado' })
  })

  it('protege la lectura administrativa de consultas y mensajes inexistentes', async () => {
    const ticketSingle = jest.fn().mockResolvedValue({ data: null, error: null })
    const messageOrder = jest.fn().mockResolvedValue({ data: null, error: { message: 'db error' } })
    const roleSingle = jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null })
    const supabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      from: jest.fn((table: string) => {
        if (table === 'profiles') return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: roleSingle }) }) }
        if (table === 'issue_tickets') return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: ticketSingle }) }) }
        return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ order: messageOrder }) }) }
      }),
    }
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getAdminIssueTicket('missing-ticket')).resolves.toEqual({ error: 'Consulta no encontrada' })
    await expect(getAdminIssueMessages('ticket-1')).resolves.toEqual({ error: 'No fue posible cargar el historial' })
  })

  it('devuelve detalle, mensajes y adjuntos autorizados para consultas existentes', async () => {
    const issue = { id: 'ticket-1', status: 'open' }
    const messages = [{ id: 'message-1', ticket_id: 'ticket-1', message: 'Necesito ayuda', from_admin: false }]
    const attachments = [{ id: 'attachment-1', ticket_id: 'ticket-1', file_name: 'comprobante.png' }]
    const roleSingle = jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null })
    const supabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      from: jest.fn((table: string) => {
        if (table === 'profiles') return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: roleSingle }) }) }
        if (table === 'issue_tickets') return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: issue, error: null }) }) }) }
        if (table === 'issue_ticket_messages') return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ order: jest.fn().mockResolvedValue({ data: messages, error: null }) }) }) }
        return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ order: jest.fn().mockResolvedValue({ data: attachments, error: null }) }) }) }
      }),
    }
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getAdminIssueTicket('ticket-1')).resolves.toEqual({ data: issue })
    await expect(getPlayerIssueMessages('ticket-1')).resolves.toEqual({ data: messages })
    await expect(listIssueTicketAttachments('ticket-1')).resolves.toEqual({ data: attachments })
  })

  it('lista los reclamos propios del jugador', async () => {
    const limit = jest.fn().mockResolvedValue({ data: [{ id: 'issue-1', status: 'open' }], error: null })
    const order = jest.fn().mockReturnValue({ limit })
    const eq = jest.fn().mockReturnValue({ order })
    const select = jest.fn().mockReturnValue({ eq })
    const supabase = { auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'player-1' } } }) }, from: jest.fn().mockReturnValue({ select }) }
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(listPlayerIssueTickets()).resolves.toEqual({ data: [{ id: 'issue-1', status: 'open' }] })
    expect(eq).toHaveBeenCalledWith('user_id', 'player-1')
  })

  it('agrega una respuesta administrativa con la RPC del caso', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: { success: true, message_id: 'message-1' }, error: null })
    const single = jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null })
    const supabase = { auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) }, rpc, from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single }) }) }) }
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(appendIssueTicketMessage('123e4567-e89b-12d3-a456-426614174000', 'Estamos revisando el caso.')).resolves.toEqual({ data: { message_id: 'message-1' } })
    expect(rpc).toHaveBeenCalledWith('append_issue_ticket_message', expect.objectContaining({ p_from_admin: true }))
  })

  it('rechaza respuestas inválidas y fallos de RPC sin exponer detalles internos', async () => {
    await expect(appendIssueTicketMessage('ticket-1', '   ')).resolves.toEqual({ error: 'El mensaje es inválido' })
    await expect(appendIssueTicketMessage('ticket-1', 'x'.repeat(5001))).resolves.toEqual({ error: 'El mensaje es inválido' })

    const rpc = jest.fn().mockResolvedValue({ data: { success: false, error: 'Caso cerrado' }, error: null })
    const single = jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null })
    const supabase = { auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) }, rpc, from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single }) }) }) }
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(appendIssueTicketMessage('ticket-1', 'Respuesta')).resolves.toEqual({ error: 'Caso cerrado' })
  })

  it('usa errores seguros cuando la RPC no devuelve éxito ni identificador', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: { success: false }, error: null })
      .mockResolvedValueOnce({ data: { success: true }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'detalle interno' } })
    const single = jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null })
    const supabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      rpc,
      from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single }) }) }),
    }
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(appendIssueTicketMessage('ticket-1', 'Respuesta')).resolves.toEqual({ error: 'No fue posible enviar la respuesta' })
    await expect(appendIssueTicketMessage('ticket-1', 'Respuesta')).resolves.toEqual({ error: 'No fue posible enviar la respuesta' })
    await expect(appendIssueTicketMessage('ticket-1', 'Respuesta')).resolves.toEqual({ error: 'No fue posible enviar la respuesta' })
  })

  it('permite al propietario cerrar su consulta', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: { success: true }, error: null })
    const supabase = { auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'player-1' } } }) }, rpc, from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { role: 'player' } }) }) }) }) }
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(closeIssueTicket('123e4567-e89b-12d3-a456-426614174000')).resolves.toEqual({ data: undefined })
    expect(rpc).toHaveBeenCalledWith('close_issue_ticket', { p_ticket_id: '123e4567-e89b-12d3-a456-426614174000' })
  })

  it('rechaza cierre anónimo y devuelve el mensaje seguro de la RPC', async () => {
    const anonymous = { auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) } }
    ;(createClient as jest.Mock).mockResolvedValue(anonymous)
    await expect(closeIssueTicket('ticket-1')).resolves.toEqual({ error: 'No autenticado' })

    const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'detalle interno' } })
    ;(createClient as jest.Mock).mockResolvedValue({ auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'player-1' } } }) }, rpc })
    await expect(closeIssueTicket('ticket-1')).resolves.toEqual({ error: 'No fue posible cerrar la consulta' })
  })

  it('mapea el rechazo de dominio al cerrar una consulta', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: { success: false, error: 'La consulta ya está cerrada' }, error: null })
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'player-1' } } }) },
      rpc,
    })

    await expect(closeIssueTicket('ticket-1')).resolves.toEqual({ error: 'La consulta ya está cerrada' })
  })

  it('rechaza una imagen sin descripción antes de subirla', async () => {
    jest.clearAllMocks()
    const formData = new FormData()
    formData.append('file', new File(['image'], 'prueba.png', { type: 'image/png' }))
    formData.append('description', '   ')
    await expect(uploadIssueTicketImage('123e4567-e89b-12d3-a456-426614174000', formData)).resolves.toEqual({ error: 'Describe qué muestra esta imagen' })
    expect(createClient).not.toHaveBeenCalled()
  })

  it('elimina el objeto de Storage si falla guardar metadata del adjunto', async () => {
    const formData = new FormData()
    formData.append('file', new File(['image'], 'prueba.png', { type: 'image/png' }))
    formData.append('description', 'Comprobante de transferencia bancaria')
    const remove = jest.fn().mockResolvedValue({ error: null })
    const upload = jest.fn().mockResolvedValue({ error: null })
    const singleTicket = jest.fn().mockResolvedValue({ data: { user_id: 'player-1' } })
    const singleProfile = jest.fn().mockResolvedValue({ data: { role: 'player' } })
    const attachmentInsert = jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: null, error: { message: 'falló metadata' } }) }) })
    const supabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'player-1' } } }) },
      storage: { from: jest.fn().mockReturnValue({ upload, remove }) },
      from: jest.fn((table: string) => {
        if (table === 'issue_tickets') return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: singleTicket }) }) }
        if (table === 'profiles') return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: singleProfile }) }) }
        return { insert: attachmentInsert }
      }),
    }
    ;(createClient as jest.Mock).mockResolvedValue(supabase)
    await expect(uploadIssueTicketImage('123e4567-e89b-12d3-a456-426614174000', formData)).resolves.toEqual({ error: 'No fue posible registrar la imagen' })
    expect(remove).toHaveBeenCalledTimes(1)
  })

  it('rechaza formatos, tamaños y descripciones inválidas antes de tocar Supabase', async () => {
    jest.clearAllMocks()
    const invalidType = new FormData()
    invalidType.append('file', new File(['text'], 'nota.txt', { type: 'text/plain' }))
    invalidType.append('description', 'Archivo')
    await expect(uploadIssueTicketImage('ticket-1', invalidType)).resolves.toEqual({ error: 'La imagen debe ser JPG, PNG o WebP y pesar máximo 10 MB' })

    const tooLarge = new FormData()
    tooLarge.append('file', new File([new Uint8Array(1)], 'grande.png', { type: 'image/png' }))
    Object.defineProperty(tooLarge.get('file'), 'size', { value: 10 * 1024 * 1024 + 1 })
    tooLarge.append('description', 'Archivo')
    await expect(uploadIssueTicketImage('ticket-1', tooLarge)).resolves.toEqual({ error: 'La imagen debe ser JPG, PNG o WebP y pesar máximo 10 MB' })

    const longDescription = new FormData()
    longDescription.append('file', new File(['image'], 'imagen.png', { type: 'image/png' }))
    longDescription.append('description', 'x'.repeat(1001))
    await expect(uploadIssueTicketImage('ticket-1', longDescription)).resolves.toEqual({ error: 'La descripción es demasiado larga' })
    expect(createClient).not.toHaveBeenCalled()
  })

  it('rechaza adjuntos anónimos, ajenos, cerrados y fallos de upload', async () => {
    const formData = new FormData()
    formData.append('file', new File(['image'], 'imagen.png', { type: 'image/png' }))
    formData.append('description', 'Comprobante válido')

    ;(createClient as jest.Mock).mockResolvedValueOnce({ auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) } })
    await expect(uploadIssueTicketImage('ticket-1', formData)).resolves.toEqual({ error: 'No autenticado' })

    const ticket = jest.fn().mockResolvedValue({ data: { user_id: 'owner', status: 'open' } })
    const profile = jest.fn().mockResolvedValue({ data: { role: 'player' } })
    const storageFrom = jest.fn().mockReturnValue({ upload: jest.fn().mockResolvedValue({ error: { message: 'storage down' } }) })
    const base = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'other' } } }) },
      storage: { from: storageFrom },
      from: jest.fn((table: string) => ({ select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: table === 'issue_tickets' ? ticket : profile }) }) })),
    }
    ;(createClient as jest.Mock).mockResolvedValueOnce(base)
    await expect(uploadIssueTicketImage('ticket-1', formData)).resolves.toEqual({ error: 'Acceso denegado' })
    expect(storageFrom).not.toHaveBeenCalled()

    ticket.mockResolvedValueOnce({ data: { user_id: 'other', status: 'closed' } })
    ;(createClient as jest.Mock).mockResolvedValueOnce({ ...base, auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'other' } } }) } })
    await expect(uploadIssueTicketImage('ticket-1', formData)).resolves.toEqual({ error: 'La consulta está cerrada' })
    expect(storageFrom).not.toHaveBeenCalled()
  })

  it('devuelve error seguro cuando falla la subida a Storage', async () => {
    const upload = jest.fn().mockResolvedValue({ error: { message: 'storage down' } })
    const storageFrom = jest.fn().mockReturnValue({ upload })
    const formData = new FormData()
    formData.append('file', new File(['image'], 'imagen.png', { type: 'image/png' }))
    formData.append('description', 'Comprobante válido')
    const supabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'owner' } } }) },
      storage: { from: storageFrom },
      from: jest.fn((table: string) => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: table === 'issue_tickets' ? { user_id: 'owner', status: 'open' } : { role: 'player' }, error: null }),
          }),
        }),
      })),
    }
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(uploadIssueTicketImage('ticket-1', formData)).resolves.toEqual({ error: 'No fue posible subir la imagen' })
    expect(storageFrom).toHaveBeenCalledWith('issue-attachments')
    expect(upload).toHaveBeenCalledWith(expect.stringMatching(/^owner\/ticket-1\/.*\.png$/), expect.any(File))
  })

  it('registra la imagen y deja un mensaje de historial al subirla', async () => {
    const formData = new FormData()
    formData.append('file', new File(['image'], 'prueba.png', { type: 'image/png' }))
    formData.append('description', 'Comprobante de transferencia')
    const upload = jest.fn().mockResolvedValue({ error: null })
    const rpc = jest.fn().mockResolvedValue({ data: { success: true }, error: null })
    const supabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'player-1' } } }) },
      storage: { from: jest.fn().mockReturnValue({ upload }) },
      rpc,
      from: jest.fn((table: string) => {
        if (table === 'issue_tickets') return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { user_id: 'player-1', status: 'open' } }) }) }) }
        if (table === 'profiles') return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { role: 'player' } }) }) }) }
        return { insert: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { id: 'attachment-1', file_name: 'prueba.png' }, error: null }) }) }) }
      }),
    }
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(uploadIssueTicketImage('ticket-1', formData)).resolves.toEqual({ data: { id: 'attachment-1', file_name: 'prueba.png' } })
    expect(rpc).toHaveBeenCalledWith('append_issue_ticket_message', expect.objectContaining({ p_from_admin: false }))
  })

  it('permite al administrador adjuntar evidencia en una consulta ajena', async () => {
    const formData = new FormData()
    formData.append('file', new File(['image'], 'evidencia.webp', { type: 'image/webp' }))
    formData.append('description', 'Evidencia aportada por soporte')
    const upload = jest.fn().mockResolvedValue({ error: null })
    const insert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: { id: 'attachment-admin', file_name: 'evidencia.webp' }, error: null }),
      }),
    })
    const rpc = jest.fn().mockResolvedValue({ data: { success: true }, error: null })
    const storageFrom = jest.fn().mockReturnValue({ upload })
    const supabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      storage: { from: storageFrom },
      rpc,
      from: jest.fn((table: string) => {
        if (table === 'issue_tickets') return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { user_id: 'player-1', status: 'open' } }) }) }) }
        if (table === 'profiles') return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { role: 'admin' } }) }) }) }
        return { insert }
      }),
    }
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(uploadIssueTicketImage('ticket-1', formData)).resolves.toEqual({ data: { id: 'attachment-admin', file_name: 'evidencia.webp' } })
    expect(storageFrom).toHaveBeenCalledWith('issue-attachments')
    expect(upload).toHaveBeenCalledWith(expect.stringMatching(/^admin-1\/ticket-1\/.*\.webp$/), expect.any(File))
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ uploaded_by: 'admin-1', mime_type: 'image/webp', description: 'Evidencia aportada por soporte' }))
    expect(rpc).toHaveBeenCalledWith('append_issue_ticket_message', expect.objectContaining({ p_from_admin: true }))
  })

  it('genera URL firmada para el propietario autorizado', async () => {
    const createSignedUrl = jest.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.example/image.png' }, error: null })
    const attachment = { id: 'attachment-1', ticket_id: 'ticket-1', storage_path: 'player-1/ticket-1/image.png', uploaded_by: 'player-1', file_name: 'image.png', description: 'Comprobante', mime_type: 'image/png', size_bytes: 10, created_at: '2026-07-13T00:00:00Z' }
    const supabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'player-1' } } }) },
      storage: { from: jest.fn().mockReturnValue({ createSignedUrl }) },
      from: jest.fn((table: string) => {
        if (table === 'issue_ticket_attachments') return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: attachment, error: null }) }) }) }
        if (table === 'issue_tickets') return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { user_id: 'player-1' }, error: null }) }) }) }
        return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { role: 'player' }, error: null }) }) }) }
      }),
    }
    ;(createClient as jest.Mock).mockResolvedValue(supabase)
    await expect(getIssueTicketAttachmentUrl('attachment-1')).resolves.toEqual({ data: 'https://signed.example/image.png' })
  })

  it('rechaza URL firmada para un usuario ajeno y cuando Storage no devuelve URL', async () => {
    const attachment = { ticket_id: 'ticket-1', storage_path: 'private/image.png' }
    const attachmentQuery = { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: attachment, error: null }) }) }) }
    const ticketQuery = { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { user_id: 'owner' }, error: null }) }) }) }
    const profileQuery = { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { role: 'player' }, error: null }) }) }) }
    const supabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'other' } } }) },
      from: jest.fn((table: string) => table === 'issue_ticket_attachments' ? attachmentQuery : table === 'issue_tickets' ? ticketQuery : profileQuery),
      storage: { from: jest.fn().mockReturnValue({ createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: null }, error: null }) }) },
    }
    ;(createClient as jest.Mock).mockResolvedValueOnce(supabase)
    await expect(getIssueTicketAttachmentUrl('attachment-1')).resolves.toEqual({ error: 'Acceso denegado' })

    const ownerSupabase = { ...supabase, auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'owner' } } }) } }
    ;(createClient as jest.Mock).mockResolvedValueOnce(ownerSupabase)
    await expect(getIssueTicketAttachmentUrl('attachment-1')).resolves.toEqual({ error: 'No fue posible abrir la imagen' })
  })
})
