import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminRecoveryIncidentExport, type RecoveryIncidentFilters } from '@/app/actions/admin-recovery'
import { checkRateLimit, getClientIp } from '@/utils/redis'
import { createClient } from '@/utils/supabase/server'

const EXPORT_RATE_LIMIT = 3
const EXPORT_RATE_WINDOW_SECONDS = 60
const EXPORT_TOO_LARGE_ERROR = 'La exportación supera 5000 filas; acota los filtros'

const exportQuerySchema = z.object({
  status: z.enum(['cancelled_crash', 'manual_review', 'closed']).optional(),
  cause: z.string().trim().min(1).max(80).optional(),
  q: z.string().trim().max(120).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
}).strict().refine((query) => !query.from || !query.to || query.from <= query.to)

function escapeCsv(value: string | number | null): string {
  const raw = value === null ? '' : String(value)
  const safe = /^[\s]*[=+\-@]/.test(raw) ? `'${raw}` : raw
  return `"${safe.replaceAll('"', '""')}"`
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  const ip = await getClientIp()
  const rateLimit = await checkRateLimit(
    `rate_limit:admin_recovery_export:${userData.user.id}:${ip}`,
    EXPORT_RATE_LIMIT,
    EXPORT_RATE_WINDOW_SECONDS
  )
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Demasiadas exportaciones. Inténtalo de nuevo más tarde.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.reset) } }
    )
  }

  const parsed = exportQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
  if (!parsed.success) return NextResponse.json({ error: 'Filtros inválidos' }, { status: 400 })

  try {
    const query = parsed.data
    const rows = await getAdminRecoveryIncidentExport({
      status: query.status,
      cause: query.cause,
      query: query.q,
      from: query.from,
      to: query.to,
    } satisfies Omit<RecoveryIncidentFilters, 'cursor'>)
    const header = ['roomId', 'gameId', 'cause', 'status', 'resolutionReason', 'completedRefunds', 'totalRefunds', 'detectedAt', 'resolvedAt']
    const csv = [header.join(','), ...rows.map((row) => [row.roomId, row.gameId, row.cause, row.status, row.resolutionReason, row.completedRefunds, row.totalRefunds, row.detectedAt, row.resolvedAt].map(escapeCsv).join(','))].join('\r\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="recovery-incidents.csv"',
        'Cache-Control': 'no-store, private',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === EXPORT_TOO_LARGE_ERROR) {
      return NextResponse.json(
        { error: 'La exportación supera 5000 filas. Acota los filtros e inténtalo de nuevo.' },
        { status: 422 }
      )
    }
    return NextResponse.json({ error: 'No se pudo exportar el historial' }, { status: 500 })
  }
}
