import { getAdminRecoveryIncidents } from '@/app/actions/admin-recovery'
import { AlertTriangle, CheckCircle2, Clock3, RotateCcw } from 'lucide-react'

const STATUS_LABEL: Record<string, string> = {
  cancelled_crash: 'Cancelado por caída',
  manual_review: 'Revisión manual',
}

function formatTimestamp(timestamp: string | null) {
  if (!timestamp) return 'Sin resolución registrada'
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp))
}

function StatusBadge({ status }: { status: string }) {
  const isCrash = status === 'cancelled_crash'
  const classes = isCrash
    ? 'bg-danger/10 text-danger ring-1 ring-inset ring-danger/20'
    : 'bg-warning/10 text-warning ring-1 ring-inset ring-warning/20'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${classes}`}
    >
      <span
        className={`size-1.5 rounded-full ${isCrash ? 'bg-danger' : 'bg-warning'}`}
        aria-hidden="true"
      />
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

function RefundsBar({ completed, total }: { completed: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100)
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-2xl font-black tabular-nums text-text-primary">
          {completed}
        </span>
        <span className="font-mono text-sm text-text-tertiary tabular-nums">/ {total}</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-white/5"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-emerald-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">
        Refunds completados
      </p>
    </div>
  )
}

function CauseChip({ cause }: { cause: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-1 font-mono text-[10px] text-text-secondary ring-1 ring-inset ring-white/10">
      {cause}
    </span>
  )
}

export default async function AdminRecoveryPage() {
  try {
    const incidents = await getAdminRecoveryIncidents()

    const totalRefunds = incidents.reduce((sum, i) => sum + i.totalRefunds, 0)
    const completedRefunds = incidents.reduce((sum, i) => sum + i.completedRefunds, 0)

    return (
      <div className="min-h-full space-y-8 animate-in fade-in duration-700">
        {/* Header */}
        <header className="border-b border-white/5 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-rose-400/25 bg-rose-500/10">
                <RotateCcw className="size-6 text-rose-300" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
                  Incidentes de recuperación
                </h1>
                <p className="mt-1 text-sm text-text-tertiary">
                  Historial terminal de recuperaciones tras caídas del motor.
                </p>
              </div>
            </div>

            {incidents.length > 0 && (
              <div className="flex gap-3">
                <div className="rounded-xl border border-white/5 bg-surface px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                    Incidentes terminales
                  </p>
                  <p className="mt-1 font-mono text-2xl font-black tabular-nums text-text-primary">
                    {incidents.length}
                  </p>
                </div>
                <div className="rounded-xl border border-white/5 bg-surface px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                    Refunds completados
                  </p>
                  <p className="mt-1 font-mono text-2xl font-black tabular-nums text-text-primary">
                    {completedRefunds} / {totalRefunds}
                  </p>
                </div>
              </div>
            )}
          </div>
        </header>

        {incidents.length === 0 ? (
          <section className="rounded-2xl border border-white/5 bg-surface-card p-10 text-center">
            <CheckCircle2 className="mx-auto mb-3 size-10 text-success" />
            <h2 className="text-lg font-bold text-text-primary">No hay incidentes terminales visibles</h2>
            <p className="mt-2 text-sm text-text-tertiary">
              Los incidentes activos no se muestran para preservar la integridad de las partidas en curso.
            </p>
          </section>
        ) : (
          <ul className="space-y-3" data-testid="recovery-list">
            {incidents.map((incident) => (
              <li
                key={incident.gameId}
                className="overflow-hidden rounded-2xl border border-white/5 bg-surface-card transition-colors hover:border-white/10"
              >
                <article className="grid grid-cols-1 gap-6 p-5 md:grid-cols-12 md:p-6">
                  {/* Identidad: room + juego + causa */}
                  <div className="md:col-span-4 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                        Sala
                      </span>
                      <span className="font-mono text-sm font-bold text-text-primary truncate">
                        {incident.roomId}
                      </span>
                    </div>
                    <div>
                      <p
                        className="font-mono text-[11px] text-text-tertiary truncate"
                        title={incident.gameId}
                      >
                        Juego {incident.gameId}
                      </p>
                    </div>
                    <div className="pt-1">
                      <CauseChip cause={incident.cause} />
                    </div>
                  </div>

                  {/* Estado + motivo */}
                  <div className="md:col-span-3 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                      Estado
                    </span>
                    <div>
                      <StatusBadge status={incident.status} />
                    </div>
                    <p className="text-xs leading-5 text-text-secondary">
                      {incident.resolutionReason ?? 'Sin motivo registrado'}
                    </p>
                  </div>

                  {/* Refunds */}
                  <div className="md:col-span-2">
                    <RefundsBar
                      completed={incident.completedRefunds}
                      total={incident.totalRefunds}
                    />
                  </div>

                  {/* Tiempos */}
                  <div className="md:col-span-3 space-y-2 md:border-l md:border-white/5 md:pl-6">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                      Resolución
                    </span>
                    <div className="space-y-1.5 font-mono text-[11px] text-text-secondary">
                      <div className="flex items-center gap-1.5">
                        <Clock3 className="size-3 shrink-0 text-info" />
                        <span>
                          <span className="text-text-muted">Detectado: </span>
                          {formatTimestamp(incident.detectedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock3 className="size-3 shrink-0 text-emerald-400" />
                        <span>
                          <span className="text-text-muted">Resuelto: </span>
                          {formatTimestamp(incident.resolvedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
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
