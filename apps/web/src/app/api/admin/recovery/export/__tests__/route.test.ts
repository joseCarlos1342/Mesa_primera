/**
 * @jest-environment node
 */
import { GET } from '../route'
import { getAdminRecoveryIncidentExport } from '@/app/actions/admin-recovery'
import { checkRateLimit, getClientIp } from '@/utils/redis'
import { createClient } from '@/utils/supabase/server'

jest.mock('@/app/actions/admin-recovery', () => ({
  getAdminRecoveryIncidentExport: jest.fn(),
}))

jest.mock('@/utils/redis', () => ({
  checkRateLimit: jest.fn(),
  getClientIp: jest.fn(),
}))

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

const getUser = jest.fn()
const single = jest.fn()

describe('GET /api/admin/recovery/export', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getClientIp as jest.Mock).mockResolvedValue('203.0.113.10')
    ;(checkRateLimit as jest.Mock).mockResolvedValue({ success: true, reset: 60 })
    ;(getAdminRecoveryIncidentExport as jest.Mock).mockResolvedValue([])
    getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    single.mockResolvedValue({ data: { role: 'admin' } })
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser },
      from: jest.fn(() => ({
        select: jest.fn(() => ({ eq: jest.fn(() => ({ single })) })),
      })),
    })
  })

  it('exporta únicamente el resumen terminal como CSV con cabeceras seguras', async () => {
    ;(getAdminRecoveryIncidentExport as jest.Mock).mockResolvedValue([{
      roomId: '=mesa',
      gameId: '00000000-0000-4000-8000-000000000160',
      cause: 'process_restart',
      status: 'manual_review',
      resolutionReason: 'requires_review',
      completedRefunds: 1,
      totalRefunds: 1,
      detectedAt: '2026-07-18T04:00:00.000Z',
      resolvedAt: '2026-07-18T04:01:00.000Z',
    }])

    const response = await GET(new Request('http://localhost/api/admin/recovery/export?status=manual_review') as never)

    expect(response.headers.get('content-type')).toContain('text/csv')
    expect(response.headers.get('content-disposition')).toContain('attachment')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    await expect(response.text()).resolves.toContain("'=mesa")
    expect(getAdminRecoveryIncidentExport).toHaveBeenCalledWith({ status: 'manual_review' })
  })

  it('rechaza filtros inválidos sin consultar exportación', async () => {
    const response = await GET(new Request('http://localhost/api/admin/recovery/export?status=active') as never)

    expect(response.status).toBe(400)
    expect(getAdminRecoveryIncidentExport).not.toHaveBeenCalled()
  })

  it('responde con un error seguro si falla la exportación', async () => {
    ;(getAdminRecoveryIncidentExport as jest.Mock).mockRejectedValue(new Error('detalle interno'))

    const response = await GET(new Request('http://localhost/api/admin/recovery/export') as never)

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'No se pudo exportar el historial' })
  })

  it('limita exportaciones repetidas antes de consultar la base de datos', async () => {
    ;(checkRateLimit as jest.Mock).mockResolvedValue({ success: false, reset: 60 })

    const response = await GET(new Request('http://localhost/api/admin/recovery/export') as never)

    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('60')
    expect(getAdminRecoveryIncidentExport).not.toHaveBeenCalled()
    expect(checkRateLimit).toHaveBeenCalledWith('rate_limit:admin_recovery_export:admin-1:203.0.113.10', 3, 60)
  })

  it('pide acotar filtros en lugar de truncar silenciosamente el CSV', async () => {
    ;(getAdminRecoveryIncidentExport as jest.Mock).mockRejectedValue(
      new Error('La exportación supera 5000 filas; acota los filtros')
    )

    const response = await GET(new Request('http://localhost/api/admin/recovery/export') as never)

    expect(response.status).toBe(422)
    await expect(response.json()).resolves.toEqual({
      error: 'La exportación supera 5000 filas. Acota los filtros e inténtalo de nuevo.',
    })
  })

  it('rechaza solicitudes sin sesión antes de consumir rate limit', async () => {
    getUser.mockResolvedValue({ data: { user: null } })

    const response = await GET(new Request('http://localhost/api/admin/recovery/export') as never)

    expect(response.status).toBe(401)
    expect(checkRateLimit).not.toHaveBeenCalled()
    expect(getAdminRecoveryIncidentExport).not.toHaveBeenCalled()
  })

  it('rechaza jugadores antes de consumir rate limit', async () => {
    single.mockResolvedValue({ data: { role: 'player' } })

    const response = await GET(new Request('http://localhost/api/admin/recovery/export') as never)

    expect(response.status).toBe(403)
    expect(checkRateLimit).not.toHaveBeenCalled()
    expect(getAdminRecoveryIncidentExport).not.toHaveBeenCalled()
  })
})
