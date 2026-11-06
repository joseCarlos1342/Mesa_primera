import Link from 'next/link'
import { useId, type ComponentType, type ReactNode, type SVGProps, type TextareaHTMLAttributes } from 'react'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { formatAmount } from '@/utils/format'
import styles from './player.module.css'

/* Mismos tonos que `fieldToneClass` de AuthForm (cliente); duplicado para usarlo en servidor. */
function fieldToneClass(tone: 'default' | 'error'): string {
  return tone === 'error'
    ? 'border-[#e74c3c] focus:border-[#e74c3c] focus:ring-[#e74c3c]/35'
    : 'border-[#8b6b2e]/70 hover:border-[#c5a059] focus:border-brand-gold focus:ring-brand-gold/35'
}

/* Piezas comunes de la app del jugador (DESIGN-player.md, sección "App del jugador"). */

export type IconType = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]'

/** Botones como enlace (mismo aspecto que `AuthButton`). */
export const playerButton = {
  primary: `inline-flex min-h-14 items-center justify-center gap-2.5 rounded-lg bg-brand-gold px-6 text-lg font-bold text-[#0a0a0a] shadow-[0_8px_22px_-8px_rgba(0,0,0,0.7)] transition-colors duration-200 hover:bg-brand-gold-light active:bg-brand-gold-dark ${focusRing}`,
  secondary: `inline-flex min-h-14 items-center justify-center gap-2.5 rounded-lg border border-[#8b6b2e]/80 px-5 text-lg font-semibold text-text-premium transition-colors duration-200 hover:border-brand-gold hover:text-brand-gold-light ${focusRing}`,
  danger: `inline-flex min-h-14 items-center justify-center gap-2.5 rounded-lg border border-[#e74c3c]/70 px-5 text-lg font-semibold text-[#f6d5d0] transition-colors duration-200 hover:bg-[#2a0f0c] hover:border-[#e74c3c] ${focusRing}`,
  dangerSolid: `inline-flex min-h-14 items-center justify-center gap-2.5 rounded-lg bg-[#e74c3c] px-6 text-lg font-bold text-[#0a0a0a] transition-colors duration-200 hover:bg-[#f08a7e] ${focusRing}`,
} as const

/** Enlace de texto dorado con subrayado de latón. */
export const playerTextLink = `inline-flex min-h-11 items-center gap-1.5 rounded text-base font-semibold text-brand-gold-light underline decoration-brand-gold/50 underline-offset-4 transition-colors hover:decoration-brand-gold ${focusRing}`

/** Texto secundario cálido (contraste AAA sobre negro y nogal). */
export const mutedText = 'text-[#bdb7a6]'

/* ── PageHeader ─────────────────────────────────────────────── */

interface PageHeaderProps {
  readonly title: ReactNode
  readonly lead?: ReactNode
  readonly back?: { readonly href: string; readonly label: string }
  readonly action?: ReactNode
}

