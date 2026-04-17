'use client'

import Link from 'next/link'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { SignOutButton } from '@/components/auth/sign-out-button'

export function AdminHeaderActions() {
  const pathname = usePathname()
  const showBroadcastShortcut = pathname === '/admin'
  const showLedgerBackShortcut = pathname.startsWith('/admin/ledger/')

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {showLedgerBackShortcut ? (
        <Link
          href="/admin/ledger"
          aria-label="Volver al libro mayor"
          title="Volver al libro mayor"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-100 transition-all duration-300 hover:border-white/20 hover:bg-white/10 active:scale-95 md:rounded-2xl shadow-[0_10px_30px_rgba(15,23,42,0.28)]"
        >
          <ArrowLeft className="h-4 w-4 shrink-0 md:h-5 md:w-5" />
        </Link>
      ) : null}

      {showBroadcastShortcut ? (
        <Link
          href="/admin/broadcast"
          aria-label="Nuevo Broadcast"
          title="Nuevo Broadcast"
          className="flex h-11 w-11 items-center justify-center gap-0 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-0 text-indigo-100 transition-all duration-300 hover:border-indigo-400/50 hover:bg-indigo-500/20 active:scale-95 sm:w-auto sm:gap-2 sm:px-4 md:rounded-2xl shadow-[0_10px_30px_rgba(49,46,129,0.2)]"
        >
          <MessageSquare className="h-4 w-4 shrink-0 md:h-5 md:w-5" />
          <span className="hidden text-xs font-black uppercase tracking-[0.2em] sm:inline md:text-sm">
            Broadcast
          </span>
        </Link>
      ) : null}

      <SignOutButton
        variant="danger"
        className="h-11 w-11 justify-center px-0 py-0 sm:w-auto sm:px-4"
      />
    </div>
  )
}