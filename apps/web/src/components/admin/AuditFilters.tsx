'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Download, Filter, X } from 'lucide-react'
import { exportAuditLog } from '@/app/actions/admin-audit-export'

const CONTEXTS = [
  { value: '', label: 'Todos' },
  { value: 'wallet', label: 'Financiero' },
  { value: 'tables', label: 'Mesas' },
  { value: 'communications', label: 'Comunicaciones' },
  { value: 'settings', label: 'Configuración' },
  { value: 'support', label: 'Soporte' },
  { value: 'alerts', label: 'Alertas' },
  { value: 'integrity', label: 'Integridad' },
  { value: 'game-room-moderation', label: 'Moderación Sala' },
]

export function AuditFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [isExporting, setIsExporting] = useState(false)

  const currentAction = searchParams.get('action') ?? ''
  const currentContext = searchParams.get('context') ?? ''
  const currentDateFrom = searchParams.get('dateFrom') ?? ''
  const currentDateTo = searchParams.get('dateTo') ?? ''

  const hasFilters = currentAction || currentContext || currentDateFrom || currentDateTo

  function applyFilters(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    }
    startTransition(() => {
      router.push(`?${params.toString()}`)
    })
  }

  function clearFilters() {
    startTransition(() => {
      router.push('?')
    })
  }

  async function handleExport(format: 'csv' | 'json') {
    setIsExporting(true)
    try {
      const filters: Record<string, string | number> = { limit: 5000 }
      if (currentAction) filters.action = currentAction
      if (currentContext) filters.context = currentContext
      if (currentDateFrom) filters.dateFrom = currentDateFrom
      if (currentDateTo) filters.dateTo = currentDateTo

      const content = await exportAuditLog(filters, format)
      const blob = new Blob([content], {
        type: format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 bg-slate-900/50 border border-white/5 rounded-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-400">
          <Filter className="w-4 h-4" />
          <span className="text-xs font-black uppercase tracking-widest">Filtros</span>
        </div>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-3 h-3" />
              Limpiar
            </button>
          )}
          <button
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <Download className="w-3 h-3" />
            CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            disabled={isExporting}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <Download className="w-3 h-3" />
            JSON
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Action filter */}
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Acción</label>
          <input
            type="text"
            placeholder="ej: broadcast_sent"
            value={currentAction}
            onChange={(e) => applyFilters({ action: e.target.value })}
            className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {/* Context filter */}
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Contexto</label>
          <select
            value={currentContext}
            onChange={(e) => applyFilters({ context: e.target.value })}
            className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500/50"
          >
            {CONTEXTS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date from */}
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Desde</label>
          <input
            type="date"
            value={currentDateFrom}
            onChange={(e) => applyFilters({ dateFrom: e.target.value ? `${e.target.value}T00:00:00Z` : '' })}
            className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {/* Date to */}
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Hasta</label>
          <input
            type="date"
            value={currentDateTo}
            onChange={(e) => applyFilters({ dateTo: e.target.value ? `${e.target.value}T23:59:59Z` : '' })}
            className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {isPending && (
        <div className="text-center text-xs text-slate-500 animate-pulse">Filtrando...</div>
      )}
    </div>
  )
}
