import type { ReactNode } from 'react'
import { PageNav, type PageNavCta } from '@/components/landing/PageNav'
import { PlayingCard } from '@/components/landing/PlayingCard'
import { FOUR_ACES, cardId } from '@/components/landing/primeraHands'
import { LOCAL_LOCATION } from '@/components/landing/landingLocation'
import landing from '@/components/landing/landing.module.css'
import { AuthStepper } from './AuthStepper'
import { DocumentBackground } from './DocumentBackground'
import styles from './auth.module.css'

export interface AuthShellSteps {
  readonly labels: readonly string[]
  /** Paso actual, empezando en 1. */
  readonly current: number
}

interface AuthShellProps {
  /** Título de la pantalla (único `h1`). */
  readonly title: ReactNode
  /** Párrafo de apoyo bajo el título. */
  readonly lead?: ReactNode
  /** Reparte los 4 ases al entrar (solo login y primer paso del registro). */
  readonly deal?: boolean
  /** Acción de la barra superior; `null` la oculta en pasos intermedios. */
  readonly nav?: PageNavCta | null
  readonly steps?: AuthShellSteps
  /** Columna de formulario más ancha (formularios con dos columnas y avatares). */
  readonly wide?: boolean
  readonly panelTitle?: ReactNode
  readonly panelText?: string
  readonly children: ReactNode
}

const DEFAULT_PANEL_TITLE = (
  <>
    Siéntate a <span className="italic text-brand-gold-light">la mesa</span>
  </>
)
const DEFAULT_PANEL_TEXT = 'Tu cuenta te espera con las mismas reglas que se juegan en el club.'

/**
 * Composición dividida del auth de jugador: paño y nogal con los 4 ases a la izquierda
 * (cabecera corta en móvil) y el formulario sobre negro a la derecha.
 */
export function AuthShell({
  title,
  lead,
  deal = false,
  nav = null,
  steps,
  wide = false,
  panelTitle = DEFAULT_PANEL_TITLE,
  panelText = DEFAULT_PANEL_TEXT,
  children,
}: AuthShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#0a0a0a] font-sans text-text-premium selection:bg-brand-gold/35 selection:text-text-premium">
      <DocumentBackground color="#0a0a0a" />
      <PageNav cta={nav} />

      <div className="grid flex-1 content-start lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:content-stretch">
        <div
          data-testid="auth-panel"
          className={`${landing.felt} ${landing.rim} px-6 py-7 sm:px-10 lg:px-14 lg:py-16`}
        >
          <div className="flex items-center gap-5 lg:sticky lg:top-36 lg:min-h-[calc(100dvh-13rem)] lg:flex-col lg:justify-center lg:gap-0 lg:text-center">
          <div className={styles.fan} aria-hidden="true">
            {FOUR_ACES.map((card, index) => (
              <PlayingCard
                key={cardId(card)}
                card={card}
                sizes="(min-width: 1024px) 136px, 42px"
                loading="eager"
                decorative
                deal={deal}
                dealIndex={index}
              />
            ))}
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold leading-[1.05] tracking-[-0.02em] text-text-premium [font-size:clamp(1.6rem,4.5vw,4rem)]">
              {panelTitle}
            </p>
            <p className="mt-4 hidden max-w-[34ch] text-lg leading-relaxed text-[#d9d3bf] lg:mx-auto lg:block">
              {panelText}
            </p>
            <div className={`${landing.brassRule} mx-auto mt-10 hidden w-40 lg:block`} aria-hidden="true" />
            <p className="mt-5 hidden text-base text-[#bdb7a6] lg:block">
              Primera Riverada los 4 Ases · {LOCAL_LOCATION.address}
            </p>
          </div>
          </div>
        </div>

        <main id="contenido-principal" className="flex justify-center px-5 pb-20 pt-10 sm:px-8 md:pt-14 lg:items-center lg:px-14 lg:py-16">
          <div className={`w-full min-w-0 ${wide ? 'max-w-[38rem]' : 'max-w-[30rem]'}`}>
            {steps && <AuthStepper labels={steps.labels} current={steps.current} />}
            <h1 className="text-balance font-display font-bold leading-[1.05] tracking-[-0.02em] text-text-premium [font-size:clamp(2.25rem,5vw,3.25rem)]">
              {title}
            </h1>
            {lead && <div className="mt-4 text-lg leading-relaxed text-[#d9d3bf]">{lead}</div>}
            <div className="mt-9">{children}</div>
          </div>
        </main>
      </div>
    </div>
  )
}
