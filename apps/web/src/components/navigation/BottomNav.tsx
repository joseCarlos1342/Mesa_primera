'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, LayoutGrid, UserRound, Users, Wallet } from 'lucide-react'
import landing from '@/components/landing/landing.module.css'

export const NAV_ITEMS = [
  { label: 'Inicio', icon: Home, href: '/dashboard', match: ['/dashboard'] },
  { label: 'Mesas', icon: LayoutGrid, href: '/lobby', match: ['/lobby'] },
  { label: 'Billetera', icon: Wallet, href: '/wallet', match: ['/wallet'] },
  { label: 'Amigos', icon: Users, href: '/friends', match: ['/friends'] },
  { label: 'Perfil', icon: UserRound, href: '/profile', match: ['/profile', '/stats'] },
] as const

/** Pestaña activa por prefijo de ruta: `/wallet/deposit` marca Billetera. */
export function isNavActive(pathname: string, match: readonly string[]): boolean {
  return match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

/**
 * Navegación principal del jugador: barra inferior de nogal en móvil y riel
 * lateral desde `lg`. Se oculta en la mesa de juego.
 */
export function BottomNav() {
  const pathname = usePathname() ?? ''
  if (pathname.includes('/play/')) return null

  return (
    <nav
      aria-label="Secciones"
      className={`${landing.wood} fixed inset-x-0 bottom-0 z-[100] shadow-[inset_0_1px_0_rgba(197,160,89,0.45),0_-12px_28px_-14px_rgba(0,0,0,0.9)] lg:inset-x-auto lg:left-0 lg:top-0 lg:w-28 lg:shadow-[inset_-1px_0_0_rgba(197,160,89,0.4)]`}
    >
      <Link
        href="/dashboard"
        aria-label="Primera Riverada los 4 Ases, inicio"
        className="hidden h-24 items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light lg:flex"
      >
        <Image src="/brand/logo-transparent.svg" alt="" width={56} height={56} className="h-14 w-14" />
      </Link>
      <ul className="mx-auto grid max-w-xl grid-cols-5 pb-[env(safe-area-inset-bottom)] lg:mt-2 lg:flex lg:max-w-none lg:flex-col lg:gap-1 lg:px-2 lg:pb-0">
        {NAV_ITEMS.map(({ label, icon: Icon, href, match }) => {
          const active = isNavActive(pathname, match)
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`group relative flex min-h-[4.25rem] flex-col items-center justify-center gap-1 px-1 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-gold-light lg:min-h-[5rem] lg:rounded-lg ${
                  active ? 'text-brand-gold-light lg:bg-[#0a2c20]' : 'text-[#bdb7a6] hover:text-text-premium lg:hover:bg-[#1b0d08]'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute left-1/2 top-0 h-[3px] w-10 -translate-x-1/2 rounded-b-full bg-brand-gold transition-opacity duration-200 lg:left-0 lg:top-1/2 lg:h-10 lg:w-[3px] lg:translate-x-0 lg:-translate-y-1/2 lg:rounded-b-none lg:rounded-r-full ${
                    active ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                <Icon
                  aria-hidden="true"
                  strokeWidth={active ? 2.25 : 1.75}
                  className={`h-6 w-6 ${active ? 'text-brand-gold' : 'text-[#c5a059]/80 group-hover:text-[#c5a059]'}`}
                />
                <span className="truncate leading-none">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
