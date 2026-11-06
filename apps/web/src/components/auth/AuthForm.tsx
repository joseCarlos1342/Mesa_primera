'use client'

import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { AlertCircle, Check, Info, Loader2 } from 'lucide-react'
import landing from '@/components/landing/landing.module.css'

/* ── Clases compartidas (DESIGN-player.md, sección Autenticación) ───────── */

/** Enlace de texto dorado con subrayado de latón, igual que /security-policy. */
export const authTextLink =
  'inline-flex min-h-11 items-center gap-1.5 rounded text-base font-semibold text-brand-gold-light underline decoration-brand-gold/50 underline-offset-4 transition-colors hover:decoration-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light'

export type FieldTone = 'default' | 'error' | 'valid'

/** Borde y anillo de foco de campos y casillas según su estado. */
export function fieldToneClass(tone: FieldTone): string {
  if (tone === 'error') return 'border-[#e74c3c] focus:border-[#e74c3c] focus:ring-[#e74c3c]/35'
  if (tone === 'valid') return 'border-[#2ecc71]/70 focus:border-[#2ecc71] focus:ring-[#2ecc71]/30'
  return 'border-[#8b6b2e]/70 hover:border-[#c5a059] focus:border-brand-gold focus:ring-brand-gold/35'
}

export function toneOf(error?: string | null, valid?: boolean): FieldTone {
  if (error) return 'error'
  return valid ? 'valid' : 'default'
}

const fieldBase =
  'w-full rounded-lg border bg-[#120806] text-text-premium caret-brand-gold placeholder:text-[#8a8478] outline-none transition-colors duration-200 focus:ring-2 disabled:opacity-60'

/* ── AuthField ─────────────────────────────────────────────────────────── */

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  readonly label: ReactNode
  /** Contenido a la derecha del label (p. ej. contador de caracteres). */
  readonly labelAside?: ReactNode
  readonly hint?: ReactNode
  readonly error?: string | null
  readonly valid?: boolean
  /** Prefijo fijo dentro del campo, como `+57`. */
  readonly prefix?: string
  /** Valores numéricos (celular) en Geist Mono. */
  readonly mono?: boolean
}

export function AuthField({
  label,
  labelAside,
  hint,
  error,
  valid = false,
  prefix,
  mono = false,
  id,
  className = '',
  ...inputProps
}: AuthFieldProps) {
  const autoId = useId()
  const inputId = id ?? `field-${autoId}`
  const hintId = `${inputId}-hint`
  const errorId = `${inputId}-error`
  const tone = toneOf(error, valid)
  const describedBy = error ? errorId : hint ? hintId : undefined

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={inputId} className="text-base font-semibold text-text-premium">
          {label}
        </label>
        {labelAside}
      </div>
      <div className="relative flex items-center">
        {prefix && (
          <span aria-hidden="true" className="pointer-events-none absolute left-4 font-mono text-lg text-[#c5a059]">
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${fieldBase} ${fieldToneClass(tone)} h-14 text-lg ${prefix ? (prefix.length <= 1 ? 'pl-10' : 'pl-16') : 'pl-4'} pr-12 ${
            mono ? 'font-mono tabular-nums tracking-[0.04em]' : ''
          } ${className}`}
          {...inputProps}
        />
        {tone === 'valid' && (
          <Check data-testid="field-valid" className="pointer-events-none absolute right-4 h-5 w-5 text-[#2ecc71]" aria-hidden="true" />
        )}
      </div>
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

/* ── AuthAlert ─────────────────────────────────────────────────────────── */

interface AuthAlertProps {
  readonly tone?: 'error' | 'notice'
  readonly children: ReactNode
  readonly className?: string
}

/** Error del servidor (`role="alert"`) o aviso informativo (`role="status"`). */
export function AuthAlert({ tone = 'error', children, className = '' }: AuthAlertProps) {
  const isError = tone === 'error'
  const Icon = isError ? AlertCircle : Info
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-lg border px-4 py-3.5 text-base leading-relaxed ${
        isError ? 'border-[#e74c3c]/70 bg-[#2a0f0c] text-[#f6d5d0]' : 'border-[#8b6b2e]/70 bg-[#0a2c20] text-text-premium'
      } ${className}`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${isError ? 'text-[#e74c3c]' : 'text-brand-gold-light'}`} aria-hidden="true" />
      <div className="min-w-0 [overflow-wrap:anywhere]">{children}</div>
    </div>
  )
}

/* ── AuthButton ────────────────────────────────────────────────────────── */

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: 'primary' | 'secondary'
  /** Muestra el indicador de carga y deshabilita el botón. */
  readonly pending?: boolean
  readonly icon?: ReactNode
}

export function AuthButton({
  variant = 'primary',
  pending = false,
  icon,
  disabled,
  className = '',
  children,
  type = 'button',
  ...props
}: AuthButtonProps) {
  const look =
    variant === 'primary'
      ? 'bg-brand-gold font-bold text-[#0a0a0a] shadow-[0_8px_22px_-8px_rgba(0,0,0,0.7)] hover:bg-brand-gold-light active:bg-brand-gold-dark focus-visible:ring-offset-[#0a0a0a]'
      : 'border border-[#8b6b2e]/80 bg-transparent font-semibold text-text-premium hover:border-brand-gold hover:text-brand-gold-light'
  return (
    <button
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={`inline-flex min-h-14 w-full items-center justify-center gap-2.5 rounded-lg px-6 text-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${look} ${className}`}
      {...props}
    >
      {pending ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : icon}
      {children}
    </button>
  )
}

/* ── AuthDivider ───────────────────────────────────────────────────────── */

/** Separador "o" entre filetes de latón. */
export function AuthDivider({ label = 'o' }: { readonly label?: string }) {
  return (
    <div className="my-8 flex items-center gap-4">
      <span className={`${landing.brassRule} flex-1`} aria-hidden="true" />
      <span className="text-base text-[#bdb7a6]">{label}</span>
      <span className={`${landing.brassRule} flex-1`} aria-hidden="true" />
    </div>
  )
}

/** Pie del formulario con los enlaces de cambio de flujo. */
export function AuthFooter({ children }: { readonly children: ReactNode }) {
  return (
    <div className="mt-10 border-t border-[#8b6b2e]/45 pt-6 text-center text-base text-[#d9d3bf] sm:text-left">
      <div className="space-y-1">{children}</div>
    </div>
  )
}
