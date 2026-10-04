'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

export const NAV_SECTIONS = [
  { id: 'como-se-gana', label: 'Cómo se gana' },
  { id: 'empezar', label: 'Empezar' },
  { id: 'club', label: 'El club' },
  { id: 'tutoriales', label: 'Tutoriales' },
  { id: 'faq', label: 'Preguntas' },
  { id: 'ubicacion', label: 'Ubicación' },
] as const

const SPY_IDS = ['inicio', ...NAV_SECTIONS.map((section) => section.id)]

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('inicio')

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40)
      const y = window.scrollY + 140
      for (let i = SPY_IDS.length - 1; i >= 0; i--) {
        const el = document.getElementById(SPY_IDS[i])
        if (el && el.offsetTop <= y) {
          setActive(SPY_IDS[i])
          break
        }
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const go = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setOpen(false)
  }, [])

  return (
    <nav
      aria-label="Principal"
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow] duration-300 ${
        scrolled || open ? 'bg-[#0a0a0a]/95 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.8)]' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[90rem] items-center justify-between gap-6 px-5 sm:px-8 md:h-20 lg:px-14">
        <button
          type="button"
          onClick={() => go('inicio')}
          className="flex min-h-11 items-center gap-3 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light"
          aria-label="Primera Riverada los 4 Ases"
        >
          <Image src="/brand/logo-transparent.svg" alt="" width={40} height={40} className="h-10 w-10" priority />
          <span className="hidden font-display text-lg font-bold text-text-premium xl:inline" aria-hidden="true">
            los 4 Ases
          </span>
        </button>

        <div className="hidden items-center gap-1 lg:flex">
          {NAV_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => go(section.id)}
              aria-current={active === section.id ? 'true' : undefined}
              className={`relative min-h-11 rounded px-3 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light ${
                active === section.id ? 'text-brand-gold-light' : 'text-[#d9d3bf] hover:text-text-premium'
              }`}
            >
              {section.label}
              {active === section.id && (
                <span className="absolute inset-x-3 bottom-1.5 h-px bg-brand-gold" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/login/player"
            className="hidden min-h-11 items-center px-2 text-base font-semibold text-[#d9d3bf] transition-colors hover:text-brand-gold-light sm:inline-flex"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register/player"
            className="inline-flex min-h-11 items-center rounded-lg bg-brand-gold px-4 text-base font-bold text-[#0a0a0a] transition-colors hover:bg-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] sm:px-5"
          >
            Crear cuenta
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="menu-movil"
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-text-premium transition-colors hover:text-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light lg:hidden"
          >
            {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="menu-movil" className="border-t border-[#8b6b2e]/45 bg-[#0a0a0a] lg:hidden">
          <ul className="m-0 list-none px-5 py-3 sm:px-8">
            {NAV_SECTIONS.map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => go(section.id)}
                  className={`flex min-h-14 w-full items-center border-b border-white/5 text-left text-xl font-semibold ${
                    active === section.id ? 'text-brand-gold-light' : 'text-text-premium'
                  }`}
                >
                  {section.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="px-5 pb-5 sm:px-8">
            <Link
              href="/login/player"
              onClick={() => setOpen(false)}
              className="flex min-h-14 items-center justify-center rounded-lg border border-[#c5a059]/70 text-lg font-bold text-brand-gold-light"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
