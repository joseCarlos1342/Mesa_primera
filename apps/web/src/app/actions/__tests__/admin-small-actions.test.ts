import { getServerAlerts, getUnresolvedAlertCount, resolveAlert } from '../admin-server-alerts'
import { getRulebook, updateRulebook } from '../admin-settings'
import { generateSupervisionToken } from '../admin-supervision'
import { createClient } from '@/utils/supabase/server'
import { redis } from '@/utils/redis'
import { logAdminAction } from '../admin-audit'

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/utils/redis', () => ({
  redis: {
    setex: jest.fn(),
  },
}))

jest.mock('../admin-audit', () => ({
  logAdminAction: jest.fn(),
}))

const adminUser = { id: 'admin-123' }

function buildAuth(user: { id: string } | null = adminUser, error: unknown = null) {
  return {
    getUser: jest.fn().mockResolvedValue({ data: { user }, error }),
  }
}

function roleQuery(role: string | null = 'admin') {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: role ? { role } : null, error: null }),
  }
}

function queuedSupabase(queues: Record<string, unknown[]>, auth = buildAuth()) {
  return {
    auth,
    from: jest.fn((table: string) => {
      const query = queues[table]?.shift()
      if (!query) throw new Error(`Unexpected table query: ${table}`)
      return query
    }),
  }
}

