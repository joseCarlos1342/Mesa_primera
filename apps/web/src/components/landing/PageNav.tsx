import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

/** Barra superior de las páginas públicas a todo el ancho (reglas, divulgación responsable). */
export function PageNav() {
  return (
    <nav aria-label="Principal" className="sticky top-0 z-50 bg-[#0a0a0a]/95 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.8)]">
      <div className="mx-auto flex h-16 max-w-[90rem] items-center justify-between gap-4 px-5 sm:px-8 md:h-20 lg:px-14">
        <Link
          href="/"
          aria-label="Volver al inicio"
          className="flex min-h-11 items-center gap-3 rounded text-base font-semibold text-[#d9d3bf] transition-colors hover:text-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          <Image src="/brand/logo-transparent.svg" alt="" width={40} height={40} className="h-10 w-10" />
          <span className="hidden min-[400px]:inline" aria-hidden="true">
            Volver al inicio
          </span>
        </Link>
        <Link
          href="/register/player"
          className="inline-flex min-h-11 items-center rounded-lg bg-brand-gold px-4 text-base font-bold text-[#0a0a0a] transition-colors hover:bg-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] sm:px-5"
        >
          Crear cuenta
        </Link>
      </div>
    </nav>
  )
}
