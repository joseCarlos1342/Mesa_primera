import { appendIssueTicketMessage, closeIssueTicket, getIssueTicketAttachmentUrl, listAdminIssueTickets, listPlayerIssueTickets, uploadIssueTicketImage } from '../admin-issues'
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

  it('permite al propietario cerrar su consulta', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: { success: true }, error: null })
    const supabase = { auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'player-1' } } }) }, rpc, from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { role: 'player' } }) }) }) }) }
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(closeIssueTicket('123e4567-e89b-12d3-a456-426614174000')).resolves.toEqual({ data: undefined })
    expect(rpc).toHaveBeenCalledWith('close_issue_ticket', { p_ticket_id: '123e4567-e89b-12d3-a456-426614174000' })
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
})
