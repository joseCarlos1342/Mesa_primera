import Link from 'next/link'
import type { ReactNode } from 'react'
import { PlayerAvatar } from './PlayerAvatar'

interface PlayerHeaderProps {
  readonly username?: string | null
  readonly avatar?: string | null
  /** Botones de la derecha (soporte y notificaciones). */
  readonly actions?: ReactNode
}

/** Cabecera fija del jugador: identidad que lleva al Perfil y accesos a soporte y avisos. */
export function PlayerHeader({ username, avatar, actions }: PlayerHeaderProps) {
  const name = username || 'Jugador'
  return (
    <header
      className="sticky top-0 z-50 bg-[#0a0a0a]/95 shadow-[inset_0_-1px_0_rgba(139,107,46,0.45),0_8px_24px_-14px_rgba(0,0,0,0.9)] lg:pl-28"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex h-[4.5rem] max-w-[72rem] items-center justify-between gap-3 px-4 sm:px-6 lg:px-14">
        <Link
          href="/profile"
          aria-label={`Tu perfil, ${name}`}
          className="-ml-1 flex min-h-12 min-w-0 items-center gap-3 rounded-lg px-1 py-1 transition-colors hover:text-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light"
        >
          <PlayerAvatar avatar={avatar} name={name} size={44} />
          <span className="min-w-0">
            <span className="block truncate text-lg font-semibold leading-tight text-text-premium">{name}</span>
            <span className="block text-sm leading-tight text-[#bdb7a6]">Ver perfil</span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      </div>
    </header>
  )
}
