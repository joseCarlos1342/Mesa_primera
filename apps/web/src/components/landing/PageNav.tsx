import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export interface PageNavCta {
  readonly href: string
  readonly label: string
  /** Estilo secundario (borde de latón) para no competir con el dorado del formulario. */
  readonly quiet?: boolean
}

const DEFAULT_CTA: PageNavCta = { href: '/register/player', label: 'Crear cuenta' }

interface PageNavProps {
  /** Acción dorada de la derecha. `null` la oculta (pasos intermedios del auth). */
  readonly cta?: PageNavCta | null
}

/** Barra superior de las páginas públicas a todo el ancho (reglas, divulgación responsable, auth). */
export function PageNav({ cta = DEFAULT_CTA }: PageNavProps = {}) {
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
        {cta && (
          <Link
            href={cta.href}
            className={
              cta.quiet
                ? 'inline-flex min-h-11 items-center rounded-lg border border-[#8b6b2e]/70 px-4 text-base font-semibold text-text-premium transition-colors hover:border-brand-gold hover:text-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light sm:px-5'
                : 'inline-flex min-h-11 items-center rounded-lg bg-brand-gold px-4 text-base font-bold text-[#0a0a0a] transition-colors hover:bg-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] sm:px-5'
            }
          >
            {cta.label}
          </Link>
        )}
      </div>
    </nav>
  )
}
