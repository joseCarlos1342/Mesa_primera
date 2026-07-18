import { AlertTriangle } from 'lucide-react'
import {
  getAdminRecoveryIncidentPage,
  type RecoveryIncidentFilters,
} from '@/app/actions/admin-recovery'
import { RecoveryExplorer } from './RecoveryExplorer'

type RecoverySearchParams = {
  status?: string
  cause?: string
  q?: string
  from?: string
  to?: string
  cursorDetectedAt?: string
  cursorGameId?: string
}

function toRecoveryFilters(params: RecoverySearchParams): RecoveryIncidentFilters {
  const status = params.status === 'cancelled_crash' || params.status === 'manual_review' || params.status === 'closed'
    ? params.status
    : undefined
  const query = params.q?.trim()
  const cause = params.cause?.trim()

  return {
    status,
    cause: cause || undefined,
    query: query || undefined,
    from: params.from || undefined,
    to: params.to || undefined,
    cursor: params.cursorDetectedAt && params.cursorGameId
      ? { detectedAt: params.cursorDetectedAt, gameId: params.cursorGameId }
      : undefined,
  }
}

export default async function AdminRecoveryPage({
  searchParams,
}: {
  searchParams: Promise<RecoverySearchParams>
} = { searchParams: Promise.resolve({}) }) {
  try {
    const filters = toRecoveryFilters(await searchParams)
    const page = await getAdminRecoveryIncidentPage(filters)

    return <RecoveryExplorer page={page} filters={filters} />
  } catch {
    return (
      <div className="flex min-h-full items-center justify-center">
        <section className="max-w-lg rounded-2xl border border-danger/25 bg-danger/10 p-10 text-center">
          <AlertTriangle className="mx-auto mb-3 size-10 text-danger" />
          <h1 className="text-lg font-bold text-text-primary">No se pudo cargar el historial</h1>
          <p className="mt-2 text-sm text-text-secondary">Vuelve a intentarlo en unos minutos.</p>
        </section>
      </div>
    )
  }
}