export function PageHeader({ title, lead, back, action }: PageHeaderProps) {
  return (
    <header className="mb-8 lg:mb-10">
      {back && (
        <Link
          href={back.href}
          className={`-ml-1 mb-3 inline-flex min-h-11 items-center gap-2 rounded px-1 text-base font-semibold text-[#d9d3bf] transition-colors hover:text-brand-gold-light ${focusRing}`}
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          {back.label}
        </Link>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-balance font-display text-[2.125rem] font-bold leading-[1.05] tracking-[-0.02em] text-text-premium lg:text-[2.75rem]">
            {title}
          </h1>
          {lead && <p className="mt-2.5 max-w-[60ch] text-lg leading-relaxed text-[#d9d3bf]">{lead}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  )
}

/* ── Section ────────────────────────────────────────────────── */

interface SectionProps {
  readonly id: string
  readonly title: ReactNode
  readonly aside?: ReactNode
  readonly children: ReactNode
  readonly className?: string
}

/** Bloque con título Alegreya y filete de latón; sin caja alrededor. */
export function Section({ id, title, aside, children, className = '' }: SectionProps) {
  return (
    <section aria-labelledby={id} className={className}>
      <div className="flex items-baseline justify-between gap-4 border-b border-[#8b6b2e]/45 pb-2.5">
        <h2 id={id} className="font-display text-[1.5rem] font-bold leading-tight text-text-premium">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

/* ── ListRow ────────────────────────────────────────────────── */

interface ListRowProps {
  readonly icon?: IconType
  readonly iconTone?: 'gold' | 'credit' | 'debit' | 'muted' | 'danger'
  /** Contenido visual libre en lugar del icono (p. ej. avatar). */
  readonly leading?: ReactNode
  readonly title: ReactNode
  readonly meta?: ReactNode
  readonly trailing?: ReactNode
  readonly href?: string
  readonly onClick?: () => void
  /** Muestra la flecha de navegación al final (por defecto si hay `href`). */
  readonly chevron?: boolean
  readonly ariaLabel?: string
  readonly className?: string
}

const iconTones = {
  gold: 'text-brand-gold-light border-[#8b6b2e]/70 bg-[#0a2c20]',
  credit: 'text-[#5fd38d] border-[#2ecc71]/35 bg-[#0a2c20]',
  debit: 'text-[#d9d3bf] border-[#8b6b2e]/50 bg-[#1b0d08]',
  muted: 'text-[#bdb7a6] border-[#8b6b2e]/40 bg-[#120806]',
  danger: 'text-[#f08a7e] border-[#e74c3c]/45 bg-[#2a0f0c]',
} as const

/** Fila con filete: objetivo táctil de 72px, título, dato secundario y valor a la derecha. */
export function ListRow({
  icon: Icon,
  iconTone = 'gold',
  leading,
  title,
  meta,
  trailing,
  href,
  onClick,
  chevron,
  ariaLabel,
  className = '',
}: ListRowProps) {
  const showChevron = chevron ?? Boolean(href)
  const body = (
    <>
      {leading ??
        (Icon && (
          <span
            aria-hidden="true"
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${iconTones[iconTone]}`}
          >
            <Icon className="h-5 w-5" />
          </span>
        ))}
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-lg font-semibold leading-snug text-text-premium [overflow-wrap:anywhere]">{title}</span>
        {meta && <span className="mt-0.5 block truncate text-base text-[#bdb7a6]">{meta}</span>}
      </span>
      {trailing && <span className="flex shrink-0 flex-col items-end gap-1 text-right">{trailing}</span>}
      {showChevron && <ChevronRight className="h-5 w-5 shrink-0 text-[#c5a059]" aria-hidden="true" />}
    </>
  )
  const base = `flex min-h-[4.5rem] items-center gap-4 py-3 text-left ${className}`
  const hover = `-mx-2 w-[calc(100%+1rem)] rounded-lg px-2 transition-colors duration-200 hover:bg-[#1b0d08] active:bg-[#35180f] ${focusRing}`

  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel} className={`${base} ${hover}`}>
        {body}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={ariaLabel} className={`${base} ${hover}`}>
        {body}
      </button>
    )
  }
  return <div className={`${base} w-full`}>{body}</div>
}

/** Lista con filetes entre filas. */
export function RowList({ children, label }: { readonly children: ReactNode; readonly label?: string }) {
  return (
    <ul aria-label={label} className="divide-y divide-[#8b6b2e]/30">
      {children}
    </ul>
  )
}

/* ── Money ──────────────────────────────────────────────────── */

interface MoneyProps {
  readonly cents: number | null | undefined
  /** `credit` antepone + en verde; `debit` antepone − en crema. */
  readonly direction?: 'credit' | 'debit'
  readonly className?: string
}

export function Money({ cents, direction, className = '' }: MoneyProps) {
  const sign = direction === 'credit' ? '+' : direction === 'debit' ? '−' : ''
  const tone = direction === 'credit' ? 'text-[#5fd38d]' : 'text-text-premium'
  const value = `${sign}$${formatAmount(Math.abs(cents ?? 0))}`
  return (
    <span className={`font-mono tabular-nums tracking-[-0.01em] ${tone} ${className}`} data-testid="money">
      {value}
    </span>
  )
}

/* ── StatusTag ──────────────────────────────────────────────── */

export type PlayerStatus = 'completed' | 'pending' | 'failed'

export function normalizeStatus(status: string | null | undefined): PlayerStatus {
  if (status === 'completed' || status === 'approved') return 'completed'
  if (status === 'pending' || status === 'processing') return 'pending'
  return 'failed'
}

const statusLook: Record<PlayerStatus, { label: string; className: string }> = {
  completed: { label: 'Completado', className: 'border-[#2ecc71]/40 text-[#7fe0a6]' },
  pending: { label: 'En revisión', className: 'border-[#c5a059]/60 text-brand-gold-light' },
  failed: { label: 'Rechazado', className: 'border-[#e74c3c]/55 text-[#f08a7e]' },
}

export function StatusTag({ status, label }: { readonly status: string | null | undefined; readonly label?: string }) {
  const look = statusLook[normalizeStatus(status)]
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold leading-5 ${look.className}`}>
      {label ?? look.label}
    </span>
  )
}

/* ── EmptyState ─────────────────────────────────────────────── */

interface EmptyStateProps {
  readonly icon: IconType
  readonly title: ReactNode
  readonly text?: ReactNode
  readonly action?: ReactNode
}

export function EmptyState({ icon: Icon, title, text, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <span
        aria-hidden="true"
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#8b6b2e]/60 bg-[#120806] text-brand-gold-light"
      >
        <Icon className="h-6 w-6" />
      </span>
      <p className="font-display text-[1.375rem] font-bold text-text-premium">{title}</p>
      {text && <p className="mt-2 max-w-[36ch] text-base leading-relaxed text-[#bdb7a6]">{text}</p>}
      {action && <div className="mt-6 w-full max-w-xs">{action}</div>}
    </div>
  )
}

/* ── TextareaField ──────────────────────────────────────────── */

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  readonly label: ReactNode
  readonly labelAside?: ReactNode
  readonly hint?: ReactNode
  readonly error?: string | null
}

/** Área de texto con el mismo lenguaje que `AuthField`. */
export function TextareaField({ label, labelAside, hint, error, id, className = '', ...props }: TextareaFieldProps) {
  const autoId = useId()
  const fieldId = id ?? `textarea-${autoId}`
  const hintId = `${fieldId}-hint`
  const errorId = `${fieldId}-error`
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={fieldId} className="text-base font-semibold text-text-premium">
          {label}
        </label>
        {labelAside}
      </div>
      <textarea
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={`min-h-28 w-full resize-none rounded-lg border bg-[#120806] px-4 py-3.5 text-lg leading-relaxed text-text-premium caret-brand-gold outline-none transition-colors duration-200 placeholder:text-[#8a8478] focus:ring-2 ${fieldToneClass(error ? 'error' : 'default')} ${className}`}
        {...props}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-base font-semibold text-[#f08a7e]">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-base text-[#bdb7a6]">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

/* ── SegmentedTabs ──────────────────────────────────────────── */

interface SegmentedTabsProps<T extends string> {
  readonly label: string
  readonly value: T
  readonly onChange: (value: T) => void
  readonly options: ReadonlyArray<{ readonly value: T; readonly label: string; readonly badge?: number }>
  /** Prefijo de ids para enlazar pestaña y panel. */
  readonly idPrefix: string
}

/** Pestañas segmentadas de 48px (`role="tablist"`) con flechas para moverse. */
export function SegmentedTabs<T extends string>({ label, value, onChange, options, idPrefix }: SegmentedTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="mb-6 grid max-w-md gap-1 rounded-xl border border-[#8b6b2e]/60 bg-[#120806] p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option, index) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${option.value}`}
            aria-selected={active}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
              event.preventDefault()
              const step = event.key === 'ArrowRight' ? 1 : -1
              const next = options[(index + step + options.length) % options.length]
              onChange(next.value)
              document.getElementById(`${idPrefix}-tab-${next.value}`)?.focus()
            }}
            className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-2 text-lg font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light ${
              active ? 'bg-[#0a2c20] text-brand-gold-light shadow-[inset_0_0_0_1px_rgba(197,160,89,0.6)]' : 'text-[#d9d3bf] hover:text-text-premium'
            }`}
          >
            {option.label}
            {option.badge ? (
              <span className="min-w-6 rounded-full bg-brand-gold px-1.5 font-mono text-sm font-semibold leading-6 text-[#0a0a0a] tabular-nums">
                {option.badge}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

/* ── Skeleton ───────────────────────────────────────────────── */

export function Skeleton({ className = '' }: { readonly className?: string }) {
  return <span aria-hidden="true" className={`block ${styles.skeleton} ${className}`} />
}