describe('admin server alert actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('lista alertas del servidor para admins con límite explícito', async () => {
    const alerts = [
      {
        id: 'alert-1',
        severity: 'critical',
        category: 'room',
        title: 'Room stalled',
        message: null,
        metadata: {},
        room_id: 'room-1',
        game_id: null,
        player_id: null,
        resolved: false,
        resolved_at: null,
        resolved_by: null,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ]
    const limit = jest.fn().mockResolvedValue({ data: alerts, error: null })
    const order = jest.fn().mockReturnValue({ limit })
    const select = jest.fn().mockReturnValue({ order })
    const supabase = queuedSupabase({
      profiles: [roleQuery('admin')],
      server_alerts: [{ select }],
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getServerAlerts(25)).resolves.toEqual(alerts)
    expect(supabase.from).toHaveBeenCalledWith('server_alerts')
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(limit).toHaveBeenCalledWith(25)
  })

  it('devuelve lista vacia cuando no hay alertas del servidor', async () => {
    const limit = jest.fn().mockResolvedValue({ data: null, error: null })
    const order = jest.fn().mockReturnValue({ limit })
    const select = jest.fn().mockReturnValue({ order })
    const supabase = queuedSupabase({
      profiles: [roleQuery('admin')],
      server_alerts: [{ select }],
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getServerAlerts()).resolves.toEqual([])
    expect(limit).toHaveBeenCalledWith(100)
  })

  it('rechaza consultas de alertas sin usuario autenticado', async () => {
    const supabase = queuedSupabase({}, buildAuth(null))
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getServerAlerts()).rejects.toThrow('No autenticado')
  })

  it('bloquea consultas de alertas si el usuario no es admin', async () => {
    const supabase = queuedSupabase({ profiles: [roleQuery('player')] })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getServerAlerts()).rejects.toThrow('Acceso denegado')
    expect(supabase.from).not.toHaveBeenCalledWith('server_alerts')
  })

  it('propaga errores al listar alertas del servidor', async () => {
    const limit = jest.fn().mockResolvedValue({ data: null, error: { message: 'Alertas no disponibles' } })
    const order = jest.fn().mockReturnValue({ limit })
    const select = jest.fn().mockReturnValue({ order })
    const supabase = queuedSupabase({
      profiles: [roleQuery('admin')],
      server_alerts: [{ select }],
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getServerAlerts()).rejects.toEqual({ message: 'Alertas no disponibles' })
  })

  it('resuelve alertas y registra auditoría del admin', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null })
    const update = jest.fn().mockReturnValue({ eq })
    const supabase = queuedSupabase({
      profiles: [roleQuery('admin')],
      server_alerts: [{ update }],
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(resolveAlert('alert-1')).resolves.toBeUndefined()
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      resolved: true,
      resolved_by: 'admin-123',
    }))
    expect(eq).toHaveBeenCalledWith('id', 'alert-1')
    expect(logAdminAction).toHaveBeenCalledWith('admin-123', 'alert_resolved', 'server_alert', 'alert-1', {}, { context: 'alerts' })
  })

  it('propaga errores al resolver alertas', async () => {
    const eq = jest.fn().mockResolvedValue({ error: { message: 'No se pudo resolver' } })
    const update = jest.fn().mockReturnValue({ eq })
    const supabase = queuedSupabase({
      profiles: [roleQuery('admin')],
      server_alerts: [{ update }],
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(resolveAlert('alert-1')).rejects.toEqual({ message: 'No se pudo resolver' })
    expect(logAdminAction).not.toHaveBeenCalled()
  })

  it('cuenta cero alertas sin resolver cuando Supabase devuelve count null', async () => {
    const eq = jest.fn().mockResolvedValue({ count: null, error: null })
    const select = jest.fn().mockReturnValue({ eq })
    const supabase = queuedSupabase({
      profiles: [roleQuery('admin')],
      server_alerts: [{ select }],
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getUnresolvedAlertCount()).resolves.toBe(0)
    expect(select).toHaveBeenCalledWith('*', { count: 'exact', head: true })
    expect(eq).toHaveBeenCalledWith('resolved', false)
  })

  it('devuelve el conteo de alertas sin resolver', async () => {
    const eq = jest.fn().mockResolvedValue({ count: 7, error: null })
    const select = jest.fn().mockReturnValue({ eq })
    const supabase = queuedSupabase({
      profiles: [roleQuery('admin')],
      server_alerts: [{ select }],
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getUnresolvedAlertCount()).resolves.toBe(7)
  })

  it('propaga errores al contar alertas sin resolver', async () => {
    const eq = jest.fn().mockResolvedValue({ count: null, error: { message: 'Conteo fallido' } })
    const select = jest.fn().mockReturnValue({ eq })
    const supabase = queuedSupabase({
      profiles: [roleQuery('admin')],
      server_alerts: [{ select }],
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getUnresolvedAlertCount()).rejects.toEqual({ message: 'Conteo fallido' })
  })
})

describe('admin settings actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('devuelve el rulebook publicado desde site_settings', async () => {
    const single = jest.fn().mockResolvedValue({ data: { value: { content: 'Reglas vigentes' } }, error: null })
    const eq = jest.fn().mockReturnValue({ single })
    const select = jest.fn().mockReturnValue({ eq })
    const supabase = queuedSupabase({ site_settings: [{ select }] })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(getRulebook()).resolves.toBe('Reglas vigentes')
    expect(eq).toHaveBeenCalledWith('id', 'rulebook')
  })

  it('devuelve string vacio cuando el rulebook no tiene contenido', async () => {
    const single = jest.fn().mockResolvedValue({ data: { value: {} }, error: null })
    const eq = jest.fn().mockReturnValue({ single })
    const select = jest.fn().mockReturnValue({ eq })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ site_settings: [{ select }] }))

    await expect(getRulebook()).resolves.toBe('')
  })

  it('usa texto de carga si no puede leer el rulebook', async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } })
    const eq = jest.fn().mockReturnValue({ single })
    const select = jest.fn().mockReturnValue({ eq })
    ;(createClient as jest.Mock).mockResolvedValue(queuedSupabase({ site_settings: [{ select }] }))

    await expect(getRulebook()).resolves.toBe('Cargando reglas...')
  })

  it('actualiza el rulebook como admin y audita antes/después', async () => {
    const currentSingle = jest.fn().mockResolvedValue({ data: { value: { content: 'Reglas anteriores' } }, error: null })
    const currentEq = jest.fn().mockReturnValue({ single: currentSingle })
    const currentSelect = jest.fn().mockReturnValue({ eq: currentEq })
    const upsert = jest.fn().mockResolvedValue({ error: null })
    const supabase = queuedSupabase({
      profiles: [roleQuery('admin')],
      site_settings: [{ select: currentSelect }, { upsert }],
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(updateRulebook('Reglas nuevas')).resolves.toEqual({ success: true })
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      id: 'rulebook',
      value: { content: 'Reglas nuevas' },
      updated_by: 'admin-123',
    }))
    expect(logAdminAction).toHaveBeenCalledWith(
      'admin-123',
      'rulebook_updated',
      'setting',
      'rulebook',
      { length: 'Reglas nuevas'.length },
      expect.objectContaining({
        context: 'settings',
        before_state: { content: 'Reglas anteriores' },
        after_state: { content: 'Reglas nuevas' },
      })
    )
  })

  it('rechaza actualizar rulebook sin usuario autenticado', async () => {
    const supabase = queuedSupabase({}, buildAuth(null))
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(updateRulebook('Reglas')).rejects.toThrow('No autenticado')
  })

  it('rechaza actualizar rulebook si el usuario no es admin', async () => {
    const supabase = queuedSupabase({ profiles: [roleQuery('player')] })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(updateRulebook('Reglas')).rejects.toThrow('Acceso denegado')
  })

  it('audita contenido anterior null cuando no hay rulebook previo', async () => {
    const currentSingle = jest.fn().mockResolvedValue({ data: null, error: null })
    const currentEq = jest.fn().mockReturnValue({ single: currentSingle })
    const currentSelect = jest.fn().mockReturnValue({ eq: currentEq })
    const upsert = jest.fn().mockResolvedValue({ error: null })
    const supabase = queuedSupabase({
      profiles: [roleQuery('admin')],
      site_settings: [{ select: currentSelect }, { upsert }],
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(updateRulebook('Reglas nuevas')).resolves.toEqual({ success: true })
    expect(logAdminAction).toHaveBeenCalledWith(
      'admin-123',
      'rulebook_updated',
      'setting',
      'rulebook',
      { length: 'Reglas nuevas'.length },
      expect.objectContaining({ before_state: { content: null } }),
    )
  })

  it('propaga errores al guardar el rulebook', async () => {
    const currentSingle = jest.fn().mockResolvedValue({ data: { value: { content: 'Antes' } }, error: null })
    const currentEq = jest.fn().mockReturnValue({ single: currentSingle })
    const currentSelect = jest.fn().mockReturnValue({ eq: currentEq })
    const upsert = jest.fn().mockResolvedValue({ error: new Error('No se pudo guardar') })
    const supabase = queuedSupabase({
      profiles: [roleQuery('admin')],
      site_settings: [{ select: currentSelect }, { upsert }],
    })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(updateRulebook('Reglas nuevas')).rejects.toThrow('No se pudo guardar')
    expect(logAdminAction).not.toHaveBeenCalled()
  })
})

