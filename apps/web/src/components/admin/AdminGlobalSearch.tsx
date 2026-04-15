'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition, useRef, useCallback } from 'react'

export function AdminGlobalSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = query.trim()
      if (!trimmed) return
      startTransition(() => {
        router.push(`/admin/consultas?q=${encodeURIComponent(trimmed)}`)
      })
    },
    [query, router]
  )

  return (
    <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
      <div className="relative">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar ID, seed, usuario…"
          className="w-48 md:w-64 rounded-md bg-gray-800 border border-white/10 pl-9 pr-3 py-1.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          aria-label="Búsqueda global admin"
        />
      </div>
      <button
        type="submit"
        disabled={isPending || !query.trim()}
        className="hidden md:inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'Buscando…' : 'Buscar'}
      </button>
    </form>
  )
}
