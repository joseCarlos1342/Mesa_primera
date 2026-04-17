'use client'

import type { ReactNode } from 'react'
import { useId, useState } from 'react'
import { Info } from 'lucide-react'

export type AdminStatusTone = 'success' | 'warning' | 'danger' | 'neutral'

const statusToneStyles: Record<
  AdminStatusTone,
  { container: string; icon: string; title: string }
> = {
  success: {
    container: 'bg-emerald-900/20 border-emerald-500/20',
    icon: 'text-emerald-400',
    title: 'text-emerald-300',
  },
  warning: {
    container: 'bg-amber-900/20 border-amber-500/20',
    icon: 'text-amber-400',
    title: 'text-amber-300',
  },
  danger: {
    container: 'bg-red-900/20 border-red-500/20',
    icon: 'text-red-400',
    title: 'text-red-300',
  },
  neutral: {
    container: 'bg-slate-800/40 border-slate-600/30',
    icon: 'text-slate-400',
    title: 'text-slate-200',
  },
}

interface AdminStatusCardProps {
  label: string
  tone: AdminStatusTone
  icon: ReactNode
  title: string
  detail?: string
  tooltip: ReactNode
}

export function AdminStatusCard({
  label,
  tone,
  icon,
  title,
  detail,
  tooltip,
}: AdminStatusCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const panelId = useId()
  const styles = statusToneStyles[tone]

  return (
    <div
      className={`group relative z-0 min-w-0 rounded-2xl border px-3.5 py-3 shadow-xl backdrop-blur-xl transition-[z-index] hover:z-20 focus-within:z-20 ${styles.container} sm:px-4 sm:py-3.5`}
    >
      <button
        type="button"
        aria-controls={panelId}
        aria-expanded={isOpen}
        aria-label={`Ver detalle de ${label}`}
        onClick={() => setIsOpen((current) => !current)}
        className="w-full min-w-0 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-400 sm:text-[10px]">
            {label}
          </p>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-950/40 text-slate-400 transition-colors group-hover:text-white group-focus-within:text-white">
            <Info className="h-3.5 w-3.5" />
          </span>
        </div>

        <div className="mt-2 flex items-start gap-2.5">
          <div className={`mt-0.5 shrink-0 ${styles.icon}`}>{icon}</div>
          <div className="min-w-0">
            <p className={`wrap-break-word text-sm font-black leading-tight ${styles.title}`}>
              {title}
            </p>
            {detail ? (
              <p className="mt-1 wrap-break-word text-[10px] font-medium leading-tight text-slate-400 sm:text-[11px]">
                {detail}
              </p>
            ) : null}
          </div>
        </div>
      </button>

      {isOpen ? (
        <div
          id={panelId}
          data-testid="admin-status-card-mobile-panel"
          className="mt-3 rounded-xl border border-white/10 bg-slate-950/70 p-4 text-left sm:hidden"
        >
          {tooltip}
        </div>
      ) : null}

      <div className="pointer-events-none absolute left-0 top-full z-30 mt-2 hidden w-[calc(100vw-2rem)] max-w-72 rounded-2xl border border-white/10 bg-slate-900 p-4 opacity-0 shadow-2xl transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 sm:block sm:left-auto sm:right-0 sm:w-72">
        {tooltip}
      </div>
    </div>
  )
}