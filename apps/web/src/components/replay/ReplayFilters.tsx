import Link from 'next/link'
import type { ReplayFilters } from '@/app/actions/replays'

export const REPLAY_PERIODS = ['7d', '30d', '90d', 'all'] as const

const PERIOD_LABEL: Record<(typeof REPLAY_PERIODS)[number], string> = {
  '7d': '7 días',
  '30d': '30 días',
  '90d': '90 días',
  all: 'Todo',
}

export function periodLabel(period: ReplayFilters['period']): string {
  return PERIOD_LABEL[period]
}

/** `?period=…` para conservar el filtro al navegar (vacío con el valor por defecto). */
export function replayQuery(filters: ReplayFilters): string {
  if (filters.period === '7d' && !filters.from && !filters.to) return ''
  const params = new URLSearchParams({ period: filters.period })
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  return `?${params.toString()}`
}

const dateField =
  'mt-1.5 block h-12 w-full rounded-lg border border-[#8b6b2e]/70 bg-[#120806] px-3 font-mono text-base tabular-nums text-text-premium outline-none transition-colors focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/35 [color-scheme:dark]'

/** Periodo como píldoras y rango de fechas opcional (formulario GET). */
export function ReplayPeriodFilter({ filters }: { readonly filters: ReplayFilters }) {
  const custom = Boolean(filters.from || filters.to)
  return (
    <div className="mb-8 space-y-4">
      <nav aria-label="Periodo del historial" className="flex flex-wrap gap-2">
        {REPLAY_PERIODS.map((period) => {
          const active = filters.period === period && !custom
          return (
            <Link
              key={period}
              href={`/replays?period=${period}`}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light ${
                active
                  ? 'border-brand-gold bg-[#0a2c20] text-brand-gold-light'
                  : 'border-[#8b6b2e]/60 text-[#d9d3bf] hover:border-brand-gold hover:text-text-premium'
              }`}
            >
              {PERIOD_LABEL[period]}
            </Link>
          )
        })}
      </nav>
      <details className="group" open={custom}>
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center rounded text-base font-semibold text-brand-gold-light underline decoration-brand-gold/50 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light [&::-webkit-details-marker]:hidden">
          Elegir fechas
        </summary>
        <form action="/replays" className="mt-3 grid max-w-xl grid-cols-2 items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label className="text-base font-semibold text-text-premium">
            Desde
            <input name="from" type="date" defaultValue={filters.from} className={dateField} />
          </label>
          <label className="text-base font-semibold text-text-premium">
            Hasta
            <input name="to" type="date" defaultValue={filters.to} className={dateField} />
          </label>
          <button
            type="submit"
            className="col-span-2 inline-flex min-h-12 items-center justify-center rounded-lg border border-[#8b6b2e]/80 px-5 text-lg font-semibold text-text-premium transition-colors hover:border-brand-gold hover:text-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light sm:col-span-1"
          >
            Filtrar
          </button>
        </form>
      </details>
    </div>
  )
}