describe('admin supervision actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(crypto, 'randomUUID').mockReturnValue('token-123')
  })

  afterEach(() => {
    ;(crypto.randomUUID as jest.Mock).mockRestore()
  })

  it('genera un token de supervisión en Redis con TTL de 60 segundos', async () => {
    const supabase = queuedSupabase({ profiles: [roleQuery('admin')] })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(generateSupervisionToken('room-1')).resolves.toEqual({ token: 'token-123' })
    expect(redis.setex).toHaveBeenCalledWith(
      'supervision:room-1:token-123',
      60,
      JSON.stringify({ adminId: 'admin-123', roomId: 'room-1' })
    )
    expect(logAdminAction).toHaveBeenCalledWith('admin-123', 'supervision_token_generated', 'room', 'room-1', { token_ttl: 60 })
  })

  it('rechaza generar token de supervisión sin roomId', async () => {
    const supabase = queuedSupabase({ profiles: [roleQuery('admin')] })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(generateSupervisionToken('')).rejects.toThrow('roomId es obligatorio')
    expect(redis.setex).not.toHaveBeenCalled()
  })

  it('rechaza generar token de supervision sin usuario autenticado', async () => {
    const supabase = queuedSupabase({}, buildAuth(null))
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(generateSupervisionToken('room-1')).rejects.toThrow('No autenticado')
    expect(redis.setex).not.toHaveBeenCalled()
  })

  it('rechaza generar token de supervision si el usuario no es admin', async () => {
    const supabase = queuedSupabase({ profiles: [roleQuery('player')] })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(generateSupervisionToken('room-1')).rejects.toThrow('Acceso denegado')
    expect(redis.setex).not.toHaveBeenCalled()
  })

  it('propaga errores de Redis al generar token de supervision', async () => {
    ;(redis.setex as jest.Mock).mockRejectedValueOnce(new Error('Redis caido'))
    const supabase = queuedSupabase({ profiles: [roleQuery('admin')] })
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    await expect(generateSupervisionToken('room-1')).rejects.toThrow('Redis caido')
    expect(logAdminAction).not.toHaveBeenCalled()
  })
})
